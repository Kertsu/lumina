// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::time::{SystemTime, UNIX_EPOCH};
#[cfg(desktop)]
use tauri::{Emitter, Manager};

#[cfg(desktop)]
mod menu;

#[tauri::command]
fn greet() -> String {
  let now = SystemTime::now();
  let epoch_ms = now.duration_since(UNIX_EPOCH).unwrap().as_millis();
  format!("Hello world from Rust! Current epoch: {epoch_ms}")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![greet]);

  #[cfg(desktop)]
  let builder = builder
    .menu(menu::operator_menu)
    .on_menu_event(|app, event| {
      let action = match event.id().as_ref() {
        menu::CLOSE_TAB_ID => "close",
        menu::NEW_TAB_ID => "new",
        _ => return,
      };
      if let Some(window) = app.get_webview_window("main") {
        if window.is_focused().unwrap_or(false) {
          if let Err(error) = window.emit("lumina:tab-shortcut", action) {
            eprintln!("Could not handle tab shortcut: {error}");
          }
        }
      }
    });

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
