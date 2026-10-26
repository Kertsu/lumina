//! Startup/reference contracts shared by storage, application, and generated IPC.

use crate::{Appearance, AudienceOwner, HistoryEntry, InformationCapture, PreviewCandidate};
use lumina_core::{EditionId, TranslationId, VerseCoordinate, WorkspaceId};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Translation {
  pub translation_id: TranslationId,
  pub edition_id: EditionId,
  pub title: String,
  pub description: String,
  pub bundled: bool,
  pub book_count: u32,
  pub verse_count: u32,
  pub source: TranslationSource,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranslationSource {
  pub publisher_edition_id: Option<String>,
  pub artifact_sha256: Option<String>,
  pub edition_label: Option<String>,
  pub source_name: Option<String>,
  pub source_url: Option<String>,
  pub rights_notice: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
  pub name: String,
  pub selected_translation_id: TranslationId,
  pub hide_cursor: bool,
}

/// Durable startup values, without audience ownership or captured runtime content.
pub struct StoredWorkspace {
  pub workspace_id: WorkspaceId,
  pub settings: WorkspaceSettings,
}

pub struct StoredState {
  pub translations: Vec<Translation>,
  pub workspaces: Vec<StoredWorkspace>,
  pub active_workspace_id: WorkspaceId,
}

#[derive(Clone, Debug, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationSnapshot {
  pub translations: Vec<Translation>,
  pub workspaces: Vec<Workspace>,
  pub active_workspace_id: WorkspaceId,
}

#[derive(Clone, Debug, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
  pub workspace_id: WorkspaceId,
  pub settings: WorkspaceSettings,
  pub current_verse: Option<ResolvedVerse>,
  pub book_information_mode: bool,
  pub audience: AudienceState,
  pub owner: Option<AudienceOwner>,
  pub output_revision: u32,
  pub output_action_id: Option<String>,
  pub preview: Option<PreviewCandidate>,
  pub history: Vec<HistoryEntry>,
  pub appearance: Appearance,
  pub information: Option<InformationCapture>,
  pub fullscreen: bool,
  pub always_on_top: bool,
}

/// Audience creation belongs to the subsequent native lifecycle feature.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AudienceState {
  Closed,
  Blank,
  Live,
}

#[derive(Clone, Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceRequest {
  pub workspace_id: WorkspaceId,
  pub coordinate: VerseCoordinate,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceResult {
  pub workspace_id: WorkspaceId,
  pub verse: ResolvedVerse,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedVerse {
  pub translation_id: TranslationId,
  pub edition_id: EditionId,
  pub translation_title: String,
  pub book_name: String,
  pub coordinate: VerseCoordinate,
  pub text: String,
}
