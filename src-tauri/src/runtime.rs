//! The single boundary for synchronous application/storage work on desktop.

use lumina_app::{Application, ApplicationFailure, AvailabilityData, StartupState};
use lumina_persistence::{SqliteStorage, StorageError};
use std::sync::{Arc, Mutex};

pub(crate) type DesktopApplication = Application<SqliteStorage>;

#[derive(Debug, thiserror::Error)]
pub(crate) enum StartupError {
  #[error("could not open managed storage")]
  OpenStorage(#[from] StorageError),
  #[error("application startup failed")]
  Application(#[from] lumina_app::StartupError<StorageError>),
}

#[derive(Debug, thiserror::Error)]
pub(crate) enum RuntimeError {
  #[error("application storage is still starting")]
  Starting,
  #[error("application storage startup failed")]
  Startup(#[source] Arc<StartupError>),
  #[error("application state lock was poisoned")]
  Poisoned,
  #[error("blocking application task failed")]
  Worker(#[source] tauri::Error),
  #[error("system clock is before the Unix epoch")]
  Clock(#[from] std::time::SystemTimeError),
  #[error("application operation failed")]
  Application(#[from] lumina_app::OperationError<StorageError>),
}

impl RuntimeError {
  pub(crate) fn public_failure(&self) -> ApplicationFailure {
    match self {
      Self::Starting => ApplicationFailure::Unavailable {
        message: "Application storage is starting. Try again shortly.".into(),
        data: AvailabilityData {
          state: StartupState::Starting,
        },
      },
      Self::Startup(_) => ApplicationFailure::Unavailable {
        message: "Application storage could not start. Check the terminal diagnostics.".into(),
        data: AvailabilityData {
          state: StartupState::Failed,
        },
      },
      Self::Application(error) => error.public_failure(),
      Self::Poisoned | Self::Worker(_) | Self::Clock(_) => ApplicationFailure::Internal {
        message: "The application operation failed. Check the terminal diagnostics.".into(),
      },
    }
  }
}

enum State {
  Starting,
  Ready(DesktopApplication),
  Failed(Arc<StartupError>),
}

#[derive(Clone)]
pub(crate) struct DesktopRuntime {
  state: Arc<Mutex<State>>,
}

impl DesktopRuntime {
  pub(crate) fn new() -> Self {
    Self {
      state: Arc::new(Mutex::new(State::Starting)),
    }
  }

  pub(crate) async fn initialize(
    &self,
    build: impl FnOnce() -> Result<DesktopApplication, StartupError> + Send + 'static,
  ) -> Result<(), RuntimeError> {
    self
      .blocking(move |state| match build() {
        Ok(application) => {
          *state = State::Ready(application);
          Ok(())
        }
        Err(error) => {
          let error = Arc::new(error);
          *state = State::Failed(Arc::clone(&error));
          Err(RuntimeError::Startup(error))
        }
      })
      .await
  }

  pub(crate) async fn call<T: Send + 'static>(
    &self,
    operation: impl FnOnce(&mut DesktopApplication) -> Result<T, RuntimeError> + Send + 'static,
  ) -> Result<T, RuntimeError> {
    self
      .blocking(move |state| match state {
        State::Starting => Err(RuntimeError::Starting),
        State::Ready(application) => operation(application),
        State::Failed(error) => Err(RuntimeError::Startup(Arc::clone(error))),
      })
      .await
  }

  async fn blocking<T: Send + 'static>(
    &self,
    operation: impl FnOnce(&mut State) -> Result<T, RuntimeError> + Send + 'static,
  ) -> Result<T, RuntimeError> {
    let state = Arc::clone(&self.state);
    tauri::async_runtime::spawn_blocking(move || {
      let mut state = state.lock().map_err(|_| RuntimeError::Poisoned)?;
      operation(&mut state)
    })
    .await
    .map_err(RuntimeError::Worker)?
  }
}

#[cfg(test)]
mod tests {
  use super::{DesktopRuntime, RuntimeError};
  use lumina_app::{
    Application, ApplicationFailure, ReferenceRequest, StartupState, VerseCoordinate,
  };
  use lumina_persistence::SqliteStorage;

  #[test]
  fn native_runtime_exposes_startup_reference_and_code_specific_failures(
  ) -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("lumina.sqlite3");
    tauri::async_runtime::block_on(async move {
      let runtime = DesktopRuntime::new();
      let starting = runtime.call(|application| Ok(application.snapshot().clone())).await;
      assert!(matches!(starting, Err(RuntimeError::Starting)));
      runtime.initialize(move || Ok(Application::start(SqliteStorage::open(&path)?)?)).await?;
      let before = runtime.call(|application| Ok(application.snapshot().clone())).await?;
      let workspace_id = before.active_workspace_id.clone();
      let reference = runtime
        .call(move |application| {
          application
            .resolve_reference(ReferenceRequest {
              workspace_id,
              coordinate: VerseCoordinate {
                book_number: 43,
                chapter: 3,
                verse: 16,
              },
            })
            .map_err(RuntimeError::Application)
        })
        .await?;
      assert_eq!(reference.verse.book_name, "John");
      assert_eq!(reference.verse.translation_id, before.translations[0].translation_id);
      let workspace_id = before.active_workspace_id.clone();
      let failure = runtime
        .call(move |application| {
          application
            .resolve_reference(ReferenceRequest {
              workspace_id,
              coordinate: VerseCoordinate {
                book_number: 43,
                chapter: 0,
                verse: 16,
              },
            })
            .map_err(RuntimeError::Application)
        })
        .await
        .err()
        .ok_or("malformed coordinate was accepted")?;
      assert!(matches!(failure.public_failure(), ApplicationFailure::InvalidReference { .. }));
      assert_eq!(runtime.call(|application| Ok(application.snapshot().clone())).await?, before);
      Ok(())
    })
  }

  #[test]
  fn failed_native_startup_never_exposes_a_partial_application(
  ) -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("lumina.sqlite3");
    std::fs::write(&path, b"not a SQLite database")?;
    tauri::async_runtime::block_on(async move {
      let runtime = DesktopRuntime::new();
      assert!(runtime
        .initialize(move || Ok(Application::start(SqliteStorage::open(&path)?)?))
        .await
        .is_err());
      let failure = runtime
        .call(|application| Ok(application.snapshot().clone()))
        .await
        .err()
        .ok_or("failed startup exposed application state")?;
      assert!(
        matches!(failure.public_failure(), ApplicationFailure::Unavailable { data, .. } if data.state == StartupState::Failed)
      );
      assert!(std::error::Error::source(&failure).is_some());
      Ok(())
    })
  }
}
