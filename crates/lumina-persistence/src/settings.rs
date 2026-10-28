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
}
