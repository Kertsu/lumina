//! One atomic bootstrap publishes schema, bundled content, and durable defaults.

use crate::StorageError;
use lumina_app::{
  EditionId, StoredState, StoredWorkspace, Translation, TranslationId, TranslationSource,
  WorkspaceId, WorkspaceSettings,
};
use rusqlite::{params, Connection, OptionalExtension, Transaction, MAIN_DB};

const WEB: &[u8] = include_bytes!("../seed/engwebp.lumina.sqlite");

#[derive(serde::Deserialize)]
struct Provenance {
  publisher_edition_id: String,
  artifact_sha256: String,
}

pub(crate) fn bootstrap(transaction: &Transaction<'_>) -> Result<StoredState, StorageError> {
  let provenance: Provenance = serde_json::from_str(include_str!("../seed/provenance.json"))
    .map_err(StorageError::SeedProvenance)?;
  let web_id: Option<String> = transaction
    .query_row(
      "SELECT id FROM translations WHERE bundled = 1 AND publisher_edition_id = ?1",
      [&provenance.publisher_edition_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(StorageError::Seed)?;
  let web_id = match web_id {
    Some(id) => id,
    None => install_web(transaction, &provenance).map_err(StorageError::Seed)?,
  };
  transaction
    .execute(
      "INSERT INTO workspaces (name, position, selected_translation_id)
       SELECT 'Audience 1', 0, ?1 WHERE NOT EXISTS (SELECT 1 FROM workspaces)",
      [&web_id],
    )
    .map_err(StorageError::StartupState)?;
  transaction
    .execute(
      "INSERT INTO application_settings (singleton, active_workspace_id)
       SELECT 1, id FROM workspaces WHERE NOT EXISTS (SELECT 1 FROM application_settings)
       ORDER BY position, id LIMIT 1",
      [],
    )
    .map_err(StorageError::StartupState)?;
  // Reject corrupt pre-existing relationships before publishing application state.
  let invalid = transaction
    .prepare("PRAGMA foreign_key_check")
    .map_err(StorageError::StartupState)?
    .exists([])
    .map_err(StorageError::StartupState)?;
  if invalid {
    return Err(StorageError::InvalidState);
  }
  read_state(transaction).map_err(StorageError::StartupState)
}

fn install_web(transaction: &Transaction<'_>, provenance: &Provenance) -> rusqlite::Result<String> {
  let mut seed = Connection::open_in_memory()?;
  seed.deserialize_bytes(MAIN_DB, WEB)?;
  let version: u32 = seed.pragma_query_value(None, "user_version", |row| row.get(0))?;
  if version != 1 {
    return Err(rusqlite::Error::InvalidQuery);
  }
  let translation_id: String = seed.query_row(
    "SELECT title, description, edition_label, source_name, source_url, rights_notice
     FROM translations WHERE id = 1",
    [],
    |row| {
      transaction.query_row(
        "INSERT INTO translations
         (title, description, edition_label, source_name, source_url, rights_notice,
          publisher_edition_id, artifact_sha256, bundled)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1) RETURNING id",
        params![
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, Option<String>>(2)?,
          row.get::<_, Option<String>>(3)?,
          row.get::<_, Option<String>>(4)?,
          row.get::<_, Option<String>>(5)?,
          provenance.publisher_edition_id,
          provenance.artifact_sha256,
        ],
        |installed| installed.get(0),
      )
    },
  )?;
  let mut books = seed.prepare("SELECT book_number, name FROM books ORDER BY book_number")?;
  let mut insert_book = transaction
    .prepare("INSERT INTO books (translation_id, book_number, name) VALUES (?1, ?2, ?3)")?;
  let mut rows = books.query([])?;
  while let Some(row) = rows.next()? {
    insert_book.execute(params![
      translation_id,
      row.get::<_, i32>(0)?,
      row.get::<_, String>(1)?
    ])?;
  }
  let mut verses = seed.prepare(
    "SELECT b.book_number, v.chapter, v.verse, v.text, v.sort_order FROM verses v
     JOIN books b ON b.id = v.book_id AND b.translation_id = v.translation_id ORDER BY v.id",
  )?;
  let mut insert_verse = transaction.prepare(
    "INSERT INTO verses (translation_id, book_id, chapter, verse, text, sort_order)
     VALUES (?1, (SELECT id FROM books WHERE translation_id = ?1 AND book_number = ?2),
             ?3, ?4, ?5, ?6)",
  )?;
  let mut rows = verses.query([])?;
  while let Some(row) = rows.next()? {
    insert_verse.execute(params![
      translation_id,
      row.get::<_, i32>(0)?,
      row.get::<_, i32>(1)?,
      row.get::<_, i32>(2)?,
      row.get::<_, String>(3)?,
      row.get::<_, i64>(4)?,
    ])?;
  }
  Ok(translation_id)
}

pub(crate) fn read_state(transaction: &Transaction<'_>) -> rusqlite::Result<StoredState> {
  let mut translations = transaction.prepare(
    "SELECT t.id, t.edition_id, t.title, t.description, t.bundled,
       (SELECT count(*) FROM books b WHERE b.translation_id = t.id),
       (SELECT count(*) FROM verses v WHERE v.translation_id = t.id),
       t.publisher_edition_id, t.artifact_sha256, t.edition_label,
       t.source_name, t.source_url, t.rights_notice,
       (SELECT filename FROM imports i WHERE i.id=t.import_id)
     FROM translations t ORDER BY t.bundled DESC, t.id",
  )?;
  let translations = translations
    .query_map([], |row| {
      Ok(Translation {
        translation_id: TranslationId(row.get(0)?),
        edition_id: EditionId(row.get(1)?),
        title: row.get(2)?,
        description: row.get(3)?,
        bundled: row.get(4)?,
        book_count: row.get(5)?,
        verse_count: row.get(6)?,
        source: TranslationSource {
          import_filename: row.get(13)?,
          publisher_edition_id: row.get(7)?,
          artifact_sha256: row.get(8)?,
          edition_label: row.get(9)?,
          source_name: row.get(10)?,
          source_url: row.get(11)?,
          rights_notice: row.get(12)?,
        },
      })
    })?
    .collect::<rusqlite::Result<Vec<_>>>()?;
  let mut workspaces = transaction.prepare(
    "SELECT id, name, selected_translation_id, hide_cursor FROM workspaces ORDER BY position, id",
  )?;
  let workspaces = workspaces
    .query_map([], |row| {
      Ok(StoredWorkspace {
        workspace_id: WorkspaceId(row.get(0)?),
        settings: WorkspaceSettings {
          name: row.get(1)?,
          selected_translation_id: TranslationId(row.get(2)?),
          hide_cursor: row.get(3)?,
        },
      })
    })?
    .collect::<rusqlite::Result<Vec<_>>>()?;
  let active_workspace_id = transaction.query_row(
    "SELECT active_workspace_id FROM application_settings WHERE singleton = 1",
    [],
    |row| row.get(0).map(WorkspaceId),
  )?;
  Ok(StoredState {
    translations,
    workspaces,
    active_workspace_id,
  })
}
