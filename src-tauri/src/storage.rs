//! Native Bible maintenance. Imported SQLite files are opened read-only.
use base64::Engine;
use rusqlite::{params, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  collections::{BTreeMap, HashMap, HashSet},
  fs,
  path::{Path, PathBuf},
  sync::{Mutex, OnceLock},
};
use tauri::Manager;

const WEB: &str = include_str!("../../public/bibles/web.json");
const MAX_IMPORT_BYTES: u64 = 128 * 1024 * 1024;
const MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;
const BACKGROUND_REFERENCE: &str = "managed-background:";
pub(crate) static MAINTENANCE: Mutex<()> = Mutex::new(());
static REVIEWS: OnceLock<Mutex<HashMap<PathBuf, String>>> = OnceLock::new();

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BookInformation {
  #[serde(skip_serializing_if = "Option::is_none")]
  author: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  date: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  location: Option<String>,
  source: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Book {
  number: u32,
  name: String,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  aliases: Vec<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  information: Option<BookInformation>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Verse {
  book: u32,
  chapter: u32,
  verse: u32,
  text: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Translation {
  id: String,
  edition: String,
  title: String,
  abbreviation: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  description: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  language: Option<String>,
  bundled: bool,
  available: bool,
  books: Vec<Book>,
  verses: Vec<Verse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReview {
  path: String,
  translations: Vec<Translation>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImportChoice {
  source_id: String,
  action: ImportAction,
  target_id: Option<String>,
  confirmed: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum ImportAction {
  Add,
  Replace,
  Restore,
  Skip,
}

fn message(error: impl std::fmt::Display) -> String {
  error.to_string()
}

fn operator(window: &tauri::WebviewWindow) -> Result<(), String> {
  if window.label() == "audience" {
    return Err("Bible maintenance is available only in the operator window.".into());
  }
  Ok(())
}

fn closed_audience(app: &tauri::AppHandle) -> Result<(), String> {
  if app.get_webview_window("audience").is_some() {
    return Err("Close the audience window before replacing or removing a translation.".into());
  }
  Ok(())
}

fn managed(app: &tauri::AppHandle) -> Result<Connection, String> {
  let directory = app.path().app_data_dir().map_err(message)?;
  fs::create_dir_all(&directory).map_err(message)?;
  let db = Connection::open(directory.join("lumina.sqlite3")).map_err(message)?;
  db.busy_timeout(std::time::Duration::from_secs(5))
    .map_err(message)?;
  db.execute_batch(
        "PRAGMA foreign_keys=ON;
         CREATE TABLE IF NOT EXISTS installed (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);",
    ).map_err(message)?;
  Ok(db)
}

fn bundled() -> Result<Translation, String> {
  serde_json::from_str(WEB).map_err(message)
}

fn library(db: &Connection) -> Result<Vec<Translation>, String> {
  let mut result = vec![bundled()?];
  let mut statement = db
    .prepare("SELECT payload FROM installed ORDER BY rowid")
    .map_err(message)?;
  let rows = statement
    .query_map([], |row| row.get::<_, String>(0))
    .map_err(message)?;
  for row in rows {
    result.push(serde_json::from_str(&row.map_err(message)?).map_err(message)?);
  }
  Ok(result)
}

fn digest(bytes: &[u8]) -> String {
  format!("sha256:{:x}", Sha256::digest(bytes))
}

fn content_digest(translation: &Translation) -> Result<String, String> {
  let normalized = (
    &translation.title,
    &translation.abbreviation,
    &translation.description,
    &translation.language,
    &translation.books,
    &translation.verses,
  );
  Ok(digest(&serde_json::to_vec(&normalized).map_err(message)?))
}

fn bounded_text(value: &str, label: &str, max: usize) -> Result<(), String> {
  if value.trim().is_empty() || value.len() > max || value.contains('\0') {
    return Err(format!(
      "{label} must be nonempty, contain no NUL, and be at most {max} UTF-8 bytes."
    ));
  }
  Ok(())
}

fn schema_table(db: &Connection, name: &str, required: &[&str]) -> Result<(), String> {
  let table_type: Option<String> = db
    .query_row(
      "SELECT type FROM sqlite_schema WHERE name=?1",
      [name],
      |row| row.get(0),
    )
    .map(Some)
    .or_else(|e| {
      if matches!(e, rusqlite::Error::QueryReturnedNoRows) {
        Ok(None)
      } else {
        Err(e)
      }
    })
    .map_err(message)?;
  if table_type.as_deref() != Some("table") {
    return Err(format!(
      "Import requires a real {name} table; views are unsupported."
    ));
  }
  let mut statement = db
    .prepare(&format!("PRAGMA table_info({name})"))
    .map_err(message)?;
  let columns = statement
    .query_map([], |row| row.get::<_, String>(1))
    .map_err(message)?
    .collect::<Result<HashSet<_>, _>>()
    .map_err(message)?;
  if required.iter().any(|column| !columns.contains(*column)) {
    return Err(format!("Import table {name} is missing contract columns."));
  }
  Ok(())
}

fn read_import(path: &Path) -> Result<(Vec<Translation>, String), String> {
  let metadata = fs::metadata(path).map_err(message)?;
  if !metadata.is_file() || metadata.len() > MAX_IMPORT_BYTES {
    return Err("Choose a SQLite file of at most 128 MiB.".into());
  }
  // Fingerprint the original bytes. A changed source must be reviewed again.
  let source_digest = digest(&fs::read(path).map_err(message)?);
  let mut wal_path = path.as_os_str().to_os_string();
  wal_path.push("-wal");
  if fs::metadata(PathBuf::from(wal_path)).is_ok_and(|meta| meta.len() > 0) {
    return Err(
      "Checkpoint and close the source database before importing; a WAL sidecar is present.".into(),
    );
  }
  let mut uri = url::Url::from_file_path(path).map_err(|()| "Invalid import file path.")?;
  uri
    .query_pairs_mut()
    .append_pair("immutable", "1")
    .append_pair("mode", "ro");
  let db = Connection::open_with_flags(
    uri.as_str(),
    OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX | OpenFlags::SQLITE_OPEN_URI,
  )
  .map_err(message)?;
  db.busy_timeout(std::time::Duration::from_secs(3))
    .map_err(message)?;
  db.execute_batch("PRAGMA query_only=ON; PRAGMA trusted_schema=OFF; BEGIN;")
    .map_err(message)?;
  let version: i64 = db
    .query_row("PRAGMA user_version", [], |row| row.get(0))
    .map_err(message)?;
  if version != 1 {
    return Err("Unsupported SQLite contract. PRAGMA user_version must be 1.".into());
  }
  let check: String = db
    .query_row("PRAGMA quick_check", [], |row| row.get(0))
    .map_err(message)?;
  if check != "ok" {
    return Err(format!("SQLite integrity check failed: {check}"));
  }
  schema_table(
    &db,
    "translations",
    &["id", "title", "abbreviation", "description", "language"],
  )?;
  schema_table(
    &db,
    "books",
    &["translation_id", "number", "name", "aliases", "information"],
  )?;
  schema_table(
    &db,
    "verses",
    &[
      "translation_id",
      "book_number",
      "chapter",
      "verse",
      "text",
      "sort_order",
    ],
  )?;
  let verse_count: i64 = db
    .query_row("SELECT count(*) FROM verses", [], |row| row.get(0))
    .map_err(message)?;
  if verse_count > 500_000 {
    return Err("Import exceeds the 500,000-verse limit.".into());
  }
  let limits: BTreeMap<(u32, u32), u32> =
    bundled()?
      .verses
      .iter()
      .fold(BTreeMap::new(), |mut map, verse| {
        map
          .entry((verse.book, verse.chapter))
          .and_modify(|max| *max = (*max).max(verse.verse))
          .or_insert(verse.verse);
        map
      });
  let mut result = Vec::new();
  let mut ids = HashSet::new();
  let mut statement = db
    .prepare("SELECT id,title,abbreviation,description,language FROM translations ORDER BY id")
    .map_err(message)?;
  let rows = statement
    .query_map([], |row| {
      Ok(Translation {
        id: row.get(0)?,
        edition: String::new(),
        title: row.get(1)?,
        abbreviation: row.get(2)?,
        description: row.get(3)?,
        language: row.get(4)?,
        bundled: false,
        available: true,
        books: Vec::new(),
        verses: Vec::new(),
      })
    })
    .map_err(message)?;
  for row in rows {
    let mut translation = row.map_err(message)?;
    bounded_text(&translation.id, "Translation source ID", 256)?;
    bounded_text(&translation.title, "Translation title", 512)?;
    bounded_text(&translation.abbreviation, "Translation abbreviation", 64)?;
    if let Some(value) = &translation.description {
      bounded_text(value, "Description", 16_384)?;
    }
    if let Some(value) = &translation.language {
      bounded_text(value, "Language", 64)?;
    }
    if !ids.insert(translation.id.clone()) || result.len() >= 100 {
      return Err("Duplicate source IDs or more than 100 translations.".into());
    }
    let mut books = db
      .prepare(
        "SELECT number,name,aliases,information FROM books WHERE translation_id=?1 ORDER BY number",
      )
      .map_err(message)?;
    let book_rows = books
      .query_map([&translation.id], |row| {
        Ok((
          row.get::<_, u32>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, Option<String>>(2)?,
          row.get::<_, Option<String>>(3)?,
        ))
      })
      .map_err(message)?;
    let mut numbers = HashSet::new();
    for row in book_rows {
      let (number, name, aliases, information) = row.map_err(message)?;
      if !(1..=66).contains(&number) || !numbers.insert(number) {
        return Err("Book numbers must be unique canonical numbers 1–66 per translation.".into());
      }
      bounded_text(&name, "Book name", 256)?;
      let aliases: Vec<String> = aliases
        .map(|value| serde_json::from_str(&value))
        .transpose()
        .map_err(message)?
        .unwrap_or_default();
      if aliases.len() > 64 {
        return Err("At most 64 aliases per book.".into());
      }
      for alias in &aliases {
        bounded_text(alias, "Book alias", 256)?;
      }
      let information: Option<BookInformation> = information
        .map(|value| serde_json::from_str(&value))
        .transpose()
        .map_err(message)?;
      if let Some(info) = &information {
        bounded_text(&info.source, "Book information source", 2048)?;
        for value in [&info.author, &info.date, &info.location]
          .into_iter()
          .flatten()
        {
          bounded_text(value, "Book information", 2048)?;
        }
      }
      translation.books.push(Book {
        number,
        name,
        aliases,
        information,
      });
    }
    let mut verses = db.prepare("SELECT book_number,chapter,verse,text,sort_order FROM verses WHERE translation_id=?1 ORDER BY book_number,chapter,verse").map_err(message)?;
    let verse_rows = verses
      .query_map([&translation.id], |row| {
        Ok((
          Verse {
            book: row.get(0)?,
            chapter: row.get(1)?,
            verse: row.get(2)?,
            text: row.get(3)?,
          },
          row.get::<_, i64>(4)?,
        ))
      })
      .map_err(message)?;
    let mut coordinates = HashSet::new();
    for row in verse_rows {
      let (verse, sort_order) = row.map_err(message)?;
      let expected = i64::from(verse.book) * 1_000_000
        + i64::from(verse.chapter) * 1000
        + i64::from(verse.verse);
      if !numbers.contains(&verse.book)
        || verse.verse == 0
        || limits
          .get(&(verse.book, verse.chapter))
          .is_none_or(|max| verse.verse > *max)
        || sort_order != expected
        || !coordinates.insert((verse.book, verse.chapter, verse.verse))
      {
        return Err(format!(
          "Invalid/duplicate canonical coordinate or sort_order at {} {}:{}.",
          verse.book, verse.chapter, verse.verse
        ));
      }
      bounded_text(&verse.text, "Verse text", 65_536)?;
      translation.verses.push(verse);
    }
    if translation.verses.is_empty()
      || translation.books.iter().any(|book| {
        !translation
          .verses
          .iter()
          .any(|verse| verse.book == book.number)
      })
    {
      return Err("Each translation and every listed book must contain at least one verse.".into());
    }
    // Edition excludes local row IDs and installed identity; metadata changes count.
    translation.edition = content_digest(&translation)?;
    result.push(translation);
  }
  if result.is_empty() {
    return Err("Import contains no translations.".into());
  }
  let orphaned: i64 = db.query_row(
        "SELECT (SELECT count(*) FROM books b WHERE NOT EXISTS (SELECT 1 FROM translations t WHERE t.id=b.translation_id)) + (SELECT count(*) FROM verses v WHERE NOT EXISTS (SELECT 1 FROM translations t WHERE t.id=v.translation_id))", [], |row| row.get(0),
    ).map_err(message)?;
  if orphaned != 0 {
    return Err("Import contains records without a translation.".into());
  }
  db.execute_batch("ROLLBACK;").map_err(message)?;
  if digest(&fs::read(path).map_err(message)?) != source_digest {
    return Err("Source changed during validation. Close its editor and review again.".into());
  }
  Ok((result, source_digest))
}

#[tauri::command]
pub fn load_library(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
) -> Result<Vec<Translation>, String> {
  operator(&window)?;
  library(&managed(&app)?)
}

#[tauri::command]
pub async fn review_import(
  window: tauri::WebviewWindow,
  path: String,
) -> Result<ImportReview, String> {
  operator(&window)?;
  tauri::async_runtime::spawn_blocking(move || {
    let canonical = fs::canonicalize(path).map_err(message)?;
    let (translations, hash) = read_import(&canonical)?;
    REVIEWS
      .get_or_init(|| Mutex::new(HashMap::new()))
      .lock()
      .map_err(message)?
      .insert(canonical.clone(), hash);
    Ok(ImportReview {
      path: canonical.to_string_lossy().into_owned(),
      translations,
    })
  })
  .await
  .map_err(message)?
}

fn install_review(
  app: &tauri::AppHandle,
  path: &str,
  choices: Vec<ImportChoice>,
) -> Result<Vec<Translation>, String> {
  let _lock = MAINTENANCE.lock().map_err(message)?;
  let canonical = fs::canonicalize(path).map_err(message)?;
  let (translations, hash) = read_import(&canonical)?;
  let reviewed = REVIEWS
    .get_or_init(|| Mutex::new(HashMap::new()))
    .lock()
    .map_err(message)?
    .get(&canonical)
    .cloned();
  if reviewed.as_deref() != Some(&hash) {
    return Err("Source must be reviewed again before acceptance.".into());
  }
  let mut db = managed(app)?;
  let transaction = db.transaction().map_err(message)?;
  let mut installed = library(&transaction)?;
  // The starter retains its publisher-artifact edition identity. Compare its
  // canonical content using the same digest as imports, independent of packaging.
  let starter_digest = installed
    .iter()
    .find(|item| item.bundled)
    .map(content_digest)
    .transpose()?;
  let mut seen_sources = HashSet::new();
  let mut seen_targets = HashSet::new();
  let mut replacing = false;
  for choice in choices {
    if !seen_sources.insert(choice.source_id.clone()) {
      return Err("Each source translation needs exactly one choice.".into());
    }
    let mut incoming = translations
      .iter()
      .find(|item| item.id == choice.source_id)
      .cloned()
      .ok_or("Unknown source translation.")?;
    if matches!(choice.action, ImportAction::Skip) {
      continue;
    }
    let duplicate = installed.iter().any(|item| {
      item.available
        && (item.edition == incoming.edition
          || (item.bundled && starter_digest.as_deref() == Some(incoming.edition.as_str())))
    });
    match choice.action {
      ImportAction::Add => {
        if duplicate {
          continue;
        }
        incoming.id = uuid::Uuid::new_v4().to_string();
      }
      ImportAction::Replace | ImportAction::Restore => {
        if !choice.confirmed {
          return Err("Confirm the maintenance action before accepting.".into());
        }
        if matches!(choice.action, ImportAction::Replace) {
          closed_audience(app)?;
          replacing = true;
        }
        let target_id = choice
          .target_id
          .ok_or("Choose an installed entry to replace or restore.")?;
        if !seen_targets.insert(target_id.clone()) {
          return Err("One target cannot receive multiple editions in one import.".into());
        }
        let target = installed
          .iter()
          .find(|item| item.id == target_id)
          .ok_or("Target entry no longer exists.")?;
        if target.bundled {
          return Err("The bundled WEB cannot be replaced or restored.".into());
        }
        if matches!(choice.action, ImportAction::Restore) == target.available {
          return Err(
            "Replace requires an available entry; Restore requires a removed entry.".into(),
          );
        }
        if duplicate
          && !installed
            .iter()
            .any(|item| item.id == target_id && item.edition == incoming.edition && item.available)
        {
          return Err(
            "This exact edition is already available in another entry; skip it instead.".into(),
          );
        }
        incoming.id = target_id;
      }
      ImportAction::Skip => continue,
    }
    transaction.execute("INSERT INTO installed(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", params![incoming.id, serde_json::to_string(&incoming).map_err(message)?]).map_err(message)?;
    installed.retain(|item| item.id != incoming.id);
    installed.push(incoming);
  }
  if seen_sources.len() != translations.len() {
    return Err("Review a choice for every source translation, including Skip.".into());
  }
  // Check again immediately before commit, after source validation and copying.
  if replacing {
    closed_audience(app)?;
  }
  transaction.commit().map_err(message)?;
  library(&db)
}

#[tauri::command]
pub async fn accept_import(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
  path: String,
  choices: Vec<ImportChoice>,
) -> Result<Vec<Translation>, String> {
  operator(&window)?;
  tauri::async_runtime::spawn_blocking(move || install_review(&app, &path, choices))
    .await
    .map_err(message)?
}

#[tauri::command]
pub fn remove_translation(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
  id: String,
  confirmed: bool,
) -> Result<Vec<Translation>, String> {
  operator(&window)?;
  let _lock = MAINTENANCE.lock().map_err(message)?;
  if !confirmed {
    return Err("Confirm Remove before continuing.".into());
  }
  closed_audience(&app)?;
  let mut db = managed(&app)?;
  let transaction = db.transaction().map_err(message)?;
  let mut target = library(&transaction)?
    .into_iter()
    .find(|item| item.id == id)
    .ok_or("Translation entry no longer exists.")?;
  if target.bundled {
    return Err("The bundled WEB cannot be removed.".into());
  }
  target.available = false;
  target.verses.clear();
  transaction
    .execute(
      "UPDATE installed SET payload=?1 WHERE id=?2",
      params![serde_json::to_string(&target).map_err(message)?, id],
    )
    .map_err(message)?;
  transaction.commit().map_err(message)?;
  library(&db)
}

// Runtime rendering uses data URLs; the workspace stores only managed asset names.
fn image_format(bytes: &[u8]) -> Result<(&'static str, &'static str), String> {
  match image::guess_format(bytes).map_err(message)? {
    image::ImageFormat::Jpeg => Ok(("image/jpeg", "jpg")),
    image::ImageFormat::Png => Ok(("image/png", "png")),
    image::ImageFormat::Bmp => Ok(("image/bmp", "bmp")),
    _ => Err("Choose a JPEG, PNG, or BMP image.".into()),
  }
}

fn validate_image(bytes: &[u8]) -> Result<(&'static str, &'static str), String> {
  if bytes.len() as u64 > MAX_IMAGE_BYTES {
    return Err("Background must be at most 20 MiB.".into());
  }
  let (mime, extension) = image_format(bytes)?;
  let format = image::guess_format(bytes).map_err(message)?;
  let mut reader = image::ImageReader::with_format(std::io::Cursor::new(bytes), format);
  let mut limits = image::Limits::default();
  limits.max_image_width = Some(8192);
  limits.max_image_height = Some(8192);
  limits.max_alloc = Some(256 * 1024 * 1024);
  reader.limits(limits);
  let decoded = reader.decode().map_err(message)?;
  if u64::from(decoded.width()) * u64::from(decoded.height()) > 32_000_000 {
    return Err("Background must be at most 32 megapixels.".into());
  }
  Ok((mime, extension))
}

fn background_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  Ok(
    app
      .path()
      .app_data_dir()
      .map_err(message)?
      .join("backgrounds"),
  )
}

fn store_background(
  app: &tauri::AppHandle,
  bytes: &[u8],
  extension: &str,
) -> Result<String, String> {
  let directory = background_directory(app)?;
  fs::create_dir_all(&directory).map_err(message)?;
  let name = format!(
    "{}.{}",
    digest(bytes).trim_start_matches("sha256:"),
    extension
  );
  let target = directory.join(&name);
  if !target.exists() {
    let temporary = directory.join(format!("{}.tmp", uuid::Uuid::new_v4()));
    fs::write(&temporary, bytes).map_err(message)?;
    if let Err(error) = fs::rename(&temporary, target) {
      let _ = fs::remove_file(&temporary);
      return Err(message(error));
    }
  }
  Ok(format!("{BACKGROUND_REFERENCE}{name}"))
}

fn background_data_url(app: &tauri::AppHandle, reference: &str) -> Result<String, String> {
  let name = reference
    .strip_prefix(BACKGROUND_REFERENCE)
    .ok_or("Invalid managed background reference.")?;
  let (hash, extension) = name
    .split_once('.')
    .ok_or("Invalid managed background name.")?;
  if hash.len() != 64
    || !hash.bytes().all(|value| value.is_ascii_hexdigit())
    || !matches!(extension, "jpg" | "png" | "bmp")
  {
    return Err("Invalid managed background name.".into());
  }
  let path = background_directory(app)?.join(name);
  let metadata = fs::metadata(&path).map_err(message)?;
  if !metadata.is_file() || metadata.len() > MAX_IMAGE_BYTES {
    return Err("Managed background exceeds the image limit.".into());
  }
  let bytes = fs::read(path).map_err(message)?;
  let (mime, actual_extension) = image_format(&bytes)?;
  if bytes.len() as u64 > MAX_IMAGE_BYTES
    || digest(&bytes) != format!("sha256:{hash}")
    || extension != actual_extension
  {
    return Err("Managed background has changed.".into());
  }
  Ok(format!(
    "data:{mime};base64,{}",
    base64::engine::general_purpose::STANDARD.encode(bytes)
  ))
}

fn persist_backgrounds(
  app: &tauri::AppHandle,
  workspace: &mut serde_json::Value,
) -> Result<(), String> {
  let Some(backgrounds) = workspace
    .pointer_mut("/appearance/backgrounds")
    .and_then(serde_json::Value::as_object_mut)
  else {
    return Ok(());
  };
  for background in backgrounds.values_mut() {
    let Some(image) = background.get_mut("image") else {
      continue;
    };
    let Some(url) = image.as_str() else {
      continue;
    };
    if url.starts_with(BACKGROUND_REFERENCE) {
      // Validate references supplied to the command without accepting arbitrary paths.
      background_data_url(app, url)?;
      continue;
    }
    let (header, encoded) = url.split_once(',').ok_or("Invalid background data URL.")?;
    if !matches!(
      header,
      "data:image/jpeg;base64" | "data:image/png;base64" | "data:image/bmp;base64"
    ) || encoded.len() > (MAX_IMAGE_BYTES as usize).div_ceil(3) * 4
    {
      return Err("Choose a JPEG, PNG, or BMP image of at most 20 MiB.".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
      .decode(encoded)
      .map_err(message)?;
    let (mime, extension) = validate_image(&bytes)?;
    if header != format!("data:{mime};base64") {
      return Err("Background format does not match its data URL.".into());
    }
    *image = serde_json::Value::String(store_background(app, &bytes, extension)?);
  }
  Ok(())
}

fn hydrate_backgrounds(app: &tauri::AppHandle, workspace: &mut serde_json::Value) {
  let Some(backgrounds) = workspace
    .pointer_mut("/appearance/backgrounds")
    .and_then(serde_json::Value::as_object_mut)
  else {
    return;
  };
  for background in backgrounds.values_mut() {
    let Some(image) = background.get_mut("image") else {
      continue;
    };
    let Some(reference) = image
      .as_str()
      .filter(|value| value.starts_with(BACKGROUND_REFERENCE))
    else {
      continue;
    };
    // An absent/corrupt image falls back to its translation color; preparation survives.
    *image = background_data_url(app, reference)
      .map(serde_json::Value::String)
      .unwrap_or(serde_json::Value::Null);
  }
}

#[tauri::command]
pub fn load_workspace(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
) -> Result<Option<serde_json::Value>, String> {
  operator(&window)?;
  let db = managed(&app)?;
  let payload: Option<String> = db
    .query_row("SELECT payload FROM workspace WHERE id=1", [], |row| {
      row.get(0)
    })
    .map(Some)
    .or_else(|error| {
      if matches!(error, rusqlite::Error::QueryReturnedNoRows) {
        Ok(None)
      } else {
        Err(error)
      }
    })
    .map_err(message)?;
  let mut workspace = payload
    .map(|value| serde_json::from_str(&value))
    .transpose()
    .map_err(message)?;
  if let Some(value) = &mut workspace {
    hydrate_backgrounds(&app, value);
  }
  Ok(workspace)
}

#[tauri::command]
pub fn save_workspace(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
  mut workspace: serde_json::Value,
) -> Result<(), String> {
  operator(&window)?;
  persist_backgrounds(&app, &mut workspace)?;
  let payload = serde_json::to_string(&workspace).map_err(message)?;
  if payload.len() > 32 * 1024 * 1024 {
    return Err("Workspace exceeds the 32 MiB storage limit.".into());
  }
  managed(&app)?.execute("INSERT INTO workspace(id,payload) VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", [payload]).map_err(message)?;
  Ok(())
}

#[tauri::command]
pub async fn pick_import(window: tauri::WebviewWindow) -> Result<Option<String>, String> {
  operator(&window)?;
  Ok(
    rfd::AsyncFileDialog::new()
      .set_title("Import Bible SQLite")
      .add_filter("SQLite Bible", &["sqlite", "sqlite3", "db"])
      .pick_file()
      .await
      .map(|file| file.path().to_string_lossy().into_owned()),
  )
}

#[tauri::command]
pub async fn pick_background(
  app: tauri::AppHandle,
  window: tauri::WebviewWindow,
) -> Result<Option<String>, String> {
  operator(&window)?;
  let Some(file) = rfd::AsyncFileDialog::new()
    .set_title("Choose translation background")
    .add_filter("Images", &["jpg", "jpeg", "png", "bmp"])
    .pick_file()
    .await
  else {
    return Ok(None);
  };
  let path = file.path().to_path_buf();
  tauri::async_runtime::spawn_blocking(move || {
    let metadata = fs::metadata(&path).map_err(message)?;
    if !metadata.is_file() || metadata.len() > MAX_IMAGE_BYTES {
      return Err("Background must be at most 20 MiB.".into());
    }
    let bytes = fs::read(path).map_err(message)?;
    let (mime, extension) = validate_image(&bytes)?;
    store_background(&app, &bytes, extension)?;
    Ok(Some(format!(
      "data:{mime};base64,{}",
      base64::engine::general_purpose::STANDARD.encode(&bytes)
    )))
  })
  .await
  .map_err(message)?
}
