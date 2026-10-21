mod runtime;

use lumina_app::Application;
use lumina_persistence::SqliteStorage;
use runtime::DesktopRuntime;
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[tauri::command]
async fn greet(runtime: tauri::State<'_, DesktopRuntime>) -> Result<String, String> {
  runtime
    .call(|_application| {
      let epoch_ms = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis();
      Ok(format!("Hello world from Rust! Current epoch: {epoch_ms}"))
    })
    .await
    .map_err(|error| {
      report_error("greet", &error);
      error.to_string()
    })
}

/// Compose the desktop dependencies and run the native event loop.
///
/// # Errors
/// Returns native setup or event-loop failures. Storage startup failures are
/// reported separately while the operator window remains usable.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<()> {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![greet])
    .setup(|app| {
      let database_path = app.path().app_data_dir()?.join("lumina.sqlite3");
      let runtime = DesktopRuntime::new();
      app.manage(runtime.clone());
      eprintln!("Lumina: initializing managed database {}", database_path.display());
      // Returning immediately keeps the native event loop free during startup.
      tauri::async_runtime::spawn(async move {
        let result = runtime
          .initialize(move || {
            let storage = SqliteStorage::open(&database_path)?;
            Ok(Application::start(storage)?)
          })
          .await;
        match result {
          Ok(()) => eprintln!("Lumina: managed database ready"),
          Err(error) => report_error("startup", &error),
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
}

/// Print the ordinary terminal diagnostic, including each retained source cause.
pub fn report_error(context: &str, error: &dyn Error) {
  eprintln!("Lumina {context}: {error}");
  let mut source = error.source();
  while let Some(cause) = source {
    eprintln!("  caused by: {cause}");
    source = cause.source();
  }
}
