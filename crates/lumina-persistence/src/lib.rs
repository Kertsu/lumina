//! Managed `SQLite` connections and migrations.

mod catalog;
mod imports;
mod library;
pub use imports::stage_import;
mod migrations;
mod references;
mod search;

use lumina_app::{EditionId, ResolvedVerse, Storage, StoredState, TranslationId, VerseCoordinate};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use std::{
  fs,
  path::{Path, PathBuf},
  time::Duration,
};

/// Owns one connection; the desktop serializes access on blocking tasks.
pub struct SqliteStorage {
  connection: Connection,
  staged_imports: std::collections::HashMap<String, lumina_app::StagedImport>,
}

/// Internal adapter failures retain paths and original causes for diagnostics.
#[derive(Debug, thiserror::Error)]
pub enum StorageError {
  #[error("could not create database directory {path}")]
  CreateDirectory {
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },
  #[error("could not open database {path}")]
  Open {
    path: PathBuf,
    #[source]
    source: rusqlite::Error,
  },
  #[error("could not configure SQLite")]
  Configure(#[source] rusqlite::Error),
  #[error("could not apply database migrations")]
  Migration(#[source] rusqlite::Error),
  #[error("database schema {found} is newer than supported schema {supported}")]
  NewerSchema {
    found: u32,
    supported: u32,
  },
  #[error("bundled SQLite FTS5 is unavailable")]
  Fts5(#[source] rusqlite::Error),
  #[error("could not read database schema version")]
  SchemaVersion(#[source] rusqlite::Error),
  #[error("could not read bundled WEB provenance")]
  SeedProvenance(#[source] serde_json::Error),
  #[error("could not install bundled WEB")]
  Seed(#[source] rusqlite::Error),
  #[error("could not restore workspace/library state")]
  StartupState(#[source] rusqlite::Error),
  #[error("managed data contains invalid relationships")]
  InvalidState,
  #[error("could not commit application bootstrap")]
  Bootstrap(#[source] rusqlite::Error),
  #[error("could not access the Bible catalog")]
  Catalog(#[source] rusqlite::Error),
  #[error("could not stage a Bible import")]
  ImportIo(#[source] std::io::Error),
  #[error("could not resolve native verse reference")]
  Reference(#[source] rusqlite::Error),
}

impl SqliteStorage {
  /// Open the managed database, creating its directory if necessary.
  /// Migrations run through [`Storage::initialize`] during application startup.
  ///
  /// # Errors
  /// Returns a typed filesystem, connection, or configuration failure.
  pub fn open(path: &Path) -> Result<Self, StorageError> {
    if let Some(parent) = path.parent().filter(|parent| !parent.as_os_str().is_empty()) {
      fs::create_dir_all(parent).map_err(|source| StorageError::CreateDirectory {
        path: parent.to_path_buf(),
        source,
      })?;
    }
    let connection = Connection::open(path).map_err(|source| StorageError::Open {
      path: path.to_path_buf(),
      source,
    })?;
    connection.busy_timeout(Duration::from_secs(5)).map_err(StorageError::Configure)?;
    connection.pragma_update(None, "foreign_keys", true).map_err(StorageError::Configure)?;
    Ok(Self {
      connection,
      staged_imports: std::collections::HashMap::new(),
    })
  }

  /// Read the current managed schema version.
  ///
  /// # Errors
  /// Returns the underlying query/conversion failure.
  pub fn schema_version(&self) -> Result<u32, StorageError> {
    self
      .connection
      .pragma_query_value(None, "user_version", |row| row.get(0))
      .map_err(StorageError::SchemaVersion)
  }
}

impl Storage for SqliteStorage {
  type Error = StorageError;

  fn initialize(&mut self) -> Result<StoredState, Self::Error> {
    // Exercise FTS5 on this bundled connection without adding product tables.
    self
      .connection
      .execute_batch(
        "CREATE VIRTUAL TABLE temp.lumina_fts5_probe USING fts5(content);
       DROP TABLE temp.lumina_fts5_probe;",
      )
      .map_err(StorageError::Fts5)?;
    let transaction = self
      .connection
      .transaction_with_behavior(TransactionBehavior::Immediate)
      .map_err(StorageError::Bootstrap)?;
    migrations::apply(&transaction)?;
    let state = library::bootstrap(&transaction)?;
    search::index_missing(&transaction).map_err(StorageError::Catalog)?;
    transaction.commit().map_err(StorageError::Bootstrap)?;
    Ok(state)
  }

  fn resolve_reference(
    &self,
    translation_id: &TranslationId,
    coordinate: VerseCoordinate,
  ) -> Result<Option<ResolvedVerse>, Self::Error> {
    self
      .connection
      .query_row(
        "SELECT t.id, t.edition_id, t.title, b.name, v.text FROM verses v
       JOIN books b ON b.id = v.book_id AND b.translation_id = v.translation_id
       JOIN translations t ON t.id = v.translation_id
       WHERE t.id = ?1 AND b.book_number = ?2 AND v.chapter = ?3 AND v.verse = ?4",
        params![translation_id.0, coordinate.book_number, coordinate.chapter, coordinate.verse],
        |row| {
          Ok(ResolvedVerse {
            translation_id: TranslationId(row.get(0)?),
            edition_id: EditionId(row.get(1)?),
            translation_title: row.get(2)?,
            book_name: row.get(3)?,
            coordinate,
            text: row.get(4)?,
          })
        },
      )
      .optional()
      .map_err(StorageError::Reference)
  }
}
