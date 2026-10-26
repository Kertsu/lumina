use crate::{SqliteStorage, StorageError};
use lumina_app::{
  ApplicationFailure, CatalogFailureData, ImportBookCoverage, ImportChapterCoverage, ImportResult,
  ImportReview, ImportTranslationSummary, OperationError, StagedBook, StagedImport,
  StagedTranslation, StagedVerse, TranslationId,
};
use rusqlite::{params, types::ValueRef, Connection, OpenFlags, OptionalExtension, Row};
use std::{
  collections::{BTreeMap, HashMap, HashSet},
  path::Path,
};

fn rejected(reason: impl Into<String>) -> OperationError<StorageError> {
  ApplicationFailure::InvalidImport {message:"This SQLite Bible could not be imported. Export a standalone format-v1 file and review the details.".into(),data:CatalogFailureData {field:"source".into(),reason:reason.into()}}.into()
}
fn integer(row: &Row<'_>, index: usize, positive: bool) -> rusqlite::Result<i64> {
  let value = row.get::<_, i64>(index)?;
  if value < 0 || (positive && value == 0) {
    return Err(rusqlite::Error::InvalidQuery);
  }
  Ok(value)
}
fn text(row: &Row<'_>, index: usize, limit: usize, nonblank: bool) -> rusqlite::Result<String> {
  let value = row.get::<_, String>(index)?;
  if value.len() > limit || value.contains('\0') || (nonblank && value.trim().is_empty()) {
    return Err(rusqlite::Error::InvalidQuery);
  }
  Ok(value)
}
fn optional(
  row: &Row<'_>,
  index: usize,
  limit: usize,
  warnings: &mut Vec<String>,
  label: &str,
) -> Option<String> {
  match row.get_ref(index) {
    Ok(ValueRef::Null) => None,
    Ok(ValueRef::Text(bytes)) => match std::str::from_utf8(bytes) {
      Ok(value) if !value.contains('\0') && value.len() <= limit => {
        if value.trim().is_empty() {
          None
        } else {
          Some(value.into())
        }
      }
      _ => {
        warnings.push(format!("Ignored invalid optional {label}."));
        None
      }
    },
    _ => {
      warnings.push(format!("Ignored invalid optional {label}."));
      None
    }
  }
}
fn columns(
  connection: &Connection,
  table: &str,
  required: &[&str],
) -> Result<HashSet<String>, OperationError<StorageError>> {
  let sql: Option<String> = connection
    .query_row("SELECT sql FROM sqlite_schema WHERE type='table' AND name=?1", [table], |row| {
      row.get(0)
    })
    .optional()
    .map_err(|error| rejected(error.to_string()))?;
  if sql.as_deref().is_none_or(|sql| sql.to_ascii_uppercase().contains("CREATE VIRTUAL")) {
    return Err(rejected(format!("{table} must be an ordinary stored table.")));
  }
  let pragma = format!("PRAGMA table_xinfo('{table}')");
  let values = connection
    .prepare(&pragma)
    .map_err(|error| rejected(error.to_string()))?
    .query_map([], |row| Ok((row.get::<_, String>(1)?, row.get::<_, i32>(6)?)))
    .map_err(|error| rejected(error.to_string()))?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|error| rejected(error.to_string()))?;
  let columns: HashSet<_> =
    values.into_iter().filter(|(_, hidden)| *hidden == 0).map(|(name, _)| name).collect();
  if let Some(missing) = required.iter().find(|column| !columns.contains(**column)) {
    return Err(rejected(format!("Missing stored column {table}.{missing}.")));
  }
  Ok(columns)
}
fn select_optional(columns: &HashSet<String>, fields: &[&str]) -> String {
  fields
    .iter()
    .map(|field| {
      if columns.contains(*field) {
        (*field).to_string()
      } else {
        "NULL".into()
      }
    })
    .collect::<Vec<_>>()
    .join(",")
}

/// Read/validate a consistent standalone `SQLite` image without acquiring the
/// application's runtime lock or modifying the supplied file.
///
/// # Errors
/// Returns typed source/schema/content/resource failures, retaining I/O causes.
pub fn stage_import(path: &str) -> Result<StagedImport, OperationError<StorageError>> {
  let path = Path::new(path);
  let metadata =
    std::fs::metadata(path).map_err(StorageError::ImportIo).map_err(OperationError::Storage)?;
  if !metadata.is_file() || metadata.len() > 268_435_456 {
    return Err(rejected("Expected a standalone SQLite file no larger than 256 MiB."));
  }
  for suffix in ["-wal", "-journal"] {
    let sidecar = std::path::PathBuf::from(format!("{}{suffix}", path.to_string_lossy()));
    if std::fs::metadata(sidecar).is_ok_and(|metadata| metadata.len() > 0) {
      return Err(rejected(
        "Source has a live WAL/journal. Close it and export a complete standalone file.",
      ));
    }
  }
  let bytes =
    std::fs::read(path).map_err(StorageError::ImportIo).map_err(OperationError::Storage)?;
  if bytes.len() > 268_435_456 {
    return Err(rejected("Source exceeds the 256 MiB limit."));
  }
  let snapshot = tempfile::NamedTempFile::new()
    .map_err(StorageError::ImportIo)
    .map_err(OperationError::Storage)?;
  std::fs::write(snapshot.path(), bytes)
    .map_err(StorageError::ImportIo)
    .map_err(OperationError::Storage)?;
  let connection = Connection::open_with_flags(
    snapshot.path(),
    OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
  )
  .map_err(|error| rejected(error.to_string()))?;
  let version: i32 = connection
    .pragma_query_value(None, "user_version", |row| row.get(0))
    .map_err(|error| rejected(error.to_string()))?;
  if version != 1 {
    return Err(rejected("PRAGMA user_version must be 1 (the interchange version)."));
  }
  let check: String = connection
    .query_row("PRAGMA integrity_check(1)", [], |row| row.get(0))
    .map_err(|error| rejected(error.to_string()))?;
  if check != "ok" {
    return Err(rejected("Source is not a complete consistent SQLite image."));
  }
  let translation_columns = columns(&connection, "translations", &["id", "title", "description"])?;
  let book_columns =
    columns(&connection, "books", &["id", "translation_id", "book_number", "name"])?;
  columns(
    &connection,
    "verses",
    &["id", "translation_id", "book_id", "chapter", "verse", "text", "sort_order"],
  )?;
  let mut warnings = Vec::new();
  let translations = read_translations(&connection, &translation_columns, &mut warnings)?;
  let books = read_books(&connection, &book_columns, &mut warnings)?;
  let verses = read_verses(&connection)?;
  validate_relationships(&translations, &books, &verses)?;
  let filename = path
    .file_name()
    .and_then(|value| value.to_str())
    .filter(|value| !value.is_empty())
    .ok_or_else(|| rejected("Source filename must be valid UTF-8."))?
    .to_string();
  Ok(StagedImport {
    filename,
    translations,
    books,
    verses,
    warnings,
  })
}

fn read_translations(
  connection: &Connection,
  translation_columns: &HashSet<String>,
  warnings: &mut Vec<String>,
) -> Result<Vec<StagedTranslation>, OperationError<StorageError>> {
  let sql = format!(
    "SELECT id,title,description,{} FROM translations LIMIT 65",
    select_optional(
      translation_columns,
      &["edition_label", "source_name", "source_url", "rights_notice"]
    )
  );
  let mut statement = connection.prepare(&sql).map_err(|error| rejected(error.to_string()))?;
  let translations = statement
    .query_map([], |row| {
      Ok(StagedTranslation {
        id: integer(row, 0, true)?,
        title: text(row, 1, 512, true)?,
        description: text(row, 2, 16384, false)?,
        edition_label: optional(row, 3, 512, warnings, "edition_label"),
        source_name: optional(row, 4, 512, warnings, "source_name"),
        source_url: optional(row, 5, 4096, warnings, "source_url"),
        rights_notice: optional(row, 6, 65536, warnings, "rights_notice"),
      })
    })
    .map_err(|error| rejected(error.to_string()))?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|error| rejected(format!("Invalid translation ID, title or description: {error}")))?;
  if translations.is_empty() || translations.len() > 64 {
    return Err(rejected("Require 1–64 translations."));
  }
  Ok(translations)
}
fn read_books(
  connection: &Connection,
  book_columns: &HashSet<String>,
  warnings: &mut Vec<String>,
) -> Result<Vec<StagedBook>, OperationError<StorageError>> {
  let sql = format!(
    "SELECT id,translation_id,book_number,name,{} FROM books LIMIT 4225",
    select_optional(
      book_columns,
      &[
        "author",
        "writing_date",
        "writing_location",
        "metadata_attribution",
        "metadata_source_url",
        "metadata_rights_notice"
      ]
    )
  );
  let mut statement = connection.prepare(&sql).map_err(|error| rejected(error.to_string()))?;
  let books = statement
    .query_map([], |row| {
      Ok(StagedBook {
        id: integer(row, 0, true)?,
        translation_id: integer(row, 1, true)?,
        book_number: row.get(2)?,
        name: text(row, 3, 512, true)?,
        author: optional(row, 4, 4096, warnings, "author"),
        writing_date: optional(row, 5, 4096, warnings, "writing_date"),
        writing_location: optional(row, 6, 4096, warnings, "writing_location"),
        metadata_attribution: optional(row, 7, 16384, warnings, "metadata_attribution"),
        metadata_source_url: optional(row, 8, 4096, warnings, "metadata_source_url"),
        metadata_rights_notice: optional(row, 9, 65536, warnings, "metadata_rights_notice"),
      })
    })
    .map_err(|error| rejected(error.to_string()))?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|error| rejected(format!("Invalid book data: {error}")))?;
  Ok(books)
}
fn read_verses(connection: &Connection) -> Result<Vec<StagedVerse>, OperationError<StorageError>> {
  let mut statement = connection
    .prepare(
      "SELECT id,translation_id,book_id,chapter,verse,text,sort_order FROM verses LIMIT 1000001",
    )
    .map_err(|error| rejected(error.to_string()))?;
  let mut verse_ids = HashSet::new();
  let verses = statement
    .query_map([], |row| {
      let id = integer(row, 0, true)?;
      if !verse_ids.insert(id) {
        return Err(rusqlite::Error::InvalidQuery);
      }
      Ok(StagedVerse {
        translation_id: integer(row, 1, true)?,
        book_id: integer(row, 2, true)?,
        chapter: row.get(3)?,
        verse: row.get(4)?,
        text: text(row, 5, 65536, true)?,
        sort_order: integer(row, 6, false)?,
      })
    })
    .map_err(|error| rejected(error.to_string()))?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|error| rejected(format!("Invalid verse types, IDs, coordinates or text: {error}")))?;
  if verses.len() > 1_000_000 {
    return Err(rejected("Source exceeds 1,000,000 verse rows."));
  }
  Ok(verses)
}
fn validate_relationships(
  translations: &[StagedTranslation],
  books: &[StagedBook],
  verses: &[StagedVerse],
) -> Result<(), OperationError<StorageError>> {
  let ids: HashSet<_> = translations.iter().map(|translation| translation.id).collect();
  if ids.len() != translations.len() {
    return Err(rejected("Duplicate translation IDs."));
  }
  let mut coordinates = HashSet::new();
  let mut book_ids = HashMap::new();
  let mut numbers = HashSet::new();
  for book in books {
    if !ids.contains(&book.translation_id)
      || !(1..=66).contains(&book.book_number)
      || book_ids.insert(book.id, book.translation_id).is_some()
      || !numbers.insert((book.translation_id, book.book_number))
    {
      return Err(rejected(
        "Invalid/duplicate book IDs, book numbers or translation relationships.",
      ));
    }
  }
  for verse in verses {
    if verse.chapter <= 0
      || verse.verse <= 0
      || book_ids.get(&verse.book_id) != Some(&verse.translation_id)
      || !coordinates.insert((verse.translation_id, verse.book_id, verse.chapter, verse.verse))
    {
      return Err(rejected(
        "Invalid verse coordinate, duplicate coordinate or book/translation relationship.",
      ));
    }
  }
  if translations
    .iter()
    .any(|translation| !verses.iter().any(|verse| verse.translation_id == translation.id))
  {
    return Err(rejected("Every translation requires at least one valid verse."));
  }
  Ok(())
}

pub(crate) fn register(
  storage: &mut SqliteStorage,
  staged: StagedImport,
) -> Result<ImportReview, OperationError<StorageError>> {
  let token: String = storage
    .connection
    .query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0))
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  let translations = staged
    .translations
    .iter()
    .map(|translation| {
      let books = staged
        .books
        .iter()
        .filter(|book| book.translation_id == translation.id)
        .map(|book| {
          let mut chapters = BTreeMap::<i32, u32>::new();
          for verse in staged.verses.iter().filter(|verse| verse.book_id == book.id) {
            *chapters.entry(verse.chapter).or_default() += 1;
          }
          ImportBookCoverage {
            book_number: book.book_number,
            name: book.name.clone(),
            chapters: chapters
              .into_iter()
              .map(|(chapter, verse_count)| ImportChapterCoverage {
                chapter,
                verse_count,
              })
              .collect(),
            author: book.author.clone(),
            writing_date: book.writing_date.clone(),
            writing_location: book.writing_location.clone(),
            metadata_attribution: book.metadata_attribution.clone(),
          }
        })
        .collect::<Vec<_>>();
      Ok(ImportTranslationSummary {
        title: translation.title.clone(),
        description: translation.description.clone(),
        edition_label: translation.edition_label.clone(),
        source_name: translation.source_name.clone(),
        source_url: translation.source_url.clone(),
        rights_notice: translation.rights_notice.clone(),
        book_count: u32::try_from(books.len()).map_err(|_| rejected("Too many books."))?,
        verse_count: u32::try_from(
          staged.verses.iter().filter(|verse| verse.translation_id == translation.id).count(),
        )
        .map_err(|_| rejected("Too many verses."))?,
        books,
      })
    })
    .collect::<Result<Vec<_>, OperationError<StorageError>>>()?;
  let review = ImportReview {
    token: token.clone(),
    filename: staged.filename.clone(),
    translations,
    warnings: staged.warnings.clone(),
  };
  storage.staged_imports.insert(token, staged);
  Ok(review)
}
pub(crate) fn review(
  storage: &mut SqliteStorage,
  path: &str,
) -> Result<ImportReview, OperationError<StorageError>> {
  register(storage, stage_import(path)?)
}

pub(crate) fn commit(
  storage: &mut SqliteStorage,
  token: &str,
) -> Result<ImportResult, OperationError<StorageError>> {
  let staged = storage.staged_imports.get(token).ok_or_else(|| {
    OperationError::Rejected(ApplicationFailure::ImportReviewUnavailable {
      message: "This import review was canceled or already applied. Review the source again."
        .into(),
      data: CatalogFailureData {
        field: "token".into(),
        reason: "unavailable".into(),
      },
    })
  })?;
  let transaction = storage
    .connection
    .transaction()
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  let path = Path::new(&staged.filename);
  let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or(&staged.filename);
  let extension = path.extension().and_then(|value| value.to_str());
  let mut suffix = 0_u32;
  let mut filename = staged.filename.clone();
  while transaction
    .query_row("SELECT EXISTS (SELECT 1 FROM imports WHERE filename=?1)", [&filename], |row| {
      row.get::<_, bool>(0)
    })
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?
  {
    suffix = suffix.checked_add(1).ok_or_else(|| rejected("Filename suffix exhausted."))?;
    filename = extension.map_or_else(
      || format!("{stem} ({suffix})"),
      |extension| format!("{stem} ({suffix}).{extension}"),
    );
  }
  let import_id: String = transaction
    .query_row("INSERT INTO imports(filename) VALUES (?1) RETURNING id", [&filename], |row| {
      row.get(0)
    })
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  let mut installed = HashMap::<i64, String>::new();
  for source in &staged.translations {
    let id:String=transaction.query_row("INSERT INTO translations(title,description,edition_label,source_name,source_url,rights_notice,import_id) VALUES (?1,?2,?3,?4,?5,?6,?7) RETURNING id",params![source.title,source.description,source.edition_label,source.source_name,source.source_url,source.rights_notice,import_id],|row|row.get(0)).map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    installed.insert(source.id, id);
  }
  let mut book_ids = HashMap::new();
  for source in &staged.books {
    let id:i64=transaction.query_row("INSERT INTO books(translation_id,book_number,name,author,writing_date,writing_location,metadata_attribution,metadata_source_url,metadata_rights_notice) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) RETURNING id",params![installed[&source.translation_id],source.book_number,source.name,source.author,source.writing_date,source.writing_location,source.metadata_attribution,source.metadata_source_url,source.metadata_rights_notice],|row|row.get(0)).map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    book_ids.insert(source.id, id);
  }
  {
    let mut insert=transaction.prepare("INSERT INTO verses(translation_id,book_id,chapter,verse,text,sort_order) VALUES (?1,?2,?3,?4,?5,?6)").map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    for source in &staged.verses {
      insert
        .execute(params![
          installed[&source.translation_id],
          book_ids[&source.book_id],
          source.chapter,
          source.verse,
          source.text,
          source.sort_order
        ])
        .map_err(StorageError::Catalog)
        .map_err(OperationError::Storage)?;
    }
  }
  crate::search::index_missing(&transaction)
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  transaction
    .execute("UPDATE catalog_meta SET revision=revision+1", [])
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  let revision = transaction
    .query_row("SELECT revision FROM catalog_meta", [], |row| row.get(0))
    .map_err(StorageError::Catalog)
    .map_err(OperationError::Storage)?;
  transaction.commit().map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
  let translation_ids = staged
    .translations
    .iter()
    .map(|translation| TranslationId(installed[&translation.id].clone()))
    .collect();
  storage.staged_imports.remove(token);
  Ok(ImportResult {
    filename,
    translation_ids,
    library_revision: revision,
  })
}
