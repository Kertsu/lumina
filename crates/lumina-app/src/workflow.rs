//! Workspace state, durable verse intents and authenticated audience confirmations.

use crate::{
  Application, ApplicationFailure, AudienceState, EditionId, OperationError, ResolvedVerse,
  Storage, TranslationId, Workspace, WorkspaceData, WorkspaceId, WorkspaceSettings,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static SESSION_SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub(crate) fn session_identity() -> String {
  let sequence = SESSION_SEQUENCE.fetch_add(1, Ordering::Relaxed);
  let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |value| value.as_nanos());
  format!("session-{nanos}-{sequence}")
}

/// Adapter results mean only whether the native request was accepted, not whether
/// a receiver applied content. Once dispatch is called, errors remain uncertain.
pub trait NativeAudience {
  /// # Errors
  /// Returns native creation diagnostics without attaching an audience.
  fn open(&mut self, owner: &AudienceOwner, hide_cursor: bool) -> Result<(), String>;
  /// # Errors
  /// Returns native closure diagnostics without retiring its owner.
  fn close(&mut self, owner: &AudienceOwner) -> Result<(), String>;
  /// # Errors
  /// Delivery may have begun even when this returns an error.
  fn dispatch(&mut self, output: &AudienceOutput) -> Result<(), String>;
  /// # Errors
  /// Returns unsupported-operation or native visibility diagnostics.
  fn set_cursor(&mut self, owner: &AudienceOwner, hidden: bool) -> Result<(), String>;
  /// # Errors
  /// Returns unsupported-operation or native fullscreen diagnostics.
  fn set_fullscreen(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String>;
  /// # Errors
  /// Returns unsupported-operation or native stacking diagnostics.
  fn set_always_on_top(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String>;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudienceOwner {
  pub workspace_id: WorkspaceId,
  pub session_id: String,
  pub instance_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudienceOutput {
  pub owner: AudienceOwner,
  pub revision: u32,
  pub action_id: Option<String>,
  pub content: AudienceContent,
  pub appearance: Appearance,
  pub hide_cursor: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AudienceContent {
  Blank,
  Verse {
    verse: ResolvedVerse,
  },
  BookInformation {
    information: InformationCapture,
  },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InformationCapture {
  pub translation_id: TranslationId,
  pub edition_id: EditionId,
  pub translation_title: String,
  pub book_number: i32,
  pub name: String,
  pub author: Option<String>,
  pub writing_date: Option<String>,
  pub writing_location: Option<String>,
  pub metadata_attribution: Option<String>,
  pub metadata_source_url: Option<String>,
  pub metadata_rights_notice: Option<String>,
  pub background: Option<TranslationBackground>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ProjectionOutcome {
  Selected,
  AwaitingConfirmation,
  Unconfirmed,
  Projected,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum VerseActionKind {
  SendLive,
  Navigation,
  Recall,
  ChangeTranslation,
  Resume,
  InformationReturn,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
  pub action_id: String,
  pub workspace_id: WorkspaceId,
  pub verse: ResolvedVerse,
  pub timestamp_ms: f64,
  pub kind: VerseActionKind,
  pub outcome: ProjectionOutcome,
  pub owner: Option<AudienceOwner>,
  pub revision: u32,
  /// Resume/return intents enter visible verse history only after confirmation.
  pub record_on_confirmation: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct VerseActionResult {
  pub action_id: String,
  pub outcome: ProjectionOutcome,
  pub delivery_error: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudienceAcknowledgment {
  pub session_id: String,
  pub action_id: String,
  pub revision: u32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum PreviewOrigin {
  Reference,
  Search,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PreviewCandidate {
  pub candidate_id: String,
  pub workspace_id: WorkspaceId,
  pub verse: ResolvedVerse,
  pub origin: PreviewOrigin,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Appearance {
  pub font_family: Option<String>,
  pub bold: Option<bool>,
  pub italic: Option<bool>,
  pub underline: Option<bool>,
  pub strike: Option<bool>,
  pub color: Option<String>,
  pub bands: Option<Vec<SizeBand>>,
  pub backgrounds: Vec<TranslationBackground>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SizeBand {
  pub lower: u32,
  pub upper: Option<u32>,
  pub font_size_px: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum BackgroundFit {
  #[default]
  Fill,
  Fit,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranslationBackground {
  pub translation_id: TranslationId,
  pub asset_id: Option<String>,
  pub fallback_color: Option<String>,
  pub fit: BackgroundFit,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceState {
  pub appearance: Appearance,
  pub grapheme_count: Option<u32>,
  pub active_band: Option<u32>,
  pub segmentation_version: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DurableWorkspace {
  pub workspace_id: WorkspaceId,
  pub settings: WorkspaceSettings,
  pub appearance: Appearance,
  pub history: Vec<HistoryEntry>,
}

/// Atomic durable organization/preferences/history boundary. Captures have no
/// foreign key to installed editions, preserving Saved copies after deletion.
pub trait WorkspaceStorage: Storage {
  /// # Errors
  /// Retains persisted workspace decoding/query failures.
  fn load_workflow_state(&self) -> Result<Vec<DurableWorkspace>, Self::Error>;
  /// # Errors
  /// Fails atomically before publishing any part of the proposed state.
  fn save_workflow_state(
    &mut self,
    workspaces: &[DurableWorkspace],
    active: &WorkspaceId,
  ) -> Result<(), Self::Error>;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowData {
  pub workspace_id: WorkspaceId,
  pub operation: String,
}

fn rejection(id: &WorkspaceId, operation: &str, message: &str) -> ApplicationFailure {
  ApplicationFailure::WorkflowRejected {
    message: message.into(),
    data: WorkflowData {
      workspace_id: id.clone(),
      operation: operation.into(),
    },
  }
}

fn native_failure(id: &WorkspaceId, operation: &str, message: String) -> ApplicationFailure {
  ApplicationFailure::NativeOperationFailed {
    message,
    data: WorkflowData {
      workspace_id: id.clone(),
      operation: operation.into(),
    },
  }
}

impl<S: Storage> Application<S> {
  fn identity(&mut self, prefix: &str) -> String {
    self.sequence = self.sequence.wrapping_add(1);
    format!("{prefix}-{}-{}", self.session_id, self.sequence)
  }

  pub(crate) fn workspace_index(&self, id: &WorkspaceId) -> Result<usize, ApplicationFailure> {
    self.state.workspaces.iter().position(|workspace| &workspace.workspace_id == id).ok_or_else(
      || ApplicationFailure::WorkspaceNotFound {
        message: "The operator workspace is unavailable.".into(),
        data: WorkspaceData {
          workspace_id: id.clone(),
        },
      },
    )
  }

  /// # Errors
  /// Returns a missing-workspace or closed-output failure.
  pub fn audience_output(&self, id: &WorkspaceId) -> Result<AudienceOutput, ApplicationFailure> {
    let workspace = &self.state.workspaces[self.workspace_index(id)?];
    let owner = workspace.owner.clone().ok_or_else(|| ApplicationFailure::AudienceClosed {
      message: "Open the audience explicitly before sending live.".into(),
      data: WorkspaceData {
        workspace_id: id.clone(),
      },
    })?;
    let content = match workspace.audience {
      AudienceState::Closed | AudienceState::Blank => AudienceContent::Blank,
      AudienceState::Live if workspace.book_information_mode => workspace
        .information
        .clone()
        .map_or(AudienceContent::Blank, |information| AudienceContent::BookInformation {
          information,
        }),
      AudienceState::Live => {
        workspace.current_verse.clone().map_or(AudienceContent::Blank, |verse| {
          AudienceContent::Verse {
            verse,
          }
        })
      }
    };
    Ok(AudienceOutput {
      owner,
      revision: workspace.output_revision,
      action_id: workspace.output_action_id.clone(),
      content,
      appearance: workspace.appearance.clone(),
      hide_cursor: workspace.settings.hide_cursor,
    })
  }

  pub fn current_audience_output(&self, instance_id: &str) -> Option<AudienceOutput> {
    self
      .state
      .workspaces
      .iter()
      .find(|workspace| {
        workspace.owner.as_ref().is_some_and(|owner| owner.instance_id == instance_id)
      })
      .and_then(|workspace| self.audience_output(&workspace.workspace_id).ok())
  }

  /// # Errors
  /// Returns missing/duplicate ownership or native creation failure.
  pub fn open_audience(
    &mut self,
    id: &WorkspaceId,
    native: &mut impl NativeAudience,
  ) -> Result<AudienceOwner, OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if self.state.workspaces[index].owner.is_some() {
      return Err(rejection(id, "openAudience", "This workspace already owns an audience.").into());
    }
    let owner = AudienceOwner {
      workspace_id: id.clone(),
      session_id: self.session_id.clone(),
      instance_id: self.identity("audience"),
    };
    native
      .open(&owner, self.state.workspaces[index].settings.hide_cursor)
      .map_err(|message| native_failure(id, "openAudience", message))?;
    let workspace = &mut self.state.workspaces[index];
    workspace.owner = Some(owner.clone());
    workspace.audience = AudienceState::Blank;
    workspace.output_revision = 1;
    workspace.output_action_id = None;
    let output = self.audience_output(id)?;
    // The native instance is owned even if its initial blank delivery is uncertain.
    native.dispatch(&output).map_err(|message| native_failure(id, "initialBlank", message))?;
    Ok(owner)
  }

  /// # Errors
  /// Returns missing ownership or native closure failure.
  pub fn close_audience(
    &mut self,
    id: &WorkspaceId,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    let Some(owner) = self.state.workspaces[index].owner.clone() else {
      return Ok(());
    };
    native.close(&owner).map_err(|message| native_failure(id, "closeAudience", message))?;
    self.retire_instance(index);
    Ok(())
  }

  fn retire_instance(&mut self, index: usize) {
    let workspace = &mut self.state.workspaces[index];
    workspace.owner = None;
    workspace.audience = AudienceState::Closed;
    workspace.fullscreen = false;
    workspace.always_on_top = false;
    for entry in &mut workspace.history {
      if entry.outcome == ProjectionOutcome::AwaitingConfirmation {
        entry.outcome = ProjectionOutcome::Unconfirmed;
      }
    }
  }

  /// An authenticated native close/display-loss callback only retires its live owner.
  pub fn audience_closed(&mut self, caller_instance_id: &str) -> bool {
    let index = self.state.workspaces.iter().position(|workspace| {
      workspace.owner.as_ref().is_some_and(|owner| owner.instance_id == caller_instance_id)
    });
    if let Some(index) = index {
      self.retire_instance(index);
      true
    } else {
      false
    }
  }

  /// # Errors
  /// Returns closed-output or native operation failure; never opens an audience.
  pub fn blank_audience(
    &mut self,
    id: &WorkspaceId,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    self.audience_output(id)?;
    let index = self.workspace_index(id)?;
    let workspace = &mut self.state.workspaces[index];
    workspace.audience = AudienceState::Blank;
    workspace.output_revision = workspace.output_revision.saturating_add(1);
    workspace.output_action_id = None;
    native
      .dispatch(&self.audience_output(id)?)
      .map_err(|message| native_failure(id, "blankAudience", message))?;
    Ok(())
  }

  /// # Errors
  /// Returns unsupported/native fullscreen failure without falsely accepting it.
  pub fn set_fullscreen(
    &mut self,
    id: &WorkspaceId,
    enabled: bool,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let owner = self.audience_output(id)?.owner;
    native
      .set_fullscreen(&owner, enabled)
      .map_err(|message| native_failure(id, "fullscreen", message))?;
    let index = self.workspace_index(id)?;
    self.state.workspaces[index].fullscreen = enabled;
    Ok(())
  }

  /// # Errors
  /// Returns unsupported/native stacking failure without falsely accepting it.
  pub fn set_always_on_top(
    &mut self,
    id: &WorkspaceId,
    enabled: bool,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let owner = self.audience_output(id)?.owner;
    native
      .set_always_on_top(&owner, enabled)
      .map_err(|message| native_failure(id, "alwaysOnTop", message))?;
    let index = self.workspace_index(id)?;
    self.state.workspaces[index].always_on_top = enabled;
    Ok(())
  }

  /// # Errors
  /// Returns a missing workspace; inspection changes no current/output/history state.
  pub fn capture_preview(
    &mut self,
    id: &WorkspaceId,
    verse: ResolvedVerse,
    origin: PreviewOrigin,
  ) -> Result<PreviewCandidate, ApplicationFailure> {
    let index = self.workspace_index(id)?;
    let candidate = PreviewCandidate {
      candidate_id: self.identity("candidate"),
      workspace_id: id.clone(),
      verse,
      origin,
    };
    self.state.workspaces[index].preview = Some(candidate.clone());
    Ok(candidate)
  }

  /// # Errors
  /// Rejects a candidate not owned by this workspace.
  pub fn dismiss_preview(
    &mut self,
    id: &WorkspaceId,
    candidate_id: &str,
  ) -> Result<(), ApplicationFailure> {
    let index = self.workspace_index(id)?;
    if !self.state.workspaces[index]
      .preview
      .as_ref()
      .is_some_and(|candidate| candidate.candidate_id == candidate_id)
    {
      return Err(rejection(id, "dismissPreview", "The preview candidate is unavailable."));
    }
    self.state.workspaces[index].preview = None;
    Ok(())
  }
}

impl<S: WorkspaceStorage> Application<S> {
  fn durable(workspaces: &[Workspace]) -> Vec<DurableWorkspace> {
    workspaces
      .iter()
      .map(|workspace| DurableWorkspace {
        workspace_id: workspace.workspace_id.clone(),
        settings: workspace.settings.clone(),
        appearance: workspace.appearance.clone(),
        history: workspace.history.clone(),
      })
      .collect()
  }

  fn persist_proposal(
    &mut self,
    workspaces: &[Workspace],
    active: &WorkspaceId,
  ) -> Result<(), OperationError<S::Error>> {
    self
      .storage
      .save_workflow_state(&Self::durable(workspaces), active)
      .map_err(OperationError::Storage)
  }

  /// Load durable preferences/history after startup. Pending intents retire as
  /// unconfirmed; runtime content, candidates and audiences are never restored.
  /// # Errors
  /// Retains storage failures before the ready application is published.
  pub fn restore_workflows(&mut self) -> Result<(), OperationError<S::Error>> {
    let stored = self.storage.load_workflow_state().map_err(OperationError::Storage)?;
    for value in stored {
      if let Some(workspace) = self
        .state
        .workspaces
        .iter_mut()
        .find(|workspace| workspace.workspace_id == value.workspace_id)
      {
        workspace.appearance = value.appearance;
        workspace.history = value.history;
        for entry in &mut workspace.history {
          if entry.outcome == ProjectionOutcome::AwaitingConfirmation {
            entry.outcome = ProjectionOutcome::Unconfirmed;
          }
        }
      }
    }
    let proposal = self.state.workspaces.clone();
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)
  }

  /// Persist the immutable action intent before entering native delivery. Send
  /// accepts server-resolved/captured text; IPC must never accept arbitrary text.
  /// # Errors
  /// Rejects invalid/closed output and predispatch storage failures unchanged.
  pub fn send_verse(
    &mut self,
    id: &WorkspaceId,
    verse: ResolvedVerse,
    kind: VerseActionKind,
    require_open: bool,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<VerseActionResult, OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if !now_ms.is_finite() || now_ms < 0.0 {
      return Err(rejection(id, "sendVerse", "The action timestamp is invalid.").into());
    }
    if require_open && self.state.workspaces[index].owner.is_none() {
      return Err(
        ApplicationFailure::AudienceClosed {
          message: "Open the audience explicitly before sending live.".into(),
          data: WorkspaceData {
            workspace_id: id.clone(),
          },
        }
        .into(),
      );
    }
    let action_id = self.identity("action");
    let mut proposal = self.state.workspaces.clone();
    let workspace = &mut proposal[index];
    workspace.current_verse = Some(verse.clone());
    workspace.book_information_mode = false;
    workspace.output_revision = workspace.output_revision.saturating_add(1);
    workspace.output_action_id = Some(action_id.clone());
    let outcome = if workspace.owner.is_some() {
      ProjectionOutcome::AwaitingConfirmation
    } else {
      ProjectionOutcome::Selected
    };
    let record_on_confirmation =
      matches!(kind, VerseActionKind::Resume | VerseActionKind::InformationReturn);
    workspace.history.insert(
      0,
      HistoryEntry {
        action_id: action_id.clone(),
        workspace_id: id.clone(),
        verse,
        timestamp_ms: now_ms,
        kind,
        outcome: outcome.clone(),
        owner: workspace.owner.clone(),
        revision: workspace.output_revision,
        record_on_confirmation,
      },
    );
    if workspace.owner.is_some() {
      workspace.audience = AudienceState::Live;
    }
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    let delivery_error = if self.state.workspaces[index].owner.is_some() {
      native.dispatch(&self.audience_output(id)?).err()
    } else {
      None
    };
    let mut result = VerseActionResult {
      action_id,
      outcome,
      delivery_error,
    };
    if result.delivery_error.is_some() {
      self.state.workspaces[index].history[0].outcome = ProjectionOutcome::Unconfirmed;
      result.outcome = ProjectionOutcome::Unconfirmed;
      // Intent remains durable if this follow-up write fails; restart settles it
      // Unconfirmed. Never roll accepted content backwards after possible delivery.
      let accepted = self.state.workspaces.clone();
      self.persist_proposal(&accepted, &active)?;
    }
    Ok(result)
  }

  /// # Errors
  /// Rejects inactive/closed/wrong candidates while retaining private inspection.
  pub fn send_preview(
    &mut self,
    id: &WorkspaceId,
    candidate_id: &str,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<VerseActionResult, OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if self.state.active_workspace_id != *id {
      return Err(
        rejection(
          id,
          "sendPreview",
          "Activate the originating workspace before sending this preview.",
        )
        .into(),
      );
    }
    let candidate = self.state.workspaces[index]
      .preview
      .as_ref()
      .filter(|candidate| candidate.candidate_id == candidate_id)
      .cloned()
      .ok_or_else(|| rejection(id, "sendPreview", "The preview candidate is unavailable."))?;
    self.send_verse(id, candidate.verse, VerseActionKind::SendLive, true, now_ms, native)
  }

  /// Exact caller-bound confirmation updates its own durable record once. It
  /// never changes current content, output mode or newer output revisions.
  /// # Errors
  /// Retains outcome storage failure without reporting durable projection.
  pub fn acknowledge(
    &mut self,
    caller_instance_id: &str,
    acknowledgment: AudienceAcknowledgment,
  ) -> Result<bool, OperationError<S::Error>> {
    let Some(index) = self.state.workspaces.iter().position(|workspace| {
      workspace.owner.as_ref().is_some_and(|owner| {
        owner.instance_id == caller_instance_id && owner.session_id == acknowledgment.session_id
      })
    }) else {
      return Ok(false);
    };
    let mut proposal = self.state.workspaces.clone();
    let Some(entry) = proposal[index].history.iter_mut().find(|entry| {
      entry.action_id == acknowledgment.action_id
        && entry.revision == acknowledgment.revision
        && entry.owner.as_ref().is_some_and(|owner| {
          owner.instance_id == caller_instance_id && owner.session_id == acknowledgment.session_id
        })
    }) else {
      return Ok(false);
    };
    if entry.outcome == ProjectionOutcome::Projected {
      return Ok(true);
    }
    entry.outcome = ProjectionOutcome::Projected;
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(true)
  }

  /// # Errors
  /// Retains storage failure; timeout never changes selection or replays output.
  pub fn expire_projections(&mut self, now_ms: f64) -> Result<bool, OperationError<S::Error>> {
    let mut proposal = self.state.workspaces.clone();
    let mut changed = false;
    for workspace in &mut proposal {
      for entry in &mut workspace.history {
        if entry.outcome == ProjectionOutcome::AwaitingConfirmation
          && now_ms - entry.timestamp_ms >= 5_000.0
        {
          entry.outcome = ProjectionOutcome::Unconfirmed;
          changed = true;
        }
      }
    }
    if changed {
      let active = self.state.active_workspace_id.clone();
      self.persist_proposal(&proposal, &active)?;
      self.state.workspaces = proposal;
    }
    Ok(changed)
  }

  /// # Errors
  /// Rejects closed output or no retained content without opening an audience.
  pub fn resume_audience(
    &mut self,
    id: &WorkspaceId,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<Option<VerseActionResult>, OperationError<S::Error>> {
    self.audience_output(id)?;
    let index = self.workspace_index(id)?;
    if self.state.workspaces[index].book_information_mode {
      if self.state.workspaces[index].information.is_none() {
        return Err(rejection(id, "resume", "No captured book information is available.").into());
      }
      self.state.workspaces[index].audience = AudienceState::Live;
      self.state.workspaces[index].output_revision =
        self.state.workspaces[index].output_revision.saturating_add(1);
      self.state.workspaces[index].output_action_id = None;
      native
        .dispatch(&self.audience_output(id)?)
        .map_err(|message| native_failure(id, "resumeInformation", message))?;
      return Ok(None);
    }
    let verse = self.state.workspaces[index]
      .current_verse
      .clone()
      .ok_or_else(|| rejection(id, "resume", "No retained verse is available."))?;
    self.send_verse(id, verse, VerseActionKind::Resume, true, now_ms, native).map(Some)
  }

  /// # Errors
  /// Returns a missing workspace.
  pub fn history(
    &self,
    id: &WorkspaceId,
    projected_only: bool,
  ) -> Result<Vec<HistoryEntry>, ApplicationFailure> {
    Ok(
      self.state.workspaces[self.workspace_index(id)?]
        .history
        .iter()
        .filter(|entry| {
          (!entry.record_on_confirmation || entry.outcome == ProjectionOutcome::Projected)
            && (!projected_only || entry.outcome == ProjectionOutcome::Projected)
        })
        .cloned()
        .collect(),
    )
  }
}

impl<S: WorkspaceStorage> Application<S> {
  /// # Errors
  /// Returns invalid naming or atomic storage failure.
  pub fn add_workspace(
    &mut self,
    name: Option<String>,
  ) -> Result<Workspace, OperationError<S::Error>> {
    let workspace_id = WorkspaceId(self.identity("workspace"));
    let name = name.unwrap_or_else(|| format!("Audience {}", self.state.workspaces.len() + 1));
    validate_name(&workspace_id, &name)?;
    let selected_translation_id = self
      .state
      .translations
      .iter()
      .find(|translation| translation.bundled)
      .ok_or_else(|| rejection(&workspace_id, "addWorkspace", "Bundled WEB is unavailable."))?
      .translation_id
      .clone();
    let workspace = Workspace {
      workspace_id: workspace_id.clone(),
      settings: WorkspaceSettings {
        name,
        selected_translation_id,
        hide_cursor: true,
      },
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
    };
    let mut proposal = self.state.workspaces.clone();
    proposal.push(workspace.clone());
    self.persist_proposal(&proposal, &workspace_id)?;
    self.state.workspaces = proposal;
    self.state.active_workspace_id = workspace_id;
    Ok(workspace)
  }

  /// # Errors
  /// Returns invalid naming, missing ownership or atomic storage failure.
  pub fn rename_workspace(
    &mut self,
    id: &WorkspaceId,
    name: String,
  ) -> Result<(), OperationError<S::Error>> {
    validate_name(id, &name)?;
    let index = self.workspace_index(id)?;
    let mut proposal = self.state.workspaces.clone();
    proposal[index].settings.name = name;
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(())
  }

  /// # Errors
  /// Returns missing ownership or atomic storage failure.
  pub fn activate_workspace(&mut self, id: &WorkspaceId) -> Result<(), OperationError<S::Error>> {
    self.workspace_index(id)?;
    let proposal = self.state.workspaces.clone();
    self.persist_proposal(&proposal, id)?;
    self.state.active_workspace_id = id.clone();
    Ok(())
  }

  /// # Errors
  /// Rejects omitted, duplicate or foreign workspace identities.
  pub fn reorder_workspaces(
    &mut self,
    ids: Vec<WorkspaceId>,
  ) -> Result<(), OperationError<S::Error>> {
    let active = self.state.active_workspace_id.clone();
    if ids.len() != self.state.workspaces.len()
      || ids.iter().enumerate().any(|(index, id)| ids[..index].contains(id))
    {
      return Err(
        rejection(&active, "reorderWorkspaces", "Supply every workspace identity exactly once.")
          .into(),
      );
    }
    let proposal = ids
      .iter()
      .map(|id| self.workspace_index(id).map(|index| self.state.workspaces[index].clone()))
      .collect::<Result<Vec<_>, _>>()?;
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(())
  }

  /// # Errors
  /// Requires confirmation, retains the final workspace and reports native/storage failures.
  pub fn remove_workspace(
    &mut self,
    id: &WorkspaceId,
    confirmed: bool,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if !confirmed {
      return Err(
        rejection(id, "removeWorkspace", "Confirm removal of this workspace and its history.")
          .into(),
      );
    }
    if self.state.workspaces.len() == 1 {
      return Err(
        rejection(id, "removeWorkspace", "Retain at least one operator workspace.").into(),
      );
    }
    // Closure occurs before durable removal; a native close failure leaves the
    // workspace and its persisted state available for an explicit retry.
    self.close_audience(id, native)?;
    let mut proposal = self.state.workspaces.clone();
    proposal.remove(index);
    let active = if self.state.active_workspace_id == *id {
      proposal[index.min(proposal.len() - 1)].workspace_id.clone()
    } else {
      self.state.active_workspace_id.clone()
    };
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    self.state.active_workspace_id = active;
    Ok(())
  }

  /// Selects future lookup text; never changes a current capture or audience.
  /// # Errors
  /// Returns unavailable translation/workspace or atomic storage failure.
  pub fn select_translation(
    &mut self,
    id: &WorkspaceId,
    translation_id: TranslationId,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if !self
      .state
      .translations
      .iter()
      .any(|translation| translation.translation_id == translation_id)
    {
      return Err(
        ApplicationFailure::TranslationUnavailable {
          message: "The selected translation is unavailable.".into(),
          data: crate::TranslationData {
            translation_id,
          },
        }
        .into(),
      );
    }
    let mut proposal = self.state.workspaces.clone();
    proposal[index].settings.selected_translation_id = translation_id;
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(())
  }

  /// # Errors
  /// Returns native or storage failures while preserving accepted preferences.
  pub fn set_hide_cursor(
    &mut self,
    id: &WorkspaceId,
    hidden: bool,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    let owner = self.state.workspaces[index].owner.clone();
    let previous = self.state.workspaces[index].settings.hide_cursor;
    if let Some(owner) = &owner {
      native
        .set_cursor(owner, hidden)
        .map_err(|message| native_failure(id, "hideCursor", message))?;
    }
    let mut proposal = self.state.workspaces.clone();
    proposal[index].settings.hide_cursor = hidden;
    let active = self.state.active_workspace_id.clone();
    if let Err(error) = self.persist_proposal(&proposal, &active) {
      if let Some(owner) = &owner {
        let _ = native.set_cursor(owner, previous);
      }
      return Err(error);
    }
    self.state.workspaces = proposal;
    if owner.is_some() {
      self.state.workspaces[index].output_revision =
        self.state.workspaces[index].output_revision.saturating_add(1);
      self.state.workspaces[index].output_action_id = None;
      native
        .dispatch(&self.audience_output(id)?)
        .map_err(|message| native_failure(id, "hideCursorRender", message))?;
    }
    Ok(())
  }

  /// # Errors
  /// Returns missing history; original text/labels remain independent of installed editions.
  pub fn copy_history(
    &self,
    id: &WorkspaceId,
    action_id: &str,
  ) -> Result<String, ApplicationFailure> {
    let entry = self
      .history(id, false)?
      .into_iter()
      .find(|entry| entry.action_id == action_id)
      .ok_or_else(|| rejection(id, "copyHistory", "The history entry is unavailable."))?;
    Ok(format!(
      "{}\n{} {}:{} · {}",
      entry.verse.text,
      entry.verse.book_name,
      entry.verse.coordinate.chapter,
      entry.verse.coordinate.verse,
      entry.verse.translation_title
    ))
  }

  /// Export exactly the explicitly requested rows in their requested order.
  /// # Errors
  /// Rejects missing or duplicate rows instead of guessing the visible UI set.
  pub fn export_history(
    &self,
    id: &WorkspaceId,
    action_ids: Vec<String>,
  ) -> Result<String, ApplicationFailure> {
    let history = self.history(id, false)?;
    let mut output = String::from("Reference,Translation,Text,Timestamp,Outcome\r\n");
    for (index, action_id) in action_ids.iter().enumerate() {
      if action_ids[..index].contains(action_id) {
        return Err(rejection(
          id,
          "exportHistory",
          "Each visible history identity must occur once.",
        ));
      }
      let entry = history.iter().find(|entry| &entry.action_id == action_id).ok_or_else(|| {
        rejection(id, "exportHistory", "A requested visible history entry is unavailable.")
      })?;
      let reference = format!(
        "{} {}:{}",
        entry.verse.book_name, entry.verse.coordinate.chapter, entry.verse.coordinate.verse
      );
      let outcome = match entry.outcome {
        ProjectionOutcome::Selected => "Selected",
        ProjectionOutcome::AwaitingConfirmation => "Awaiting confirmation",
        ProjectionOutcome::Unconfirmed => "Unconfirmed",
        ProjectionOutcome::Projected => "Projected",
      };
      output.push_str(
        &[
          reference,
          entry.verse.translation_title.clone(),
          entry.verse.text.clone(),
          entry.timestamp_ms.to_string(),
          outcome.into(),
        ]
        .iter()
        .map(|value| csv_cell(value))
        .collect::<Vec<_>>()
        .join(","),
      );
      output.push_str("\r\n");
    }
    Ok(output)
  }

  /// # Errors
  /// Requires deliberate confirmation and an atomic workspace-scoped write.
  pub fn clear_history(
    &mut self,
    id: &WorkspaceId,
    confirmed: bool,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if !confirmed {
      return Err(
        rejection(id, "clearHistory", "Confirm clearing this workspace's history.").into(),
      );
    }
    let mut proposal = self.state.workspaces.clone();
    proposal[index].history.clear();
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(())
  }

  /// # Errors
  /// Returns missing history or the normal verse-action rejection.
  pub fn recall_history(
    &mut self,
    id: &WorkspaceId,
    action_id: &str,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<VerseActionResult, OperationError<S::Error>> {
    let verse = self
      .history(id, false)?
      .into_iter()
      .find(|entry| entry.action_id == action_id)
      .ok_or_else(|| rejection(id, "recallHistory", "The history entry is unavailable."))?
      .verse;
    self.send_verse(id, verse, VerseActionKind::Recall, false, now_ms, native)
  }
}

fn validate_name(id: &WorkspaceId, name: &str) -> Result<(), ApplicationFailure> {
  if name.trim().is_empty() || name.len() > 512 || name.contains('\0') {
    return Err(rejection(
      id,
      "renameWorkspace",
      "Use a nonblank name of at most 512 UTF-8 bytes.",
    ));
  }
  Ok(())
}

fn csv_cell(value: &str) -> String {
  format!("\"{}\"", value.replace('"', "\"\""))
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ManagedAsset {
  pub asset_id: String,
  pub mime_type: String,
  pub width: u32,
  pub height: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ManagedAssetData {
  pub asset: ManagedAsset,
  pub bytes: Vec<u8>,
}

pub trait AssetStorage: Storage {
  /// Validate bounded image data and atomically retain a managed copy.
  /// # Errors
  /// Returns typed invalid image or retained storage diagnostics.
  fn import_background_asset(
    &mut self,
    path: &str,
  ) -> Result<ManagedAsset, OperationError<Self::Error>>;
  /// # Errors
  /// Retains managed resource read errors; absent identities return `None`.
  fn managed_asset(&self, asset_id: &str) -> Result<Option<ManagedAssetData>, Self::Error>;
}

impl<S: Storage> Application<S> {
  /// # Errors
  /// Returns a missing workspace. Counts captured original text with Unicode 17.0
  /// extended grapheme segmentation (`unicode-segmentation` 1.13.2).
  pub fn appearance_state(&self, id: &WorkspaceId) -> Result<AppearanceState, ApplicationFailure> {
    use unicode_segmentation::UnicodeSegmentation;
    let workspace = &self.state.workspaces[self.workspace_index(id)?];
    let grapheme_count = workspace
      .current_verse
      .as_ref()
      .map(|verse| u32::try_from(verse.text.graphemes(true).count()).unwrap_or(u32::MAX));
    let active_band = grapheme_count.and_then(|count| {
      workspace.appearance.bands.as_ref().and_then(|bands| {
        bands
          .iter()
          .position(|band| count >= band.lower && band.upper.is_none_or(|upper| count < upper))
          .and_then(|index| u32::try_from(index).ok())
      })
    });
    Ok(AppearanceState {
      appearance: workspace.appearance.clone(),
      grapheme_count,
      active_band,
      segmentation_version: "Unicode 17.0.0; unicode-segmentation 1.13.2".into(),
    })
  }

  /// Discarding interaction drafts never changes accepted appearance.
  /// # Errors
  /// Returns a missing workspace.
  pub fn discard_appearance(&self, id: &WorkspaceId) -> Result<Appearance, ApplicationFailure> {
    Ok(self.state.workspaces[self.workspace_index(id)?].appearance.clone())
  }
}

impl<S: WorkspaceStorage + AssetStorage> Application<S> {
  /// # Errors
  /// Rejects invalid typography/bands/assets atomically, preserving accepted settings.
  pub fn apply_appearance(
    &mut self,
    id: &WorkspaceId,
    mut appearance: Appearance,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    validate_appearance(id, &mut appearance)?;
    for background in &appearance.backgrounds {
      if let Some(asset_id) = &background.asset_id {
        if self.storage.managed_asset(asset_id).map_err(OperationError::Storage)?.is_none() {
          return Err(
            invalid_appearance(id, "The managed background asset is unavailable.").into(),
          );
        }
      }
      if !self
        .state
        .translations
        .iter()
        .any(|translation| translation.translation_id == background.translation_id)
        && !self.state.workspaces[index].appearance.backgrounds.iter().any(|previous| {
          previous.translation_id == background.translation_id && previous == background
        })
      {
        return Err(invalid_appearance(id, "The background translation is unavailable.").into());
      }
    }
    let mut proposal = self.state.workspaces.clone();
    proposal[index].appearance = appearance;
    let active = self.state.active_workspace_id.clone();
    self.persist_proposal(&proposal, &active)?;
    self.state.workspaces = proposal;
    Ok(())
  }
}

impl<S: AssetStorage> Application<S> {
  /// # Errors
  /// Returns typed invalid image or retained storage diagnostics.
  pub fn import_background_asset(
    &mut self,
    path: String,
  ) -> Result<ManagedAsset, OperationError<S::Error>> {
    self.storage.import_background_asset(&path)
  }

  /// # Errors
  /// Returns missing managed identity or retained storage diagnostics.
  pub fn managed_asset(
    &self,
    asset_id: &str,
  ) -> Result<ManagedAssetData, OperationError<S::Error>> {
    self.storage.managed_asset(asset_id).map_err(OperationError::Storage)?.ok_or_else(|| {
      ApplicationFailure::AssetRejected {
        message: "The managed background asset is unavailable.".into(),
        data: AssetData {
          asset_id: Some(asset_id.into()),
          reason: "unavailable".into(),
        },
      }
      .into()
    })
  }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AssetData {
  pub asset_id: Option<String>,
  pub reason: String,
}

fn invalid_appearance(id: &WorkspaceId, message: &str) -> ApplicationFailure {
  ApplicationFailure::InvalidAppearance {
    message: message.into(),
    data: WorkflowData {
      workspace_id: id.clone(),
      operation: "applyAppearance".into(),
    },
  }
}

fn canonical_color(value: &mut Option<String>) -> bool {
  if let Some(value) = value {
    if value.len() != 9
      || !value.starts_with('#')
      || !value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
    {
      return false;
    }
    value.make_ascii_uppercase();
  }
  true
}

fn validate_appearance(
  id: &WorkspaceId,
  appearance: &mut Appearance,
) -> Result<(), ApplicationFailure> {
  if appearance
    .font_family
    .as_ref()
    .is_some_and(|family| family.trim().is_empty() || family.len() > 512 || family.contains('\0'))
  {
    return Err(invalid_appearance(
      id,
      "Use a nonblank local font family of at most 512 UTF-8 bytes.",
    ));
  }
  if !canonical_color(&mut appearance.color) {
    return Err(invalid_appearance(id, "Use an RGBA8 color written as #RRGGBBAA."));
  }
  if let Some(bands) = &appearance.bands {
    if bands.is_empty() || bands.len() > 64 {
      return Err(invalid_appearance(id, "A configured profile needs 1–64 contiguous bands."));
    }
    let mut lower = 0;
    for (index, band) in bands.iter().enumerate() {
      if band.lower != lower
        || !band.font_size_px.is_finite()
        || band.font_size_px <= 0.0
        || band.font_size_px > 512.0
        || band.upper.is_some_and(|upper| upper <= band.lower)
        || (index + 1 == bands.len()) != band.upper.is_none()
      {
        return Err(invalid_appearance(id,"Bands must cover zero to an unbounded final range without gaps or overlaps, using sizes above zero and at most 512 CSS pixels."));
      }
      if let Some(upper) = band.upper {
        lower = upper;
      }
    }
  }
  let mut translations = Vec::new();
  for background in &mut appearance.backgrounds {
    if !canonical_color(&mut background.fallback_color)
      || translations.contains(&background.translation_id)
    {
      return Err(invalid_appearance(
        id,
        "Use one background per translation and RGBA8 fallback colors.",
      ));
    }
    translations.push(background.translation_id.clone());
  }
  Ok(())
}
