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
    CREATE TABLE translations(id INTEGER,title TEXT,description TEXT);
    CREATE TABLE books(id INTEGER,translation_id INTEGER,book_number INTEGER,name TEXT,author TEXT);
    CREATE TABLE verses(id INTEGER,translation_id INTEGER,book_id INTEGER,chapter INTEGER,verse INTEGER,text TEXT,sort_order INTEGER);
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
