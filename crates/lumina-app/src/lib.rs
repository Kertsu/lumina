//! Application ownership and startup, independent of the desktop and storage adapters.

use std::error::Error;

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
