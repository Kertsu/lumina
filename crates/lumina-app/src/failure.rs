//! Public failures: explicit wire codes survive Rust renames and wording changes.

use serde::{Deserialize, Serialize};
use specta::Type;

/// The single public code catalog. Messages are display text, never identifiers.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(tag = "errorCode")]
pub enum ApplicationFailure {
  #[serde(rename = "APPLICATION_UNAVAILABLE")]
  Unavailable {
    message: String,
    data: AvailabilityData,
  },
  #[serde(rename = "INTERNAL_ERROR")]
  Internal {
    message: String,
  },
  /// Used by the frontend bridge for unrecognized IPC/transport failures.
  #[serde(rename = "INVOCATION_FAILED")]
  Invocation {
    message: String,
    data: InvocationData,
  },
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
