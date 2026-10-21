//! Application ownership and startup, independent of the desktop and storage adapters.

mod failure;

pub use failure::{ApplicationFailure, AvailabilityData, InvocationData, StartupState};

use std::error::Error;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

/// Minimal scaffold response, computed by the initialized application.
#[derive(Debug, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Greeting {
  pub message: String,
  /// Decimal string avoids truncating Rust's `u128` milliseconds in JavaScript.
  pub epoch_ms: String,
}

/// Storage initialization needed before the application accepts work.
pub trait Storage {
  type Error: Error + Send + Sync + 'static;

  /// Prepare the managed storage for application use.
  ///
  /// # Errors
  /// Returns the adapter's typed error if initialization fails.
  fn initialize(&mut self) -> Result<(), Self::Error>;
}

/// Owns initialized application storage.
pub struct Application<S> {
  // Retain storage (and its connection) for the application's lifetime.
  _storage: S,
}

/// Application startup failure retaining the storage cause.
#[derive(Debug, thiserror::Error)]
pub enum StartupError<E: Error + 'static> {
  #[error("could not initialize application storage")]
  Storage(#[source] E),
}

impl<S: Storage> Application<S> {
  /// Greet through the application using the host's clock.
  ///
  /// # Errors
  /// Retains the clock error if the host time predates the Unix epoch.
  pub fn greet(&self, now: SystemTime) -> Result<Greeting, SystemTimeError> {
    let epoch_ms = now.duration_since(UNIX_EPOCH)?.as_millis().to_string();
    Ok(Greeting {
      message: "Hello world from Rust!".into(),
      epoch_ms,
    })
  }

  /// Initialize storage before publishing the application as ready.
  ///
  /// # Errors
  /// Returns a typed startup error retaining the storage cause.
  pub fn start(mut storage: S) -> Result<Self, StartupError<S::Error>> {
    storage.initialize().map_err(StartupError::Storage)?;
    Ok(Self {
      _storage: storage,
    })
  }
}

#[cfg(test)]
mod tests {
  use super::{Application, StartupError, Storage};
  use std::{cell::Cell, convert::Infallible};

  struct TestStorage<'a>(&'a Cell<bool>);

  impl Storage for TestStorage<'_> {
    type Error = Infallible;

    fn initialize(&mut self) -> Result<(), Self::Error> {
      self.0.set(true);
      Ok(())
    }
  }

  #[test]
  fn startup_initializes_storage_before_accepting_work() -> Result<(), Box<dyn std::error::Error>> {
    let initialized = Cell::new(false);
    let _application = Application::start(TestStorage(&initialized))?;
    assert!(initialized.get());
    Ok(())
  }

  #[test]
  fn initialized_application_returns_a_greeting_at_the_supplied_time(
  ) -> Result<(), Box<dyn std::error::Error>> {
    let initialized = Cell::new(false);
    let application = Application::start(TestStorage(&initialized))?;
    let now = std::time::UNIX_EPOCH + std::time::Duration::from_millis(1234);
    let greeting = application.greet(now)?;
    assert_eq!(greeting.message, "Hello world from Rust!");
    assert_eq!(greeting.epoch_ms, "1234");
    assert!(application.greet(std::time::UNIX_EPOCH - std::time::Duration::from_secs(1)).is_err());
    Ok(())
  }

  struct UnavailableStorage;

  impl Storage for UnavailableStorage {
    type Error = std::io::Error;

    fn initialize(&mut self) -> Result<(), Self::Error> {
      Err(std::io::Error::from(std::io::ErrorKind::PermissionDenied))
    }
  }

  #[test]
  fn storage_failure_prevents_startup_and_preserves_its_cause() {
    let result = Application::start(UnavailableStorage);
    assert!(matches!(result,
      Err(StartupError::Storage(ref source))
        if source.kind() == std::io::ErrorKind::PermissionDenied
    ));
    if let Err(error) = result {
      assert!(std::error::Error::source(&error).is_some());
    }
  }
}
