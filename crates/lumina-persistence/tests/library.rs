use lumina_app::{
  Application, ApplicationFailure, CoordinateField, ReferenceRequest, VerseCoordinate, WorkspaceId,
};
use lumina_persistence::SqliteStorage;

#[test]
fn first_launch_installs_web_and_one_closed_default_workspace(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let application =
    Application::start(SqliteStorage::open(&directory.path().join("lumina.sqlite3"))?)?;
  let state = application.snapshot();
  assert_eq!(state.translations.len(), 1);
  let web = &state.translations[0];
  assert_eq!(web.title, "World English Bible");
  assert!(web.bundled);
  assert_eq!(web.book_count, 66);
  assert_eq!(web.verse_count, 31_098);
  assert_eq!(web.source.publisher_edition_id.as_deref(), Some("engwebp"));
  assert_eq!(
    web.source.artifact_sha256.as_deref(),
    Some("d2a7c9640820003d8ed475ce6d92cc990b0447fe96ce72fd0df17c0dac9d95fe")
  );
  assert!(web.source.rights_notice.as_ref().is_some_and(|notice| notice.contains("Public Domain")));
  assert_eq!(state.workspaces.len(), 1);
  let workspace = &state.workspaces[0];
  assert_eq!(state.active_workspace_id, workspace.workspace_id);
  assert_eq!(workspace.settings.name, "Audience 1");
  assert_eq!(workspace.settings.selected_translation_id, web.translation_id);
  assert!(workspace.settings.hide_cursor);
  assert!(workspace.current_verse.is_none());
  assert!(!workspace.book_information_mode);
  assert_eq!(serde_json::to_value(workspace)?["audience"], "closed");
  Ok(())
}

#[test]
fn relaunch_preserves_identities_and_does_not_duplicate_content(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  let first = Application::start(SqliteStorage::open(&path)?)?;
  let before = first.snapshot().clone();
  drop(first);
  for _ in 0..2 {
    let application = Application::start(SqliteStorage::open(&path)?)?;
    assert_eq!(application.snapshot(), &before);
  }
  Ok(())
}

#[test]
fn malformed_and_absent_coordinates_return_typed_failures_without_state_changes(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let application =
    Application::start(SqliteStorage::open(&directory.path().join("lumina.sqlite3"))?)?;
  let before = application.snapshot().clone();
  for (book_number, chapter, verse, field) in [
    (0, 3, 16, CoordinateField::BookNumber),
    (67, 3, 16, CoordinateField::BookNumber),
    (43, 0, 16, CoordinateField::Chapter),
    (43, -1, 16, CoordinateField::Chapter),
    (43, 3, 0, CoordinateField::Verse),
    (43, 3, -1, CoordinateField::Verse),
  ] {
    let coordinate = VerseCoordinate {
      book_number,
      chapter,
      verse,
    };
    let failure = application
      .resolve_reference(ReferenceRequest {
        workspace_id: before.active_workspace_id.clone(),
        coordinate,
      })
      .err()
      .ok_or("malformed coordinate was accepted")?
      .public_failure();
    assert!(
      matches!(failure, ApplicationFailure::InvalidReference { data, .. } if data.coordinate == coordinate && data.field == field)
    );
    assert_eq!(application.snapshot(), &before);
  }
  for (book_number, chapter, verse) in [(43, 3, 999), (45, 16, 25), (43, i32::MAX, i32::MAX)] {
    let coordinate = VerseCoordinate {
      book_number,
      chapter,
      verse,
    };
    let failure = application
      .resolve_reference(ReferenceRequest {
        workspace_id: before.active_workspace_id.clone(),
        coordinate,
      })
      .err()
      .ok_or("absent coordinate was accepted")?
      .public_failure();
    assert!(
      matches!(failure, ApplicationFailure::ReferenceUnavailable { data, .. } if data.coordinate == coordinate && data.translation_id == before.translations[0].translation_id)
    );
    assert_eq!(application.snapshot(), &before);
  }
  let failure = application
    .resolve_reference(ReferenceRequest {
      workspace_id: WorkspaceId("unknown-workspace".into()),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })
    .err()
    .ok_or("unknown workspace was accepted")?
    .public_failure();
  assert!(
    matches!(failure, ApplicationFailure::WorkspaceNotFound { data, .. } if data.workspace_id.0 == "unknown-workspace")
  );
  assert_eq!(application.snapshot(), &before);
  Ok(())
}

#[test]
fn durable_selection_and_settings_restore_independently_with_native_text_and_coordinates(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  let first = Application::start(SqliteStorage::open(&path)?)?;
  let original_id = first.snapshot().active_workspace_id.clone();
  drop(first);
  // Represents an existing durable library/workspace, not an import operation.
  let fixture = rusqlite::Connection::open(&path)?;
  fixture.execute_batch(
    "PRAGMA foreign_keys = ON;
     INSERT INTO translations (id, edition_id, title, description)
       VALUES ('translation-fixture', 'edition-fixture', 'Fixture translation', 'Partial native coverage');
     INSERT INTO books (id, translation_id, book_number, name)
       VALUES (1001, 'translation-fixture', 45, 'Roma');
     INSERT INTO books (id, translation_id, book_number, name)
       VALUES (1002, 'translation-fixture', 1, 'Genesis without verses');
     INSERT INTO verses (translation_id, book_id, chapter, verse, text, sort_order)
       VALUES ('translation-fixture', 1001, 16, 25, '  José’s original text.
Second line.  ', 900);
     INSERT INTO verses (translation_id, book_id, chapter, verse, text, sort_order)
       VALUES ('translation-fixture', 1001, 2147483647, 2147483647, 'Native upper coordinate.', 0);
     INSERT INTO workspaces (id, name, position, selected_translation_id, hide_cursor)
       VALUES ('workspace-fixture', 'Second audience', 1, 'translation-fixture', 0);
     UPDATE application_settings SET active_workspace_id = 'workspace-fixture';"
  )?;
  drop(fixture);
  let application = Application::start(SqliteStorage::open(&path)?)?;
  let before = application.snapshot().clone();
  assert_eq!(before.active_workspace_id.0, "workspace-fixture");
  assert_eq!(before.workspaces.len(), 2);
  assert_eq!(before.workspaces[0].workspace_id, original_id);
  assert_eq!(before.workspaces[1].settings.name, "Second audience");
  assert!(!before.workspaces[1].settings.hide_cursor);
  let selected = &before.workspaces[1].settings.selected_translation_id;
  let translation = before
    .translations
    .iter()
    .find(|translation| &translation.translation_id == selected)
    .ok_or("fixture translation missing")?;
  assert_eq!(translation.book_count, 2);
  assert_eq!(translation.verse_count, 2);
  assert_eq!(translation.source.source_name, None);
  let coordinate = VerseCoordinate {
    book_number: 45,
    chapter: 16,
    verse: 25,
  };
  let result = application.resolve_reference(ReferenceRequest {
    workspace_id: before.active_workspace_id.clone(),
    coordinate,
  })?;
  assert_eq!(result.verse.coordinate, coordinate);
  assert_eq!(result.verse.text, "  José’s original text.\nSecond line.  ");
  assert_eq!(result.verse.book_name, "Roma");
  assert_eq!(result.verse.edition_id.0, "edition-fixture");
  let upper = application.resolve_reference(ReferenceRequest {
    workspace_id: before.active_workspace_id.clone(),
    coordinate: VerseCoordinate {
      book_number: 45,
      chapter: i32::MAX,
      verse: i32::MAX,
    },
  })?;
  assert_eq!(upper.verse.text, "Native upper coordinate.");
  // The inactive original workspace still resolves WEB, where this reference is absent.
  assert!(matches!(
    application
      .resolve_reference(ReferenceRequest {
        workspace_id: original_id,
        coordinate,
      })
      .err()
      .ok_or("workspace lookup used another selection")?
      .public_failure(),
    ApplicationFailure::ReferenceUnavailable { .. }
  ));
  assert_eq!(application.snapshot(), &before);
  drop(application);
  let restarted = Application::start(SqliteStorage::open(&path)?)?;
  assert_eq!(restarted.snapshot(), &before);
  for workspace in &restarted.snapshot().workspaces {
    assert!(workspace.current_verse.is_none());
    assert!(!workspace.book_information_mode);
    assert_eq!(serde_json::to_value(workspace)?["audience"], "closed");
  }
  Ok(())
}

#[test]
fn interrupted_seed_or_defaults_publish_nothing_and_allow_clean_retry(
) -> Result<(), Box<dyn std::error::Error>> {
  for trigger in [
    "CREATE TRIGGER fail_bootstrap BEFORE INSERT ON verses WHEN NEW.verse = 2 BEGIN SELECT RAISE(ABORT, 'seed write failure'); END;",
    "CREATE TRIGGER fail_bootstrap BEFORE INSERT ON application_settings BEGIN SELECT RAISE(ABORT, 'settings write failure'); END;",
  ] {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("lumina.sqlite3");
    let fixture = rusqlite::Connection::open(&path)?;
    fixture.execute_batch(include_str!("../migrations/V20261024060038_library_and_workspaces.sql"))?;
    fixture.pragma_update(None, "user_version", 2)?;
    fixture.execute_batch(trigger)?;
    assert!(Application::start(SqliteStorage::open(&path)?).is_err());
    // Persisted effects are observable by a second connection after failed startup.
    for table in ["translations", "books", "verses", "workspaces", "application_settings"] {
      let count: u32 = fixture.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| row.get(0))?;
      assert_eq!(count, 0, "partial bootstrap in {table}");
    }
    fixture.execute_batch("DROP TRIGGER fail_bootstrap")?;
    drop(fixture);
    let application = Application::start(SqliteStorage::open(&path)?)?;
    assert_eq!(application.snapshot().translations.len(), 1);
    assert_eq!(application.snapshot().translations[0].verse_count, 31_098);
    assert_eq!(application.snapshot().workspaces.len(), 1);
  }
  Ok(())
}

#[test]
fn failed_migration_preserves_the_old_schema_and_can_be_retried(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  let fixture = rusqlite::Connection::open(&path)?;
  fixture.pragma_update(None, "user_version", 1)?;
  fixture.execute_batch("CREATE TABLE books (conflicting_column TEXT)")?;
  assert!(Application::start(SqliteStorage::open(&path)?).is_err());
  assert_eq!(SqliteStorage::open(&path)?.schema_version()?, 1);
  fixture.execute_batch("DROP TABLE books")?;
  drop(fixture);
  let application = Application::start(SqliteStorage::open(&path)?)?;
  assert_eq!(application.snapshot().translations.len(), 1);
  assert_eq!(SqliteStorage::open(&path)?.schema_version()?, 2);
  Ok(())
}

#[test]
fn lookup_storage_failure_retains_cause_and_leaves_accepted_state_unchanged(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("lumina.sqlite3");
  let application = Application::start(SqliteStorage::open(&path)?)?;
  let before = application.snapshot().clone();
  let fixture = rusqlite::Connection::open(&path)?;
  fixture.execute_batch("DROP TABLE verses")?;
  let error = application
    .resolve_reference(ReferenceRequest {
      workspace_id: before.active_workspace_id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })
    .err()
    .ok_or("storage failure was accepted")?;
  assert!(matches!(error.public_failure(), ApplicationFailure::Storage { .. }));
  assert!(std::error::Error::source(&error).is_some());
  assert_eq!(application.snapshot(), &before);
  Ok(())
}

#[test]
fn canonical_lookup_returns_original_web_wording_without_selecting_current_content(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let application =
    Application::start(SqliteStorage::open(&directory.path().join("lumina.sqlite3"))?)?;
  let before = application.snapshot().clone();
  let coordinate = VerseCoordinate {
    book_number: 43,
    chapter: 3,
    verse: 16,
  };
  let result = application.resolve_reference(ReferenceRequest {
    workspace_id: before.active_workspace_id.clone(),
    coordinate,
  })?;
  assert_eq!(result.workspace_id, before.active_workspace_id);
  assert_eq!(result.verse.coordinate, coordinate);
  assert_eq!(result.verse.book_name, "John");
  assert_eq!(result.verse.translation_id, before.translations[0].translation_id);
  assert_eq!(result.verse.edition_id, before.translations[0].edition_id);
  assert_eq!(result.verse.translation_title, "World English Bible");
  assert_eq!(result.verse.text, "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.");
  assert_eq!(application.snapshot(), &before);
  Ok(())
}
