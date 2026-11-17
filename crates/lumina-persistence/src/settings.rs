//! Durable global preferences, separate from workspace output appearance.

use crate::{SqliteStorage, StorageError};
use lumina_app::{ApplicationTheme, SettingsStorage};

impl SettingsStorage for SqliteStorage {
  fn save_application_theme(&mut self, theme: ApplicationTheme) -> Result<(), StorageError> {
    let value = match theme {
      ApplicationTheme::System => "system",
      ApplicationTheme::Light => "light",
      ApplicationTheme::Dark => "dark",
    };
    self
      .connection
      .execute("UPDATE application_settings SET application_theme=?1 WHERE singleton=1", [value])
      .map_err(StorageError::SettingsSql)?;
    Ok(())
  }

  fn save_auto_open_search_summary(&mut self, enabled: bool) -> Result<(), StorageError> {
    self
      .connection
      .execute(
        "UPDATE application_settings SET auto_open_search_summary=?1 WHERE singleton=1",
        [enabled],
      )
      .map_err(StorageError::SettingsSql)?;
    Ok(())
  }
}
