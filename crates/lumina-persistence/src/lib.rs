//! Managed `SQLite` connections and migrations.

mod migrations;

use lumina_app::Storage;
use rusqlite::Connection;
use std::{
  fs,
  path::{Path, PathBuf},
  time::Duration,
};

/// Owns one connection; the desktop serializes access on blocking tasks.
pub struct SqliteStorage {
  connection: Connection,
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

  fn initialize(&mut self) -> Result<(), Self::Error> {
    // Exercise FTS5 on this bundled connection without adding product tables.
    self
      .connection
      .execute_batch(
        "CREATE VIRTUAL TABLE temp.lumina_fts5_probe USING fts5(content);
       DROP TABLE temp.lumina_fts5_probe;",
      )
      .map_err(StorageError::Fts5)?;
    migrations::apply(&mut self.connection)
  }
}
