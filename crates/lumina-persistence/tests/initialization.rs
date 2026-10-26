use lumina_app::Storage;
use lumina_persistence::{SqliteStorage, StorageError};

#[test]
fn initializes_a_managed_database_with_bundled_fts5() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("application").join("lumina.sqlite3");
  let mut storage = SqliteStorage::open(&path)?;
  storage.initialize()?;

  assert!(path.is_file());
  assert_eq!(storage.schema_version()?, 5);
  Ok(())
}

#[test]
fn reopens_and_initializes_the_same_database_again() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  {
    let mut storage = SqliteStorage::open(&path)?;
    assert_eq!(storage.schema_version()?, 0);
    storage.initialize()?;
    storage.initialize()?;
  }
  let mut reopened = SqliteStorage::open(&path)?;
  assert_eq!(reopened.schema_version()?, 5);
  reopened.initialize()?;
  assert_eq!(reopened.schema_version()?, 5);
  Ok(())
}

#[test]
fn rejects_a_newer_schema_without_downgrading_it() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  {
    // A fixture produced by a future release, prepared before opening the adapter.
    let fixture = rusqlite::Connection::open(&path)?;
    fixture.pragma_update(None, "user_version", 99)?;
  }
  let mut storage = SqliteStorage::open(&path)?;
  assert!(matches!(
    storage.initialize(),
    Err(StorageError::NewerSchema {
      found: 99,
      supported: 5,
    })
  ));
  assert_eq!(storage.schema_version()?, 99);
  Ok(())
}

#[test]
fn invalid_database_retains_the_storage_cause() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  std::fs::write(&path, b"not a SQLite database")?;
  let result = SqliteStorage::open(&path).and_then(|mut storage| storage.initialize());
  assert!(result.is_err());
  if let Err(error) = result {
    assert!(std::error::Error::source(&error).is_some());
  }
  Ok(())
}

#[test]
fn directory_failure_retains_the_path_and_cause() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let parent = directory.path().join("file");
  std::fs::write(&parent, b"blocks the database directory")?;
  let result = SqliteStorage::open(&parent.join("lumina.sqlite3"));
  assert!(matches!(result,
    Err(StorageError::CreateDirectory { ref path, .. }) if path == &parent
  ));
  if let Err(error) = result {
    assert!(std::error::Error::source(&error).is_some());
  }
  Ok(())
}
