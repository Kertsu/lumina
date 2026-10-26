//! Shared library contracts; accepted Bible content never depends on UI state.

use crate::{
  Application, ApplicationFailure, AudienceState, EditionId, OperationError, ReferenceResult,
  ResolvedVerse, Storage, Translation, TranslationId, VerseCoordinate, WorkspaceData, WorkspaceId,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum NavigationDirection {
  Previous,
  Next,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BookInformation {
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
}

impl BookInformation {
  #[must_use]
  pub fn eligible(&self) -> bool {
    [&self.author, &self.writing_date, &self.writing_location]
      .iter()
      .any(|field| field.as_ref().is_some_and(|value| !value.trim().is_empty()))
  }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum SearchMode {
  AllWords,
  Phrase,
  WordStarts,
  ContainsText,
}
#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum SearchOrder {
  BestMatch,
  BibleOrder,
}
#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum SearchScope {
  EntireBible,
  OldTestament,
  NewTestament,
  Moses,
  Gospels,
  EpistlesOfPaul,
  Book(i32),
}
impl SearchScope {
  #[must_use]
  pub fn includes(self, book: i32) -> bool {
    match self {
      Self::EntireBible => (1..=66).contains(&book),
      Self::OldTestament => (1..=39).contains(&book),
      Self::NewTestament => (40..=66).contains(&book),
      Self::Moses => (1..=5).contains(&book),
      Self::Gospels => (40..=43).contains(&book),
      Self::EpistlesOfPaul => (45..=57).contains(&book),
      Self::Book(number) => book == number,
    }
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
  pub workspace_id: WorkspaceId,
  pub translation_id: TranslationId,
  pub request_id: String,
  pub query: String,
  pub mode: SearchMode,
  pub scope: SearchScope,
  pub order: SearchOrder,
  pub page: u32,
  pub page_size: u32,
  pub library_revision: Option<u32>,
}
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HighlightRange {
  pub start: u32,
  pub end: u32,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
  pub verse: ResolvedVerse,
  pub highlights: Vec<HighlightRange>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
  pub workspace_id: WorkspaceId,
  pub translation_id: TranslationId,
  pub edition_id: EditionId,
  pub request_id: String,
  pub library_revision: u32,
  pub query: String,
  pub mode: SearchMode,
  pub scope: SearchScope,
  pub order: SearchOrder,
  pub page: u32,
  pub page_size: u32,
  pub total: u32,
  pub new_testament_page: Option<u32>,
  pub broader_match: bool,
  pub highlight_encoding: String,
  pub results: Vec<SearchHit>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportTranslationSummary {
  pub title: String,
  pub description: String,
  pub edition_label: Option<String>,
  pub source_name: Option<String>,
  pub source_url: Option<String>,
  pub rights_notice: Option<String>,
  pub book_count: u32,
  pub verse_count: u32,
  pub books: Vec<ImportBookCoverage>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportBookCoverage {
  pub book_number: i32,
  pub name: String,
  pub chapters: Vec<ImportChapterCoverage>,
  pub author: Option<String>,
  pub writing_date: Option<String>,
  pub writing_location: Option<String>,
  pub metadata_attribution: Option<String>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportChapterCoverage {
  pub chapter: i32,
  pub verse_count: u32,
}

/// Validated staging data stays outside generated IPC. Desktop parses it away from
/// the application's serialized workflow lock, then registers it for review.
#[derive(Clone, Debug)]
pub struct StagedImport {
  pub filename: String,
  pub translations: Vec<StagedTranslation>,
  pub books: Vec<StagedBook>,
  pub verses: Vec<StagedVerse>,
  pub warnings: Vec<String>,
}
#[derive(Clone, Debug)]
pub struct StagedTranslation {
  pub id: i64,
  pub title: String,
  pub description: String,
  pub edition_label: Option<String>,
  pub source_name: Option<String>,
  pub source_url: Option<String>,
  pub rights_notice: Option<String>,
}
#[derive(Clone, Debug)]
pub struct StagedBook {
  pub id: i64,
  pub translation_id: i64,
  pub book_number: i32,
  pub name: String,
  pub author: Option<String>,
  pub writing_date: Option<String>,
  pub writing_location: Option<String>,
  pub metadata_attribution: Option<String>,
  pub metadata_source_url: Option<String>,
  pub metadata_rights_notice: Option<String>,
}
#[derive(Clone, Debug)]
pub struct StagedVerse {
  pub translation_id: i64,
  pub book_id: i64,
  pub chapter: i32,
  pub verse: i32,
  pub text: String,
  pub sort_order: i64,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportReview {
  pub token: String,
  pub filename: String,
  pub translations: Vec<ImportTranslationSummary>,
  pub warnings: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
  pub translations: Vec<Translation>,
  pub filename: String,
  pub translation_ids: Vec<TranslationId>,
  pub library_revision: u32,
}
#[derive(Clone, Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceInputRequest {
  pub workspace_id: WorkspaceId,
  pub translation_id: Option<TranslationId>,
  pub input: String,
  pub choice: Option<i32>,
  pub choice_token: Option<String>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BookAlias {
  pub book_number: i32,
  pub name: String,
  pub aliases: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceAmbiguity {
  pub workspace_id: WorkspaceId,
  pub translation_id: TranslationId,
  pub edition_id: EditionId,
  pub input: String,
  pub candidates: Vec<BookAlias>,
  pub choice_token: String,
}
#[derive(Clone, Debug, Serialize, Type)]
#[serde(tag = "status", content = "data", rename_all = "camelCase")]
pub enum ReferenceInputResult {
  Resolved(ReferenceResult),
  Ambiguous(ReferenceAmbiguity),
}
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogFailureData {
  pub field: String,
  pub reason: String,
}

/// Persistence capabilities used by library workflows. All publication is atomic.
#[allow(clippy::missing_errors_doc)]
pub trait LibraryStorage: Storage {
  fn library_revision(&self) -> Result<u32, Self::Error>;
  fn list_translations(&self) -> Result<Vec<Translation>, Self::Error>;
  fn books(&self, translation_id: &TranslationId) -> Result<Vec<BookInformation>, Self::Error>;
  fn chapter_verses(
    &self,
    translation_id: &TranslationId,
    book_number: i32,
    chapter: i32,
  ) -> Result<Vec<ResolvedVerse>, Self::Error>;
  fn adjacent_verse(
    &self,
    translation_id: &TranslationId,
    coordinate: VerseCoordinate,
    direction: NavigationDirection,
  ) -> Result<Option<ResolvedVerse>, Self::Error>;
  fn search_verses(
    &self,
    request: &SearchRequest,
  ) -> Result<SearchResult, OperationError<Self::Error>>;
  fn resolve_input(
    &self,
    request: &ReferenceInputRequest,
    translation_id: &TranslationId,
  ) -> Result<ReferenceInputResult, OperationError<Self::Error>>;
  fn register_import(
    &mut self,
    staged: StagedImport,
  ) -> Result<ImportReview, OperationError<Self::Error>>;
  fn review_import(&mut self, path: &str) -> Result<ImportReview, OperationError<Self::Error>>;
  fn commit_import(&mut self, token: &str) -> Result<ImportResult, OperationError<Self::Error>>;
  fn cancel_import(&mut self, token: &str);
  fn delete_translation(
    &mut self,
    translation_id: &TranslationId,
  ) -> Result<Vec<Translation>, OperationError<Self::Error>>;
}

// Owned operation requests cross the asynchronous desktop execution boundary.
#[allow(clippy::missing_errors_doc, clippy::needless_pass_by_value)]
impl<S: LibraryStorage> Application<S> {
  pub fn resolve_reference_input(
    &self,
    request: ReferenceInputRequest,
  ) -> Result<ReferenceInputResult, OperationError<S::Error>> {
    let workspace = self.catalog_workspace(&request.workspace_id)?;
    let translation =
      request.translation_id.as_ref().unwrap_or(&workspace.settings.selected_translation_id);
    self.storage.resolve_input(&request, translation)
  }
  pub fn search(&self, request: SearchRequest) -> Result<SearchResult, OperationError<S::Error>> {
    self.catalog_workspace(&request.workspace_id)?;
    self.storage.search_verses(&request)
  }
  pub fn resolve_verse(
    &self,
    translation_id: TranslationId,
    edition_id: Option<EditionId>,
    coordinate: VerseCoordinate,
  ) -> Result<ResolvedVerse, OperationError<S::Error>> {
    coordinate.validate().map_err(|field| ApplicationFailure::InvalidReference {
      message: "Use positive native coordinates and book 1–66.".into(),
      data: crate::InvalidReferenceData {
        coordinate,
        field,
      },
    })?;
    let translation = self
      .state
      .translations
      .iter()
      .find(|translation| {
        translation.translation_id == translation_id
          && edition_id.as_ref().is_none_or(|edition| edition == &translation.edition_id)
      })
      .ok_or_else(|| ApplicationFailure::TranslationUnavailable {
        message: "The original installed edition is unavailable.".into(),
        data: crate::TranslationData {
          translation_id: translation_id.clone(),
        },
      })?;
    self
      .storage
      .resolve_reference(&translation.translation_id, coordinate)
      .map_err(OperationError::Storage)?
      .ok_or_else(|| {
        ApplicationFailure::ReferenceUnavailable {
          message: "This native coordinate is unavailable in the selected edition.".into(),
          data: crate::ReferenceData {
            translation_id,
            coordinate,
          },
        }
        .into()
      })
  }
  pub fn chapter_verses(
    &self,
    translation_id: TranslationId,
    book_number: i32,
    chapter: i32,
  ) -> Result<Vec<ResolvedVerse>, OperationError<S::Error>> {
    self
      .storage
      .chapter_verses(&translation_id, book_number, chapter)
      .map_err(OperationError::Storage)
  }
  pub fn library_revision(&self) -> Result<u32, OperationError<S::Error>> {
    self.storage.library_revision().map_err(OperationError::Storage)
  }
  pub fn register_import(
    &mut self,
    staged: StagedImport,
  ) -> Result<ImportReview, OperationError<S::Error>> {
    self.storage.register_import(staged)
  }
  pub fn list_books(
    &self,
    translation_id: TranslationId,
  ) -> Result<Vec<BookInformation>, OperationError<S::Error>> {
    self.storage.books(&translation_id).map_err(OperationError::Storage)
  }
  pub fn review_import(&mut self, path: String) -> Result<ImportReview, OperationError<S::Error>> {
    self.storage.review_import(&path)
  }
  pub fn commit_import(&mut self, token: String) -> Result<ImportResult, OperationError<S::Error>> {
    let result = self.storage.commit_import(&token)?;
    self.state.translations.clone_from(&result.translations);
    Ok(result)
  }
  pub fn cancel_import(&mut self, token: String) {
    self.storage.cancel_import(&token);
  }
  pub fn delete_imported_translation(
    &mut self,
    workspace_id: WorkspaceId,
    translation_id: TranslationId,
    confirmed: bool,
  ) -> Result<(), OperationError<S::Error>> {
    self.catalog_workspace(&workspace_id)?;
    if !confirmed {
      return Err(
        ApplicationFailure::ConfirmationRequired {
          message: "Confirm deletion of this installed translation.".into(),
          data: CatalogFailureData {
            field: "translationId".into(),
            reason: translation_id.0.clone(),
          },
        }
        .into(),
      );
    }
    if self.state.workspaces.iter().any(|workspace| workspace.audience != AudienceState::Closed) {
      return Err(
        ApplicationFailure::AudiencesOpen {
          message: "Close every audience before deleting a translation.".into(),
          data: CatalogFailureData {
            field: "audience".into(),
            reason: "open".into(),
          },
        }
        .into(),
      );
    }
    self.state.translations = self.storage.delete_translation(&translation_id)?;
    if let Some(web) = self.state.translations.iter().find(|translation| translation.bundled) {
      for workspace in &mut self.state.workspaces {
        if workspace.settings.selected_translation_id == translation_id {
          workspace.settings.selected_translation_id = web.translation_id.clone();
        }
      }
    }
    Ok(())
  }
  pub fn book_information(
    &self,
    workspace_id: WorkspaceId,
    book_number: Option<i32>,
  ) -> Result<Option<BookInformation>, OperationError<S::Error>> {
    let workspace = self.catalog_workspace(&workspace_id)?;
    let (translation_id, number) = if let Some(verse) = &workspace.current_verse {
      (&verse.translation_id, verse.coordinate.book_number)
    } else {
      (
        &workspace.settings.selected_translation_id,
        book_number.ok_or_else(|| ApplicationFailure::InvalidReferenceInput {
          message: "Choose a book to inspect its information.".into(),
          data: CatalogFailureData {
            field: "bookNumber".into(),
            reason: "required".into(),
          },
        })?,
      )
    };
    Ok(
      self
        .storage
        .books(translation_id)
        .map_err(OperationError::Storage)?
        .into_iter()
        .find(|book| book.book_number == number),
    )
  }
  fn catalog_workspace(
    &self,
    workspace_id: &WorkspaceId,
  ) -> Result<&crate::Workspace, OperationError<S::Error>> {
    self
      .state
      .workspaces
      .iter()
      .find(|workspace| &workspace.workspace_id == workspace_id)
      .ok_or_else(|| {
        ApplicationFailure::WorkspaceNotFound {
          message: "The operator workspace is unavailable.".into(),
          data: WorkspaceData {
            workspace_id: workspace_id.clone(),
          },
        }
        .into()
      })
  }
}
