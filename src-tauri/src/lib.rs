mod audience;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let result = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      audience::setup(app.handle());
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      storage::load_library,
      storage::review_import,
      storage::accept_import,
      storage::remove_translation,
      storage::load_workspaces,
      storage::save_workspaces,
      storage::load_workspace,
      storage::save_workspace,
      storage::pick_import,
      storage::pick_background,
      audience::open_audience,
      audience::close_audience,
      audience::audience_is_open,
      audience::audience_payload,
      audience::publish_audience,
      audience::set_audience_fullscreen,
      audience::set_operator_on_top,
      audience::set_cursor_restriction,
      audience::cursor_restriction_enabled,
    ])
    .run(tauri::generate_context!());
  if let Err(error) = result {
    eprintln!("Lumina could not start: {error}");
  }
}
