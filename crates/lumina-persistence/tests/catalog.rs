use lumina_app::{Application, SearchMode, SearchOrder, SearchRequest, SearchScope};
use lumina_persistence::SqliteStorage;

#[test]
fn canonical_search_has_complete_paging_and_does_not_select_content(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let snapshot = app.snapshot();
  let request = SearchRequest {
    workspace_id: snapshot.active_workspace_id.clone(),
    translation_id: snapshot.translations[0].translation_id.clone(),
    request_id: "first-search".into(),
    query: "God love".into(),
    mode: SearchMode::AllWords,
    scope: SearchScope::EntireBible,
    order: SearchOrder::BibleOrder,
    page: 1,
    page_size: 2,
    library_revision: None,
  };
  let results = app.search(request)?;
  assert!(results.total > 2);
  assert_eq!(results.results.len(), 2);
  assert!(app.snapshot().workspaces[0].current_verse.is_none());
  Ok(())
}

fn source(
  path: &std::path::Path,
  values: &[(i32, i32, &str)],
) -> Result<(), Box<dyn std::error::Error>> {
  let connection = rusqlite::Connection::open(path)?;
  connection.execute_batch("PRAGMA user_version=1;
    CREATE TABLE translations(id INTEGER PRIMARY KEY,title TEXT,description TEXT);
    CREATE TABLE books(id INTEGER PRIMARY KEY,translation_id INTEGER,book_number INTEGER,name TEXT,author TEXT);
    CREATE TABLE verses(id INTEGER PRIMARY KEY,translation_id INTEGER,book_id INTEGER,chapter INTEGER,verse INTEGER,text TEXT,sort_order INTEGER);
    INSERT INTO translations VALUES (42,'Same title','');")?;
  let mut books = std::collections::HashSet::new();
  for (index, (book, verse, text)) in values.iter().enumerate() {
    if books.insert(*book) {
      connection.execute(
        "INSERT INTO books VALUES (?1,42,?1,?2,NULL)",
        rusqlite::params![book, format!("Book {book}")],
      )?;
    }
    connection.execute(
      "INSERT INTO verses VALUES (?1,42,?2,16,?3,?4,0)",
      rusqlite::params![i64::try_from(index)? + 100, book, verse, text],
    )?;
  }
  Ok(())
}

#[test]
fn repeated_imports_preserve_reviewed_originals_with_fresh_identity_and_labels(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{ReferenceInputRequest, ReferenceInputResult};
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("Bible.sqlite");
  source(&path, &[(45, 24, "Original  text.\n"), (45, 25, "Outside another edition's layout.")])?;
  let original = std::fs::read(&path)?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let review = app.review_import(path.to_string_lossy().into())?;
  assert!(review.warnings.is_empty());
  assert_eq!(review.translations[0].books[0].chapters[0].verse_count, 2);
  // Publication uses the reviewed immutable snapshot, even if the supplied path changes.
  std::fs::write(&path, b"changed after review")?;
  let first = app.commit_import(review.token)?;
  assert_eq!(first.filename, "Bible.sqlite");
  let selected = app.resolve_reference_input(ReferenceInputRequest {
    workspace_id: app.snapshot().active_workspace_id.clone(),
    translation_id: Some(first.translation_ids[0].clone()),
    input: "Romans16:25".into(),
    choice: None,
    choice_token: None,
  })?;
  assert!(
    matches!(selected,ReferenceInputResult::Resolved(result) if result.verse.text=="Outside another edition's layout.")
  );
  std::fs::write(&path, &original)?;
  let review = app.review_import(path.to_string_lossy().into())?;
  let second = app.commit_import(review.token)?;
  assert_eq!(second.filename, "Bible (1).sqlite");
  assert_ne!(first.translation_ids, second.translation_ids);
  assert_eq!(std::fs::read(&path)?, original);
  app.delete_imported_translation(
    app.snapshot().active_workspace_id.clone(),
    first.translation_ids[0].clone(),
    true,
  )?;
  let review = app.review_import(path.to_string_lossy().into())?;
  assert_eq!(app.commit_import(review.token)?.filename, "Bible.sqlite");
  Ok(())
}

#[test]
fn import_preserves_zero_coverage_books_and_optional_metadata_without_credit(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("Partial.sqlite");
  source(&path, &[(43, 16, "love")])?;
  rusqlite::Connection::open(&path)?
    .execute("INSERT INTO books VALUES (44,42,44,'Mga Gawa','Luke')", [])?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let review = app.review_import(path.to_string_lossy().into())?;
  assert!(review.warnings.is_empty());
  assert_eq!(review.translations[0].books.len(), 2);
  let committed = app.commit_import(review.token)?;
  let book = app
    .list_books(committed.translation_ids[0].clone())?
    .into_iter()
    .find(|book| book.book_number == 44)
    .ok_or("missing zero coverage book")?;
  assert!(book.eligible());
  assert!(book.metadata_attribution.is_none());
  assert!(app.chapter_verses(book.translation_id, 44, 1)?.is_empty());
  Ok(())
}

#[test]
fn documented_references_bind_ambiguity_to_exact_input_workspace_and_edition(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{
    ApplicationFailure, OperationError, ReferenceInputRequest, ReferenceInputResult,
  };
  let directory = tempfile::tempdir()?;
  let app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let request = |input: &str| ReferenceInputRequest {
    workspace_id: app.snapshot().active_workspace_id.clone(),
    translation_id: None,
    input: input.into(),
    choice: None,
    choice_token: None,
  };
  for (input, book, chapter, verse) in [
    ("Jn. 3 : 16", 43, 3, 16),
    ("Juan3:16", 43, 3, 16),
    ("1John3:16", 62, 3, 16),
    ("I John 3:16", 62, 3, 16),
    ("Ge\u{301}nesis1:1", 1, 1, 1),
  ] {
    let result = app.resolve_reference_input(request(input))?;
    assert!(
      matches!(result,ReferenceInputResult::Resolved(value) if value.verse.coordinate==lumina_app::VerseCoordinate {book_number:book,chapter,verse}),
      "{input}"
    );
  }
  let ReferenceInputResult::Ambiguous(ambiguity) =
    app.resolve_reference_input(request("Jo 3:16"))?
  else {
    return Err("expected ambiguity".into());
  };
  assert_eq!(
    ambiguity.candidates.iter().map(|candidate| candidate.book_number).collect::<Vec<_>>(),
    vec![18, 29, 32, 43]
  );
  let mut choice = request("Jo 3:16");
  choice.choice = Some(43);
  choice.choice_token = Some(ambiguity.choice_token);
  assert!(
    matches!(app.resolve_reference_input(choice.clone())?,ReferenceInputResult::Resolved(result) if result.verse.coordinate.book_number==43)
  );
  choice.input = "Jo 3:17".into();
  assert!(matches!(
    app.resolve_reference_input(choice),
    Err(OperationError::Rejected(ApplicationFailure::StaleReferenceChoice { .. }))
  ));
  assert!(matches!(
    app.resolve_reference_input(request("Joh 3:16")),
    Err(OperationError::Rejected(ApplicationFailure::UnknownBook { .. }))
  ));
  for input in
    ["John3:16-17", "John3:16a", "John-3:16", "John3.5:16", "John3:0", "John3:16 trailing"]
  {
    assert!(
      matches!(
        app.resolve_reference_input(request(input)),
        Err(OperationError::Rejected(ApplicationFailure::InvalidReferenceInput { .. }))
      ),
      "{input}"
    );
  }
  assert!(app.snapshot().workspaces[0].current_verse.is_none());
  Ok(())
}

#[test]
fn malformed_sources_reject_atomically_while_invalid_optional_values_only_warn(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{ApplicationFailure, OperationError};
  let directory = tempfile::tempdir()?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let initial = app.snapshot().clone();
  for (label,mutation) in [
    ("missing-primary-key","ALTER TABLE translations RENAME TO original; CREATE TABLE translations(id INTEGER,title TEXT,description TEXT); INSERT INTO translations SELECT * FROM original; DROP TABLE original;"),
    ("duplicate-coordinate","INSERT INTO verses SELECT id+1,translation_id,book_id,chapter,verse,text,sort_order FROM verses;"),
    ("mismatched-edition","UPDATE verses SET translation_id=1000;"),
    ("unsupported-coordinate","UPDATE verses SET verse='3a';"),
    ("noninteger-coordinate","UPDATE verses SET chapter=3.5;"),
    ("wrong-text-type","UPDATE verses SET text=X'6869';"),
    ("wrong-version","PRAGMA user_version=2;"),
    ("view-table","ALTER TABLE verses RENAME TO original; CREATE VIEW verses AS SELECT * FROM original;"),
  ] {
    let path=directory.path().join(format!("{label}.sqlite"));
    source(&path,&[(43,16,"Original")])?;
    rusqlite::Connection::open(&path)?.execute_batch(mutation)?;
    assert!(matches!(app.review_import(path.to_string_lossy().into()),Err(OperationError::Rejected(ApplicationFailure::InvalidImport {..}))),"{label}");
    assert_eq!(app.snapshot(),&initial,"{label}");
    assert_eq!(app.library_revision()?,0);
  }
  let path = directory.path().join("optional.sqlite");
  source(&path, &[(43, 16, "Original")])?;
  rusqlite::Connection::open(&path)?.execute("UPDATE books SET author=X'6c756b65'", [])?;
  let review = app.review_import(path.to_string_lossy().into())?;
  assert_eq!(review.warnings.len(), 1);
  assert!(review.translations[0].books[0].author.is_none());
  app.cancel_import(review.token.clone());
  assert!(matches!(
    app.commit_import(review.token),
    Err(OperationError::Rejected(ApplicationFailure::ImportReviewUnavailable { .. }))
  ));
  Ok(())
}

fn search_request(
  app: &Application<SqliteStorage>,
  translation_id: lumina_app::TranslationId,
  query: &str,
  mode: SearchMode,
) -> SearchRequest {
  SearchRequest {
    workspace_id: app.snapshot().active_workspace_id.clone(),
    translation_id,
    request_id: "fixture-search".into(),
    query: query.into(),
    mode,
    scope: SearchScope::EntireBible,
    order: SearchOrder::BibleOrder,
    page: 1,
    page_size: 2,
    library_revision: None,
  }
}

#[test]
fn four_modes_keep_literal_boundaries_unicode_highlights_and_complete_scoped_pages(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("Search.sqlite");
  source(
    &path,
    &[
      (1, 1, "Love, God."),
      (1, 2, "love  God"),
      (1, 3, "God love"),
      (1, 4, "unrighteous"),
      (1, 5, "ako’y pag-ibig"),
      (1, 6, "Íbig e\u{301}lan"),
      (1, 7, "100%_*\""),
      (1, 8, "love love"),
      (43, 1, "love"),
      (45, 1, "love"),
      (58, 1, "love"),
    ],
  )?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let review = app.review_import(path.to_string_lossy().into())?;
  let translation = app.commit_import(review.token)?.translation_ids.remove(0);
  for (query, mode, expected) in [
    ("love God", SearchMode::AllWords, 3),
    ("love God", SearchMode::Phrase, 2),
    ("love love", SearchMode::Phrase, 1),
    ("love love", SearchMode::AllWords, 7),
    ("lov Go", SearchMode::WordStarts, 3),
    ("righteous", SearchMode::AllWords, 0),
    ("righteous", SearchMode::ContainsText, 1),
    ("love God", SearchMode::ContainsText, 0),
    ("love  God", SearchMode::ContainsText, 1),
    ("ako'y", SearchMode::AllWords, 1),
    ("akoy", SearchMode::AllWords, 0),
    ("%_*\"", SearchMode::ContainsText, 1),
    ("%", SearchMode::ContainsText, 1),
    (" God", SearchMode::ContainsText, 2),
    ("love*", SearchMode::AllWords, 7),
    ("love OR God", SearchMode::AllWords, 0),
  ] {
    let result = app.search(search_request(&app, translation.clone(), query, mode))?;
    assert_eq!(result.total, expected, "{query} {mode:?}");
    assert_eq!(result.highlight_encoding, "utf8Bytes");
  }
  let result =
    app.search(search_request(&app, translation.clone(), "ibig e", SearchMode::ContainsText))?;
  assert_eq!(result.total, 1);
  assert_eq!(result.results[0].verse.text, "Íbig e\u{301}lan");
  assert_eq!(
    result.results[0].highlights,
    vec![lumina_app::HighlightRange {
      start: 0,
      end: 9
    }]
  );
  let mut request = search_request(&app, translation.clone(), "love", SearchMode::AllWords);
  assert_eq!(app.search(request.clone())?.new_testament_page, Some(3));
  let mut all = Vec::new();
  for page in 1..=4 {
    request.page = page;
    all.extend(
      app
        .search(request.clone())?
        .results
        .into_iter()
        .map(|hit| (hit.verse.coordinate.book_number, hit.verse.coordinate.verse)),
    );
  }
  assert_eq!(all, vec![(1, 1), (1, 2), (1, 3), (1, 8), (43, 1), (45, 1), (58, 1)]);
  request.page = 1;
  for (scope, expected) in [
    (SearchScope::OldTestament, 4),
    (SearchScope::NewTestament, 3),
    (SearchScope::Moses, 4),
    (SearchScope::Gospels, 1),
    (SearchScope::EpistlesOfPaul, 1),
    (SearchScope::Book(58), 1),
  ] {
    request.scope = scope;
    assert_eq!(app.search(request.clone())?.total, expected, "{scope:?}");
  }
  assert!(app.snapshot().workspaces[0].current_verse.is_none());
  Ok(())
}

#[test]
fn failed_index_publication_keeps_review_retryable_and_stale_requests_are_rejected(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{ApplicationFailure, OperationError};
  let directory = tempfile::tempdir()?;
  let managed = directory.path().join("managed.sqlite");
  let path = directory.path().join("Bible.sqlite");
  source(&path, &[(43, 16, "Original")])?;
  let mut app = Application::start(SqliteStorage::open(&managed)?)?;
  let initial = app.snapshot().clone();
  let mut old_search = search_request(
    &app,
    initial.translations[0].translation_id.clone(),
    "love",
    SearchMode::AllWords,
  );
  old_search.library_revision = Some(0);
  let review = app.review_import(path.to_string_lossy().into())?;
  let fixture = rusqlite::Connection::open(&managed)?;
  fixture.execute_batch("CREATE TRIGGER reject_index BEFORE INSERT ON verse_search BEGIN SELECT RAISE(ABORT,'index unavailable'); END;")?;
  let error = app.commit_import(review.token.clone()).err().ok_or("expected index failure")?;
  assert!(std::error::Error::source(&error).is_some());
  assert_eq!(app.snapshot(), &initial);
  assert_eq!(app.library_revision()?, 0);
  fixture.execute_batch("DROP TRIGGER reject_index")?;
  let imported = app.commit_import(review.token)?;
  assert_eq!(imported.filename, "Bible.sqlite");
  assert!(matches!(
    app.search(old_search),
    Err(OperationError::Rejected(ApplicationFailure::StaleLibrary { .. }))
  ));
  let workspace = app.snapshot().active_workspace_id.clone();
  let installed = app.snapshot().clone();
  assert!(matches!(
    app.delete_imported_translation(
      workspace.clone(),
      installed.translations[0].translation_id.clone(),
      true
    ),
    Err(OperationError::Rejected(ApplicationFailure::TranslationProtected { .. }))
  ));
  assert!(matches!(
    app.delete_imported_translation(workspace, imported.translation_ids[0].clone(), false),
    Err(OperationError::Rejected(ApplicationFailure::ConfirmationRequired { .. }))
  ));
  assert_eq!(app.snapshot(), &installed);
  Ok(())
}

#[test]
fn unicode_full_folding_expansion_highlights_the_original_grapheme(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("Unicode.sqlite");
  source(&path, &[(43, 1, "\u{1f88}")])?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  let review = app.review_import(path.to_string_lossy().into())?;
  let id = app.commit_import(review.token)?.translation_ids.remove(0);
  let result = app.search(search_request(&app, id, "αι", SearchMode::ContainsText))?;
  assert_eq!(result.total, 1);
  assert_eq!(
    result.results[0].highlights,
    vec![lumina_app::HighlightRange {
      start: 0,
      end: 3
    }]
  );
  Ok(())
}
