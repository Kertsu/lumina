//! Bounded local image validation and app-owned immutable asset bytes.

use crate::{SqliteStorage, StorageError};
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader, Limits};
use lumina_app::{
  ApplicationFailure, AssetData, AssetStorage, ManagedAsset, ManagedAssetData, OperationError,
};
use rusqlite::{params, OptionalExtension};
use std::{
  fs::File,
  io::{Cursor, Read},
  path::PathBuf,
};

const MAX_SOURCE: u64 = 20 * 1024 * 1024;
const MAX_DECODED: u64 = 128 * 1024 * 1024;

fn rejected(reason: &str) -> ApplicationFailure {
  ApplicationFailure::AssetRejected {
    message: format!("Background image rejected: {reason}"),
    data: AssetData {
      asset_id: None,
      reason: reason.into(),
    },
  }
}

impl AssetStorage for SqliteStorage {
  fn import_background_asset(
    &mut self,
    path: &str,
  ) -> Result<ManagedAsset, OperationError<StorageError>> {
    let file = File::open(path).map_err(|source| {
      OperationError::Storage(StorageError::AssetIo {
        path: PathBuf::from(path),
        source,
      })
    })?;
    let mut bytes = Vec::new();
    file.take(MAX_SOURCE + 1).read_to_end(&mut bytes).map_err(|source| {
      OperationError::Storage(StorageError::AssetIo {
        path: PathBuf::from(path),
        source,
      })
    })?;
    if u64::try_from(bytes.len()).unwrap_or(u64::MAX) > MAX_SOURCE {
      return Err(rejected("source exceeds 20 MiB").into());
    }
    let format =
      image::guess_format(&bytes).map_err(|_| rejected("unsupported or corrupt image"))?;
    let mime_type = match format {
      ImageFormat::Png => "image/png",
      ImageFormat::Jpeg => "image/jpeg",
      ImageFormat::Bmp => "image/bmp",
      _ => return Err(rejected("use a static JPEG, PNG or BMP image").into()),
    };
    if format == ImageFormat::Png && png_is_animated(&bytes) {
      return Err(rejected("animated PNG is unsupported").into());
    }
    let mut limits = Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(MAX_DECODED);
    let mut reader = ImageReader::with_format(Cursor::new(&bytes), format);
    reader.limits(limits);
    let decoder = reader
      .into_decoder()
      .map_err(|_| rejected("corrupt image or decoder resource ceiling exceeded"))?;
    let (width, height) = decoder.dimensions();
    if width == 0
      || height == 0
      || width > 8192
      || height > 8192
      || u64::from(width) * u64::from(height) > 32_000_000
      || decoder.total_bytes() > MAX_DECODED
    {
      return Err(rejected("image exceeds dimension, pixel or decoded-storage ceiling").into());
    }
    // Header limits are checked before allocating full decoded pixel storage.
    let _decoded =
      DynamicImage::from_decoder(decoder).map_err(|_| rejected("corrupt pixel data"))?;
    let asset_id = self
      .connection
      .query_row(
        "INSERT INTO managed_assets(mime_type,width,height,bytes) VALUES(?1,?2,?3,?4) RETURNING id",
        params![mime_type, width, height, bytes],
        |row| row.get(0),
      )
      .map_err(|source| OperationError::Storage(StorageError::WorkspaceSql(source)))?;
    Ok(ManagedAsset {
      asset_id,
      mime_type: mime_type.into(),
      width,
      height,
    })
  }

  fn managed_asset(&self, asset_id: &str) -> Result<Option<ManagedAssetData>, StorageError> {
    self
      .connection
      .query_row(
        "SELECT mime_type,width,height,bytes FROM managed_assets WHERE id=?1",
        [asset_id],
        |row| {
          Ok(ManagedAssetData {
            asset: ManagedAsset {
              asset_id: asset_id.into(),
              mime_type: row.get(0)?,
              width: row.get(1)?,
              height: row.get(2)?,
            },
            bytes: row.get(3)?,
          })
        },
      )
      .optional()
      .map_err(StorageError::WorkspaceSql)
  }
}

fn png_is_animated(bytes: &[u8]) -> bool {
  let mut position = 8_usize;
  while let Some(header) = bytes.get(position..position.saturating_add(8)) {
    if &header[4..8] == b"acTL" {
      return true;
    }
    let length = u32::from_be_bytes([header[0], header[1], header[2], header[3]]);
    let Ok(length) = usize::try_from(length) else {
      return false;
    };
    let Some(next) = position.checked_add(length).and_then(|value| value.checked_add(12)) else {
      return false;
    };
    position = next;
  }
  false
}
