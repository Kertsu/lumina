//! Confirmed application preferences shared by every window.

use crate::{Application, OperationError, Storage};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ApplicationTheme {
  #[default]
  System,
  Light,
  Dark,
}

pub trait SettingsStorage: Storage {
  /// # Errors
  /// Retains the storage cause and leaves the accepted preference unchanged.
  fn save_application_theme(&mut self, theme: ApplicationTheme) -> Result<(), Self::Error>;
}

impl<S: SettingsStorage> Application<S> {
  /// # Errors
  /// Publishes a preference only after its durable write succeeds.
  pub fn set_application_theme(
    &mut self,
    theme: ApplicationTheme,
  ) -> Result<(), OperationError<S::Error>> {
    self.storage.save_application_theme(theme).map_err(OperationError::Storage)?;
    self.state.application_theme = theme;
    Ok(())
  }
}
