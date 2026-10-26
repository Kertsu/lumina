//! Application ownership and startup, independent of the desktop and storage adapters.

mod failure;
mod library;
mod workflow;

pub use failure::*;
pub use library::*;
pub use lumina_core::{CoordinateField, EditionId, TranslationId, VerseCoordinate, WorkspaceId};
pub use workflow::*;

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
  fn initialize(&mut self) -> Result<StoredState, Self::Error>;

  /// Resolve original text in the selected installed translation edition.
  ///
  /// # Errors
  /// Retains storage failures; absent native coordinates return `None`.
  fn resolve_reference(
    &self,
    translation_id: &TranslationId,
    coordinate: VerseCoordinate,
  ) -> Result<Option<ResolvedVerse>, Self::Error>;
}

/// Owns initialized application storage.
pub struct Application<S> {
  // Retain storage (and its connection) for the application's lifetime.
  storage: S,
  state: ApplicationSnapshot,
  session_id: String,
  sequence: u32,
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
    let stored = storage.initialize().map_err(StartupError::Storage)?;
    Ok(Self {
      storage,
      session_id: workflow::session_identity(),
      sequence: 0,
      state: ApplicationSnapshot {
        translations: stored.translations,
        active_workspace_id: stored.active_workspace_id,
        workspaces: stored
          .workspaces
          .into_iter()
          .map(|workspace| Workspace {
            workspace_id: workspace.workspace_id,
            settings: workspace.settings,
            current_verse: None,
            book_information_mode: false,
            audience: AudienceState::Closed,
            owner: None,
            output_revision: 0,
            output_action_id: None,
            preview: None,
            history: Vec::new(),
            appearance: Appearance::default(),
            information: None,
            fullscreen: false,
            always_on_top: false,
          })
          .collect(),
      },
    })
  }

  pub fn snapshot(&self) -> &ApplicationSnapshot {
    &self.state
  }

  /// Resolve a canonical native coordinate privately in this workspace's selection.
  /// This does not select current content, create history, or open an audience.
  ///
  /// # Errors
  /// Returns a code-specific rejection or retains the storage diagnostic cause.
  pub fn resolve_reference(
    &self,
    request: ReferenceRequest,
  ) -> Result<ReferenceResult, OperationError<S::Error>> {
    let workspace = self
      .state
      .workspaces
      .iter()
      .find(|workspace| workspace.workspace_id == request.workspace_id)
      .ok_or_else(|| ApplicationFailure::WorkspaceNotFound {
        message: "The operator workspace is unavailable.".into(),
        data: WorkspaceData {
          workspace_id: request.workspace_id.clone(),
        },
      })?;
    request.coordinate.validate().map_err(|field| ApplicationFailure::InvalidReference {
      message: "Use book number 1–66 and positive integer chapter and verse coordinates.".into(),
      data: InvalidReferenceData {
        coordinate: request.coordinate,
        field,
      },
    })?;
    let translation_id = &workspace.settings.selected_translation_id;
    if !self
      .state
      .translations
      .iter()
      .any(|translation| &translation.translation_id == translation_id)
    {
      return Err(
        ApplicationFailure::TranslationUnavailable {
          message: "The selected translation is unavailable.".into(),
          data: TranslationData {
            translation_id: translation_id.clone(),
          },
        }
        .into(),
      );
    }
    let verse = self
      .storage
      .resolve_reference(translation_id, request.coordinate)
      .map_err(OperationError::Storage)?
      .ok_or_else(|| ApplicationFailure::ReferenceUnavailable {
        message: "The selected edition has no verse at this native coordinate.".into(),
        data: ReferenceData {
          translation_id: translation_id.clone(),
          coordinate: request.coordinate,
        },
      })?;
    Ok(ReferenceResult {
      workspace_id: request.workspace_id,
      verse,
    })
  }
}

#[cfg(test)]
mod tests {
  use super::{
    Application, ResolvedVerse, StartupError, Storage, StoredState, TranslationId, VerseCoordinate,
    WorkspaceId,
  };
  use std::{cell::Cell, convert::Infallible};

  struct TestStorage<'a>(&'a Cell<bool>);

  impl Storage for TestStorage<'_> {
    type Error = Infallible;

    fn initialize(&mut self) -> Result<StoredState, Self::Error> {
      self.0.set(true);
      Ok(StoredState {
        translations: Vec::new(),
        workspaces: Vec::new(),
        active_workspace_id: WorkspaceId("greeting-fixture".into()),
      })
    }

    fn resolve_reference(
      &self,
      _: &TranslationId,
      _: VerseCoordinate,
    ) -> Result<Option<ResolvedVerse>, Self::Error> {
      Ok(None)
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

    fn initialize(&mut self) -> Result<StoredState, Self::Error> {
      Err(std::io::Error::from(std::io::ErrorKind::PermissionDenied))
    }

    fn resolve_reference(
      &self,
      _: &TranslationId,
      _: VerseCoordinate,
    ) -> Result<Option<ResolvedVerse>, Self::Error> {
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
