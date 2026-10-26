use crate::StorageError;
use lumina_app::{
  ApplicationFailure, CatalogFailureData, EditionId, HighlightRange, LibraryStorage,
  OperationError, SearchHit, SearchMode, SearchOrder, SearchRequest, SearchResult,
};
use rusqlite::{params, Transaction};
use unicode_casefold::UnicodeCaseFold;
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};
use unicode_segmentation::UnicodeSegmentation;

/// NFD, full non-Turkic case folding and apostrophe equivalence. Newer simple
/// lowercase mappings come from the pinned Rust toolchain. Whitespace is literal.
pub(crate) fn normalize(value: &str) -> String {
  value
    .nfd()
    .flat_map(char::to_lowercase)
    .case_fold()
    .nfd()
    .filter(|character| !is_combining_mark(*character))
    .map(|character| match character {
      '’' | '‘' | 'ʼ' => '\'',
      _ => character,
    })
    .collect()
}

pub(crate) fn index_missing(connection: &Transaction<'_>) -> rusqlite::Result<()> {
  let rows = connection
    .prepare("SELECT id, text FROM verses WHERE id NOT IN (SELECT verse_id FROM verse_search)")?
    .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))?
    .collect::<rusqlite::Result<Vec<_>>>()?;
  let mut insert =
    connection.prepare("INSERT INTO verse_search(verse_id, normalized) VALUES (?1, ?2)")?;
  for (id, text) in rows {
    insert.execute(params![id, normalize(&text)])?;
  }
  Ok(())
}

struct Word<'a> {
  text: &'a str,
  start: usize,
  end: usize,
}
fn words(value: &str) -> Vec<Word<'_>> {
  let chars: Vec<_> = value.char_indices().collect();
  let mut spans = Vec::new();
  let mut begin = None;
  for (index, &(offset, character)) in chars.iter().enumerate() {
    let internal = character == '\''
      && index > 0
      && chars[index - 1].1.is_alphanumeric()
      && chars.get(index + 1).is_some_and(|(_, c)| c.is_alphanumeric());
    if character.is_alphanumeric() || internal {
      begin.get_or_insert(offset);
    } else if let Some(start) = begin.take() {
      spans.push(Word {
        text: &value[start..offset],
        start,
        end: offset,
      });
    }
  }
  if let Some(start) = begin {
    spans.push(Word {
      text: &value[start..],
      start,
      end: value.len(),
    });
  }
  spans
}

fn matched_ranges(value: &str, query: &str, mode: SearchMode) -> Vec<(usize, usize)> {
  if mode == SearchMode::ContainsText {
    let mut ranges = Vec::new();
    for (start, _) in value.char_indices() {
      if value[start..].starts_with(query) {
        ranges.push((start, start + query.len()));
      }
    }
    return ranges;
  }
  let requested = words(query);
  let available = words(value);
  if requested.is_empty() {
    return Vec::new();
  }
  if mode == SearchMode::Phrase {
    return available
      .windows(requested.len())
      .filter(|window| {
        window.iter().zip(&requested).all(|(actual, wanted)| actual.text == wanted.text)
      })
      .map(|window| (window[0].start, window[window.len() - 1].end))
      .collect();
  }
  let matches = |actual: &str, wanted: &str| {
    if mode == SearchMode::WordStarts {
      actual.starts_with(wanted)
    } else {
      actual == wanted
    }
  };
  if !requested
    .iter()
    .all(|wanted| available.iter().any(|actual| matches(actual.text, wanted.text)))
  {
    return Vec::new();
  }
  available
    .into_iter()
    .filter_map(|actual| {
      requested
        .iter()
        .filter(|wanted| matches(actual.text, wanted.text))
        .map(|wanted| {
          (
            actual.start,
            if mode == SearchMode::WordStarts {
              actual.start + wanted.text.len()
            } else {
              actual.end
            },
          )
        })
        .max_by_key(|(_, end)| *end)
    })
    .collect()
}

fn original_highlights(original: &str, ranges: &[(usize, usize)]) -> Vec<HighlightRange> {
  let mut mapping = Vec::new();
  let mut normalized_offset = 0;
  for (start, grapheme) in original.grapheme_indices(true) {
    let width = normalize(grapheme).len();
    mapping.push((normalized_offset, normalized_offset + width, start, start + grapheme.len()));
    normalized_offset += width;
  }
  let mut original_ranges: Vec<(usize, usize)> = ranges
    .iter()
    .filter_map(|&(start, end)| {
      let selected: Vec<_> = mapping.iter().filter(|&&(a, b, _, _)| a < end && b > start).collect();
      Some((selected.first()?.2, selected.last()?.3))
    })
    .collect();
  original_ranges.sort_unstable();
  let mut merged: Vec<HighlightRange> = Vec::new();
  for (start, end) in original_ranges {
    let (Ok(start), Ok(end)) = (u32::try_from(start), u32::try_from(end)) else {
      continue;
    };
    if let Some(previous) = merged.last_mut().filter(|previous| previous.end >= start) {
      previous.end = previous.end.max(end);
    } else {
      merged.push(HighlightRange {
        start,
        end,
      });
    }
  }
  merged
}

fn validate_request(
  storage: &crate::SqliteStorage,
  request: &SearchRequest,
) -> Result<(u32, String), OperationError<StorageError>> {
  let revision = storage.library_revision().map_err(OperationError::Storage)?;
  if request.library_revision.is_some_and(|expected| expected != revision) {
    return Err(
      ApplicationFailure::StaleLibrary {
        message: "The Bible library changed. Run this search again.".into(),
        data: CatalogFailureData {
          field: "libraryRevision".into(),
          reason: revision.to_string(),
        },
      }
      .into(),
    );
  }
  let query = normalize(&request.query);
  let valid_scope =
    !matches!(request.scope, lumina_app::SearchScope::Book(book) if !(1..=66).contains(&book));
  if request.query.trim().is_empty()
    || query.is_empty()
    || (request.mode != SearchMode::ContainsText && words(&query).is_empty())
    || request.page == 0
    || !(1..=200).contains(&request.page_size)
    || !valid_scope
  {
    return Err(
      ApplicationFailure::InvalidSearch {
        message: "Enter searchable text and a valid page, scope and page size (1–200).".into(),
        data: CatalogFailureData {
          field: "query".into(),
          reason: "invalid input".into(),
        },
      }
      .into(),
    );
  }
  Ok((revision, query))
}

struct MatchedVerse {
  verse: lumina_app::ResolvedVerse,
  ranges: Vec<(usize, usize)>,
}

fn matching_verses(
  storage: &crate::SqliteStorage,
  request: &SearchRequest,
  translation: &lumina_app::Translation,
  query: &str,
) -> Result<Vec<MatchedVerse>, OperationError<StorageError>> {
  let mut rows = storage.connection.prepare("SELECT b.book_number,v.chapter,v.verse,v.text,s.normalized,b.name FROM verses v JOIN books b ON b.id=v.book_id JOIN verse_search s ON s.verse_id=v.id WHERE v.translation_id=?1 ORDER BY b.book_number,v.chapter,v.verse").map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
  let candidates = rows
    .query_map([&request.translation_id.0], |row| {
      Ok((
        row.get::<_, i32>(0)?,
        row.get::<_, i32>(1)?,
        row.get::<_, i32>(2)?,
        row.get::<_, String>(3)?,
        row.get::<_, String>(4)?,
        row.get::<_, String>(5)?,
      ))
    })
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  let mut hits = Vec::new();
  for candidate in candidates {
    let (book_number, chapter, verse, text, normalized, book_name) =
      candidate.map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    if !request.scope.includes(book_number) {
      continue;
    }
    let ranges = matched_ranges(&normalized, query, request.mode);
    if ranges.is_empty() {
      continue;
    }
    hits.push(MatchedVerse {
      verse: lumina_app::ResolvedVerse {
        translation_id: request.translation_id.clone(),
        edition_id: translation.edition_id.clone(),
        translation_title: translation.title.clone(),
        book_name,
        coordinate: lumina_app::VerseCoordinate {
          book_number,
          chapter,
          verse,
        },
        text,
      },
      ranges,
    });
  }
  Ok(hits)
}

pub(crate) fn search(
  storage: &crate::SqliteStorage,
  request: &SearchRequest,
) -> Result<SearchResult, OperationError<StorageError>> {
  let (revision, query) = validate_request(storage, request)?;
  let translation = storage
    .list_translations()
    .map_err(OperationError::Storage)?
    .into_iter()
    .find(|translation| translation.translation_id == request.translation_id)
    .ok_or_else(|| ApplicationFailure::TranslationUnavailable {
      message: "The selected translation is unavailable.".into(),
      data: lumina_app::TranslationData {
        translation_id: request.translation_id.clone(),
      },
    })?;
  let mut hits = matching_verses(storage, request, &translation, &query)?;
  if request.order == SearchOrder::BestMatch {
    hits.sort_by_key(|hit| {
      (
        std::cmp::Reverse(hit.ranges.len()),
        hit.verse.coordinate.book_number,
        hit.verse.coordinate.chapter,
        hit.verse.coordinate.verse,
      )
    });
  }
  let total = u32::try_from(hits.len()).map_err(|_| {
    OperationError::Rejected(ApplicationFailure::InvalidSearch {
      message: "Too many results.".into(),
      data: CatalogFailureData {
        field: "query".into(),
        reason: "result count overflow".into(),
      },
    })
  })?;
  let new_testament_page = hits
    .iter()
    .position(|hit| hit.verse.coordinate.book_number >= 40)
    .and_then(|index| u32::try_from(index).ok())
    .map(|index| index / request.page_size + 1);
  let offset = u64::from(request.page - 1) * u64::from(request.page_size);
  let offset = usize::try_from(offset).unwrap_or(usize::MAX);
  let results = hits
    .into_iter()
    .skip(offset)
    .take(usize::try_from(request.page_size).unwrap_or(200))
    .map(|hit| SearchHit {
      highlights: original_highlights(&hit.verse.text, &hit.ranges),
      verse: hit.verse,
    })
    .collect();
  Ok(SearchResult {
    workspace_id: request.workspace_id.clone(),
    translation_id: request.translation_id.clone(),
    edition_id: EditionId(translation.edition_id.0),
    request_id: request.request_id.clone(),
    library_revision: revision,
    query: request.query.clone(),
    mode: request.mode,
    scope: request.scope,
    order: request.order,
    page: request.page,
    page_size: request.page_size,
    total,
    new_testament_page,
    broader_match: matches!(request.mode, SearchMode::ContainsText | SearchMode::WordStarts),
    highlight_encoding: "utf8Bytes".into(),
    results,
  })
}
