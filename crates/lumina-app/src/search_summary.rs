//! Captured word-search results and temporary audience presentation.

use crate::{
  Application, ApplicationFailure, AudienceState, LibraryStorage, NativeAudience, OperationError,
  SearchMode, SearchRequest, SearchResult, SearchScope, TranslationId, VerseActionKind,
  WorkspaceId, WorkspaceStorage,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchSummary {
  pub translation_id: TranslationId,
  pub translation_title: String,
  pub query: String,
  pub scope: SearchScope,
  pub book_name: Option<String>,
  pub mode: SearchMode,
  pub total: u32,
  pub pages: u32,
}

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchWithSummary {
  pub candidate_id: String,
  pub result: SearchResult,
  pub summary: SearchSummary,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct SearchSummaryCandidate {
  candidate_id: String,
  summary: SearchSummary,
}

#[derive(Clone, Debug, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchSummaryProjection {
  pub summary: SearchSummary,
  #[serde(skip)]
  pub(crate) return_to_blank: bool,
}

impl<S: LibraryStorage> Application<S> {
  /// Capture summary facts from the same accepted search the operator sees.
  ///
  /// # Errors
  /// Returns search or catalog failures without replacing the previous candidate.
  pub fn search_with_summary(
    &mut self,
    request: SearchRequest,
    visible_candidate_id: Option<&str>,
  ) -> Result<SearchWithSummary, OperationError<S::Error>> {
    let result = self.search(request)?;
    let index = self.workspace_index(&result.workspace_id)?;
    let translation = self
      .state
      .translations
      .iter()
      .find(|translation| translation.translation_id == result.translation_id)
      .ok_or_else(|| ApplicationFailure::TranslationUnavailable {
        message: "The searched translation is unavailable.".into(),
        data: crate::TranslationData {
          translation_id: result.translation_id.clone(),
        },
      })?;
    let book_name = if let SearchScope::Book(number) = result.scope {
      self
        .storage
        .books(&result.translation_id)
        .map_err(OperationError::Storage)?
        .into_iter()
        .find(|book| book.book_number == number)
        .map(|book| book.name)
    } else {
      None
    };
    let summary = SearchSummary {
      translation_id: result.translation_id.clone(),
      translation_title: translation.title.clone(),
      query: result.query.clone(),
      scope: result.scope,
      book_name,
      mode: result.mode,
      total: result.total,
      pages: result.total.div_ceil(result.page_size),
    };
    let candidate_id = self.identity("search-summary");
    // Preserve the displayed capture if this response is superseded or rejected by the desk.
    let candidates = &mut self.state.workspaces[index].search_summary_candidates;
    candidates.retain(|candidate| Some(candidate.candidate_id.as_str()) == visible_candidate_id);
    candidates.push(SearchSummaryCandidate {
      candidate_id: candidate_id.clone(),
      summary: summary.clone(),
    });
    Ok(SearchWithSummary {
      candidate_id,
      result,
      summary,
    })
  }
}

impl<S: WorkspaceStorage> Application<S> {
  /// # Errors
  /// Requires an accepted search in the active workspace and an open audience.
  pub fn project_search_summary(
    &mut self,
    id: &WorkspaceId,
    candidate_id: &str,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if self.state.active_workspace_id != *id {
      return Err(
        crate::workflow::rejection(
          id,
          "projectSearchSummary",
          "Activate the originating workspace before sending the summary.",
        )
        .into(),
      );
    }
    self.audience_output(id)?;
    let workspace = &mut self.state.workspaces[index];
    let candidate = workspace
      .search_summary_candidates
      .iter()
      .find(|candidate| {
        candidate.candidate_id == candidate_id
          && candidate.summary.translation_id == workspace.settings.selected_translation_id
      })
      .ok_or_else(|| {
        crate::workflow::rejection(
          id,
          "projectSearchSummary",
          "This search summary is no longer available.",
        )
      })?;
    let return_to_blank = workspace
      .search_summary_projection
      .as_ref()
      .map_or(workspace.audience == AudienceState::Blank, |live| live.return_to_blank);
    workspace.search_summary_projection = Some(SearchSummaryProjection {
      summary: candidate.summary.clone(),
      return_to_blank,
    });
    workspace.audience = AudienceState::Live;
    self.refresh_audience(id, native)
  }

  /// # Errors
  /// Reports native delivery failures while preserving the accepted return state.
  pub fn return_from_search_summary(
    &mut self,
    id: &WorkspaceId,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<(), OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    let workspace = &mut self.state.workspaces[index];
    let Some(projection) = &workspace.search_summary_projection else {
      return Ok(());
    };
    if workspace.audience == AudienceState::Live {
      if projection.return_to_blank {
        workspace.audience = AudienceState::Blank;
      } else if !workspace.book_information_mode {
        if let Some(verse) = workspace.current_verse.clone() {
          let capture = crate::workflow::CapturedVerse {
            verse,
            background: workspace.current_background.clone(),
          };
          return self
            .send_captured_verse(
              id,
              capture,
              VerseActionKind::SearchSummaryReturn,
              true,
              now_ms,
              native,
            )
            .map(|_| ());
        }
      }
    }
    workspace.search_summary_projection = None;
    self.refresh_audience(id, native)
  }
}
