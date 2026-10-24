//! Domain types and pure rules.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Stable installed identity, independent of workspace name or position.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(transparent)]
pub struct WorkspaceId(pub String);

/// Stable installed identity, independent of title or source-local IDs.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(transparent)]
pub struct TranslationId(pub String);

/// Identifies the original installed text captured by a verse.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(transparent)]
pub struct EditionId(pub String);

/// Native coordinates within a selected edition; WEB never supplies their bounds.
#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct VerseCoordinate {
  pub book_number: i32,
  pub chapter: i32,
  pub verse: i32,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum CoordinateField {
  BookNumber,
  Chapter,
  Verse,
}

impl VerseCoordinate {
  /// Validate canonical book identity and positive native numbering.
  ///
  /// # Errors
  /// Identifies the invalid coordinate field without consulting another edition.
  pub fn validate(self) -> Result<(), CoordinateField> {
    if !(1..=66).contains(&self.book_number) {
      return Err(CoordinateField::BookNumber);
    }
    if self.chapter <= 0 {
      return Err(CoordinateField::Chapter);
    }
    if self.verse <= 0 {
      return Err(CoordinateField::Verse);
    }
    Ok(())
  }
}
