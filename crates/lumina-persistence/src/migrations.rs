use crate::StorageError;
use rusqlite::Transaction;

pub(crate) const CURRENT_VERSION: u32 = 6;
const MIGRATIONS: &[(u32, &str)] = &[
  (1, include_str!("../migrations/V20261021161209_foundation.sql")),
  (2, include_str!("../migrations/V20261024060038_library_and_workspaces.sql")),
  (3, include_str!("../migrations/V20261026060000_catalog.sql")),
  (4, include_str!("../migrations/V20261026060000_workspace_history.sql")),
  (5, include_str!("../migrations/V20261026122610_preserve_literal_whitespace.sql")),
  (6, include_str!("../migrations/V20261028135826_application_theme.sql")),
];

pub(crate) fn apply(transaction: &Transaction<'_>) -> Result<(), StorageError> {
  let version: u32 = transaction
    .pragma_query_value(None, "user_version", |row| row.get(0))
    .map_err(StorageError::Migration)?;
  if version > CURRENT_VERSION {
    return Err(StorageError::NewerSchema {
      found: version,
      supported: CURRENT_VERSION,
    });
  }
  for &(next_version, sql) in MIGRATIONS {
    if next_version > version {
      transaction.execute_batch(sql).map_err(StorageError::Migration)?;
      transaction
        .pragma_update(None, "user_version", next_version)
        .map_err(StorageError::Migration)?;
    }
  }
  Ok(())
}
