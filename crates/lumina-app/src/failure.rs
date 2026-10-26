//! Public failures: explicit wire codes survive Rust renames and wording changes.

use lumina_core::{CoordinateField, TranslationId, VerseCoordinate, WorkspaceId};
use serde::{Deserialize, Serialize};
use specta::Type;

/// The single public code catalog. Messages are display text, never identifiers.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type, thiserror::Error)]
#[serde(tag = "errorCode")]
pub enum ApplicationFailure {
  #[serde(rename = "INVALID_SEARCH")]
  #[error("{message}")]
  InvalidSearch {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "STALE_LIBRARY")]
  #[error("{message}")]
  StaleLibrary {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "INVALID_IMPORT")]
  #[error("{message}")]
  InvalidImport {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "IMPORT_REVIEW_UNAVAILABLE")]
  #[error("{message}")]
  ImportReviewUnavailable {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "CONFIRMATION_REQUIRED")]
  #[error("{message}")]
  ConfirmationRequired {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "TRANSLATION_PROTECTED")]
  #[error("{message}")]
  TranslationProtected {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "AUDIENCES_OPEN")]
  #[error("{message}")]
  AudiencesOpen {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "INVALID_REFERENCE_INPUT")]
  #[error("{message}")]
  InvalidReferenceInput {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "UNKNOWN_BOOK")]
  #[error("{message}")]
  UnknownBook {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "BOOK_UNAVAILABLE")]
  #[error("{message}")]
  BookUnavailable {
    message: String,
    data: crate::CatalogFailureData,
  },
  #[serde(rename = "STALE_REFERENCE_CHOICE")]
  #[error("{message}")]
  StaleReferenceChoice {
    message: String,
    data: crate::CatalogFailureData,
  },

  #[serde(rename = "APPLICATION_UNAVAILABLE")]
  #[error("{message}")]
  Unavailable {
    message: String,
    data: AvailabilityData,
  },
  #[serde(rename = "INTERNAL_ERROR")]
  #[error("{message}")]
  Internal {
    message: String,
  },
  /// Used by the frontend bridge for unrecognized IPC/transport failures.
  #[serde(rename = "INVOCATION_FAILED")]
  #[error("{message}")]
  Invocation {
    message: String,
    data: InvocationData,
  },
  #[serde(rename = "WORKSPACE_NOT_FOUND")]
  #[error("{message}")]
  WorkspaceNotFound {
    message: String,
    data: WorkspaceData,
  },
  #[serde(rename = "INVALID_REFERENCE")]
  #[error("{message}")]
  InvalidReference {
    message: String,
    data: InvalidReferenceData,
  },
  #[serde(rename = "TRANSLATION_UNAVAILABLE")]
  #[error("{message}")]
  TranslationUnavailable {
    message: String,
    data: TranslationData,
  },
  #[serde(rename = "REFERENCE_UNAVAILABLE")]
  #[error("{message}")]
  ReferenceUnavailable {
    message: String,
    data: ReferenceData,
  },
  #[serde(rename = "STORAGE_FAILURE")]
  #[error("{message}")]
  Storage {
    message: String,
  },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceData {
  pub workspace_id: WorkspaceId,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
pub struct InvalidReferenceData {
  pub coordinate: VerseCoordinate,
  pub field: CoordinateField,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranslationData {
  pub translation_id: TranslationId,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceData {
  pub translation_id: TranslationId,
  pub coordinate: VerseCoordinate,
}

/// Keep diagnostic causes outside the serialized failure envelope.
#[derive(Debug, thiserror::Error)]
pub enum OperationError<E: std::error::Error + 'static> {
  #[error("{0}")]
  Rejected(#[from] ApplicationFailure),
  #[error("application storage operation failed")]
  Storage(#[source] E),
}

impl<E: std::error::Error + 'static> OperationError<E> {
  pub fn public_failure(&self) -> ApplicationFailure {
    match self {
      Self::Rejected(failure) => failure.clone(),
      Self::Storage(_) => ApplicationFailure::Storage {
        message: "The library could not be read. Check the terminal diagnostics.".into(),
      },
    }
  }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
pub struct AvailabilityData {
  pub state: StartupState,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
pub enum StartupState {
  #[serde(rename = "starting")]
  Starting,
  #[serde(rename = "failed")]
  Failed,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
pub struct InvocationData {
  pub command: String,
}

#[cfg(test)]
mod tests {
  use super::{ApplicationFailure, AvailabilityData, InvocationData, StartupState};
  use serde_json::json;

  #[test]
  fn failure_codes_and_typed_data_do_not_depend_on_wording() -> Result<(), serde_json::Error> {
    for message in ["Storage is starting", "Please try again shortly"] {
      let failure = ApplicationFailure::Unavailable {
        message: message.into(),
        data: AvailabilityData {
          state: StartupState::Starting,
        },
      };
      assert_eq!(
        serde_json::to_value(&failure)?,
        json!({
          "errorCode": "APPLICATION_UNAVAILABLE",
          "message": message,
          "data": {
            "state": "starting"
          }
        })
      );
    }
    let failed = ApplicationFailure::Unavailable {
      message: "Storage failed".into(),
      data: AvailabilityData {
        state: StartupState::Failed,
      },
    };
    assert_eq!(
      serde_json::to_value(failed)?["data"],
      json!({
        "state": "failed"
      })
    );
    Ok(())
  }

  #[test]
  fn internal_and_invocation_failures_have_explicit_wire_codes() -> Result<(), serde_json::Error> {
    assert_eq!(
      serde_json::to_value(ApplicationFailure::Internal {
        message: "Application operation failed".into(),
      })?,
      json!({
        "errorCode": "INTERNAL_ERROR",
        "message": "Application operation failed"
      })
    );
    assert_eq!(
      serde_json::to_value(ApplicationFailure::Invocation {
        message: "IPC unavailable".into(),
        data: InvocationData {
          command: "greet".into()
        },
      })?,
      json!({
        "errorCode": "INVOCATION_FAILED",
        "message": "IPC unavailable",
        "data": {
          "command": "greet"
        }
      })
    );
    Ok(())
  }
}
