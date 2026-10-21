use crate::StorageError;
use rusqlite::{Connection, TransactionBehavior};

const CURRENT_VERSION: u32 = 1;
const MIGRATIONS: &[(u32, &str)] =
  &[(1, include_str!("../migrations/V20261021161209_foundation.sql"))];

pub(crate) fn apply(connection: &mut Connection) -> Result<(), StorageError> {
  let transaction = connection
    .transaction_with_behavior(TransactionBehavior::Immediate)
    .map_err(StorageError::Migration)?;
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
  transaction.commit().map_err(StorageError::Migration)
}
