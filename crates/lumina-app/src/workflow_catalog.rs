//! Edition-bound navigation, explicit translation changes and reversible metadata.

use crate::{
  Application, ApplicationFailure, AudienceState, InformationCapture, LibraryStorage,
  NativeAudience, NavigationDirection, OperationError, ReferenceData, TranslationData,
  TranslationId, VerseActionKind, VerseActionResult, WorkflowData, WorkspaceId, WorkspaceStorage,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NavigationState {
  pub can_previous: bool,
  pub can_next: bool,
}

fn unavailable(id: &WorkspaceId, operation: &str, message: &str) -> ApplicationFailure {
  ApplicationFailure::WorkflowRejected {
    message: message.into(),
    data: WorkflowData {
      workspace_id: id.clone(),
      operation: operation.into(),
    },
  }
}

impl<S: LibraryStorage> Application<S> {
  /// # Errors
  /// Retains query failures; absent current/original edition returns no availability.
  pub fn navigation_state(
    &self,
    id: &WorkspaceId,
  ) -> Result<NavigationState, OperationError<S::Error>> {
    let workspace = &self.state.workspaces[self.workspace_index(id)?];
    let Some(verse) = &workspace.current_verse else {
      return Ok(NavigationState {
        can_previous: false,
        can_next: false,
      });
    };
    if !self.state.translations.iter().any(|translation| {
      translation.translation_id == verse.translation_id
        && translation.edition_id == verse.edition_id
    }) {
      return Ok(NavigationState {
        can_previous: false,
        can_next: false,
      });
    }
    let can_previous = self
      .storage
      .adjacent_verse(&verse.translation_id, verse.coordinate, NavigationDirection::Previous)
      .map_err(OperationError::Storage)?
      .is_some();
    let can_next = self
      .storage
      .adjacent_verse(&verse.translation_id, verse.coordinate, NavigationDirection::Next)
      .map_err(OperationError::Storage)?
      .is_some();
    Ok(NavigationState {
      can_previous,
      can_next,
    })
  }
}

impl<S: LibraryStorage + WorkspaceStorage> Application<S> {
  /// # Errors
  /// Rejects absent/current/boundary/retired editions without selecting another source.
  pub fn navigate(
    &mut self,
    id: &WorkspaceId,
    direction: NavigationDirection,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<VerseActionResult, OperationError<S::Error>> {
    let current = self.state.workspaces[self.workspace_index(id)?]
      .current_verse
      .clone()
      .ok_or_else(|| unavailable(id, "navigate", "Select a current verse before navigating."))?;
    if !self.state.translations.iter().any(|translation| {
      translation.translation_id == current.translation_id
        && translation.edition_id == current.edition_id
    }) {
      return Err(
        ApplicationFailure::TranslationUnavailable {
          message: "The original translation edition is unavailable; this is a Saved copy.".into(),
          data: TranslationData {
            translation_id: current.translation_id,
          },
        }
        .into(),
      );
    }
    let verse = self
      .storage
      .adjacent_verse(&current.translation_id, current.coordinate, direction)
      .map_err(OperationError::Storage)?
      .ok_or_else(|| {
        unavailable(id, "navigate", "No adjacent verse is available in this original edition.")
      })?;
    self.send_verse(id, verse, VerseActionKind::Navigation, false, now_ms, native)
  }

  /// Change the numbered current reference only; future lookup selection is independent.
  /// # Errors
  /// Missing target coordinates preserve current content, information mode and output.
  pub fn change_translation(
    &mut self,
    id: &WorkspaceId,
    translation_id: TranslationId,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<VerseActionResult, OperationError<S::Error>> {
    let coordinate = self.state.workspaces[self.workspace_index(id)?]
      .current_verse
      .as_ref()
      .ok_or_else(|| {
        unavailable(
          id,
          "changeTranslation",
          "Select a current verse before changing its translation.",
        )
      })?
      .coordinate;
    if !self
      .state
      .translations
      .iter()
      .any(|translation| translation.translation_id == translation_id)
    {
      return Err(
        ApplicationFailure::TranslationUnavailable {
          message: "The target translation is unavailable.".into(),
          data: TranslationData {
            translation_id,
          },
        }
        .into(),
      );
    }
    let verse = self
      .storage
      .resolve_reference(&translation_id, coordinate)
      .map_err(OperationError::Storage)?
      .ok_or_else(|| ApplicationFailure::ReferenceUnavailable {
        message: "The target edition has no verse at this numbered coordinate.".into(),
        data: ReferenceData {
          translation_id,
          coordinate,
        },
      })?;
    self.send_verse(id, verse, VerseActionKind::ChangeTranslation, false, now_ms, native)
  }

  /// # Errors
  /// Requires eligible captured metadata and never opens or unblanks an audience.
  /// Valid visible return to a retained verse records history on exact confirmation.
  pub fn set_information_mode(
    &mut self,
    id: &WorkspaceId,
    enabled: bool,
    book_number: Option<i32>,
    now_ms: f64,
    native: &mut impl NativeAudience,
  ) -> Result<Option<VerseActionResult>, OperationError<S::Error>> {
    let index = self.workspace_index(id)?;
    if !enabled {
      if !self.state.workspaces[index].book_information_mode {
        return Ok(None);
      }
      if self.state.workspaces[index].audience == AudienceState::Live {
        if let Some(verse) = self.state.workspaces[index].current_verse.clone() {
          let background = self.state.workspaces[index].current_background.clone();
          return self
            .send_captured_verse(
              id,
              crate::workflow::CapturedVerse {
                verse,
                background,
              },
              VerseActionKind::InformationReturn,
              true,
              now_ms,
              native,
            )
            .map(Some);
        }
        self.state.workspaces[index].book_information_mode = false;
        self.blank_audience(id, native)?;
      } else {
        self.state.workspaces[index].book_information_mode = false;
      }
      return Ok(None);
    }
    let workspace = &self.state.workspaces[index];
    let (translation_id, edition_id, book_number) = if let Some(verse) = &workspace.current_verse {
      (verse.translation_id.clone(), Some(verse.edition_id.clone()), verse.coordinate.book_number)
    } else {
      (
        workspace.settings.selected_translation_id.clone(),
        None,
        book_number.ok_or_else(|| {
          unavailable(
            id,
            "informationMode",
            "Choose a book explicitly when no current verse exists.",
          )
        })?,
      )
    };
    // Existing captures survive source deletion. Never attach metadata from a
    // newly imported edition merely because it has the same title or book.
    let retained = workspace
      .information
      .as_ref()
      .filter(|information| {
        information.translation_id == translation_id
          && edition_id.as_ref().is_none_or(|edition| edition == &information.edition_id)
          && information.book_number == book_number
      })
      .cloned();
    let information = if self.state.translations.iter().any(|translation| {
      translation.translation_id == translation_id
        && edition_id.as_ref().is_none_or(|edition| edition == &translation.edition_id)
    }) {
      let information = self
        .storage
        .books(&translation_id)
        .map_err(OperationError::Storage)?
        .into_iter()
        .find(|information| information.book_number == book_number && information.eligible())
        .ok_or_else(|| {
          unavailable(
            id,
            "informationMode",
            "This book has no usable author, writing date or writing location.",
          )
        })?;
      let background = workspace
        .appearance
        .backgrounds
        .iter()
        .find(|background| background.translation_id == information.translation_id)
        .cloned();
      capture_information(information, background)
    } else {
      retained.ok_or_else(|| {
        unavailable(
          id,
          "informationMode",
          "The original metadata source is unavailable and no Saved copy was captured.",
        )
      })?
    };
    self.state.workspaces[index].information = Some(information);
    self.state.workspaces[index].book_information_mode = true;
    self.refresh_audience(id, native)?;
    Ok(None)
  }
}

fn capture_information(
  information: crate::BookInformation,
  background: Option<crate::TranslationBackground>,
) -> InformationCapture {
  InformationCapture {
    translation_id: information.translation_id,
    edition_id: information.edition_id,
    translation_title: information.translation_title,
    book_number: information.book_number,
    name: information.name,
    author: information.author,
    writing_date: information.writing_date,
    writing_location: information.writing_location,
    metadata_attribution: information.metadata_attribution,
    metadata_source_url: information.metadata_source_url,
    metadata_rights_notice: information.metadata_rights_notice,
    background,
  }
}
