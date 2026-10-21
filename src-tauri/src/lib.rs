use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
fn greet() -> Result<String, String> {
  let epoch_ms = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|error| {
      report_error("greet", &error);
      error.to_string()
    })?
    .as_millis();
  Ok(format!("Hello world from Rust! Current epoch: {epoch_ms}"))
}

/// Run the native event loop.
///
/// # Errors
/// Returns native setup or event-loop failures.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<()> {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![greet])
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
