use crate::{SqliteStorage, StorageError};
use lumina_app::{
  ApplicationFailure, BookAlias, CatalogFailureData, LibraryStorage, OperationError,
  ReferenceAmbiguity, ReferenceData, ReferenceInputRequest, ReferenceInputResult, ReferenceResult,
  Storage, TranslationData, TranslationId, VerseCoordinate,
};

pub(crate) fn aliases() -> Vec<BookAlias> {
  include_str!("book-aliases.tsv")
    .lines()
    .filter_map(|line| {
      let fields: Vec<_> = line.split('\t').collect();
      Some(BookAlias {
        book_number: fields.first()?.parse().ok()?,
        name: fields.get(1)?.to_string(),
        aliases: fields
          .iter()
          .skip(1)
          .flat_map(|field| field.split(';'))
          .map(str::trim)
          .map(str::to_string)
          .collect(),
      })
    })
    .collect()
}
fn name(input: &str) -> String {
  let normalized = crate::search::normalize(input);
  let mut parts: Vec<_> =
    normalized.split_whitespace().map(|word| word.trim_end_matches('.').to_string()).collect();
  if let Some(first) = parts.first_mut() {
    *first = match first.as_str() {
      "i" => "1".into(),
      "ii" => "2".into(),
      "iii" => "3".into(),
      _ => first.clone(),
    };
    if first.starts_with(['1', '2', '3']) && first.chars().nth(1).is_some_and(char::is_alphabetic) {
      first.insert(1, ' ');
    }
  }
  parts.join(" ")
}
fn malformed() -> ApplicationFailure {
  ApplicationFailure::InvalidReferenceInput {
    message: "Enter a full book, chapter and verse, such as John 3:16.".into(),
    data: CatalogFailureData {
      field: "input".into(),
      reason: "malformed reference".into(),
    },
  }
}

fn parse_input(input: &str) -> Result<(&str, i32, i32), OperationError<StorageError>> {
  let input = input.trim();
  let (left, right) = input.rsplit_once(':').ok_or_else(malformed)?;
  let right = right.trim();
  if right.is_empty() || !right.chars().all(|c| c.is_ascii_digit()) {
    return Err(malformed().into());
  }
  let left = left.trim_end();
  let chapter_start = left
    .char_indices()
    .rev()
    .find(|(_, c)| !c.is_ascii_digit())
    .map_or(0, |(index, c)| index + c.len_utf8());
  let book_input = left[..chapter_start].trim();
  if book_input.is_empty()
    || book_input.ends_with('-')
    || book_input.contains(':')
    || book_input.chars().any(|c| {
      !(c.is_alphabetic() || c.is_ascii_digit() || c.is_whitespace() || matches!(c, '.' | '-'))
    })
  {
    return Err(malformed().into());
  }
  let chapter: i32 = left[chapter_start..].parse().map_err(|_| malformed())?;
  let verse: i32 = right.parse().map_err(|_| malformed())?;
  if chapter <= 0 || verse <= 0 {
    return Err(malformed().into());
  }
  Ok((book_input, chapter, verse))
}
fn candidates(
  storage: &SqliteStorage,
  translation_id: &TranslationId,
  book_input: &str,
) -> Result<(Vec<BookAlias>, Vec<lumina_app::BookInformation>), OperationError<StorageError>> {
  let normalized = name(book_input);
  let books = storage.books(translation_id).map_err(OperationError::Storage)?;
  let catalog = aliases();
  let mut candidates: Vec<_> = catalog
    .iter()
    .filter(|book| book.aliases.iter().any(|alias| name(alias) == normalized))
    .cloned()
    .collect();
  for book in &books {
    if name(&book.name) == normalized
      && !candidates.iter().any(|candidate| candidate.book_number == book.book_number)
    {
      candidates.push(BookAlias {
        book_number: book.book_number,
        name: book.name.clone(),
        aliases: vec![book.name.clone()],
      });
    }
  }
  candidates.sort_by_key(|candidate| candidate.book_number);
  if candidates.is_empty() {
    return Err(
      ApplicationFailure::UnknownBook {
        message: "This book name is not a documented alias or a name in the selected edition."
          .into(),
        data: CatalogFailureData {
          field: "book".into(),
          reason: book_input.into(),
        },
      }
      .into(),
    );
  }
  Ok((candidates, books))
}
pub(crate) fn resolve(
  storage: &SqliteStorage,
  request: &ReferenceInputRequest,
  translation_id: &TranslationId,
) -> Result<ReferenceInputResult, OperationError<StorageError>> {
  let translation = storage
    .list_translations()
    .map_err(OperationError::Storage)?
    .into_iter()
    .find(|translation| &translation.translation_id == translation_id)
    .ok_or_else(|| ApplicationFailure::TranslationUnavailable {
      message: "The selected translation is unavailable.".into(),
      data: TranslationData {
        translation_id: translation_id.clone(),
      },
    })?;
  let (book_input, chapter, verse) = parse_input(&request.input)?;
  let (candidates, books) = candidates(storage, translation_id, book_input)?;
  let token = format!("{}:{}:{}", request.workspace_id.0, translation.edition_id.0, request.input);
  let chosen = if candidates.len() == 1 && request.choice.is_none() {
    candidates[0].book_number
  } else if let Some(choice) = request.choice {
    if request.choice_token.as_deref() != Some(&token)
      || !candidates.iter().any(|candidate| candidate.book_number == choice)
    {
      return Err(
        ApplicationFailure::StaleReferenceChoice {
          message:
            "This book choice belongs to an older reference or edition. Submit the reference again."
              .into(),
          data: CatalogFailureData {
            field: "choice".into(),
            reason: "stale or mismatched".into(),
          },
        }
        .into(),
      );
    }
    choice
  } else {
    return Ok(ReferenceInputResult::Ambiguous(ReferenceAmbiguity {
      workspace_id: request.workspace_id.clone(),
      translation_id: translation_id.clone(),
      edition_id: translation.edition_id,
      input: request.input.clone(),
      candidates,
      choice_token: token,
    }));
  };
  if !books.iter().any(|book| book.book_number == chosen) {
    return Err(
      ApplicationFailure::BookUnavailable {
        message: "The selected edition does not contain this book.".into(),
        data: CatalogFailureData {
          field: "bookNumber".into(),
          reason: chosen.to_string(),
        },
      }
      .into(),
    );
  }
  let coordinate = VerseCoordinate {
    book_number: chosen,
    chapter,
    verse,
  };
  let resolved = storage
    .resolve_reference(translation_id, coordinate)
    .map_err(OperationError::Storage)?
    .ok_or_else(|| ApplicationFailure::ReferenceUnavailable {
      message: "This native coordinate is unavailable in the selected edition.".into(),
      data: ReferenceData {
        translation_id: translation_id.clone(),
        coordinate,
      },
    })?;
  Ok(ReferenceInputResult::Resolved(ReferenceResult {
    workspace_id: request.workspace_id.clone(),
    verse: resolved,
  }))
}
