//! One command/event registration shared by the runtime and headless generator.

pub(crate) fn registration() -> tauri_specta::Builder<tauri::Wry> {
  tauri_specta::Builder::new()
    .commands(tauri_specta::collect_commands![super::greet])
    .events(tauri_specta::collect_events![])
    // Rejections stay unknown until the frontend bridge validates their shape.
    .error_handling(tauri_specta::ErrorHandlingMode::Throw)
    .typ::<lumina_app::ApplicationFailure>()
}
