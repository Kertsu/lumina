mod bindings;
mod commands;
mod native;
mod quit;
mod runtime;
#[cfg(target_os = "macos")]
mod window_chrome;

use lumina_app::{
  Application, ApplicationFailure, ApplicationSnapshot, Greeting, ReferenceRequest, ReferenceResult,
};
use lumina_persistence::SqliteStorage;
use runtime::DesktopRuntime;
use std::error::Error;
use std::time::SystemTime;
use tauri::Manager;
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
async fn greet(runtime: tauri::State<'_, DesktopRuntime>) -> Result<Greeting, ApplicationFailure> {
  runtime
    .call(|application| application.greet(SystemTime::now()).map_err(runtime::RuntimeError::Clock))
    .await
    .map_err(|error| {
      report_error("greet", &error);
      error.public_failure()
    })
}

#[tauri::command]
#[specta::specta]
async fn get_application_state(
  runtime: tauri::State<'_, DesktopRuntime>,
) -> Result<ApplicationSnapshot, ApplicationFailure> {
  runtime.call(|application| Ok(application.snapshot().clone())).await.map_err(|error| {
    report_error("get_application_state", &error);
    error.public_failure()
  })
}

#[tauri::command]
#[specta::specta]
async fn resolve_reference(
  runtime: tauri::State<'_, DesktopRuntime>,
  request: ReferenceRequest,
) -> Result<ReferenceResult, ApplicationFailure> {
  runtime
    .call(move |application| {
      application.resolve_reference(request).map_err(runtime::RuntimeError::Application)
    })
    .await
    .map_err(|error| {
      report_error("resolve_reference", &error);
      error.public_failure()
    })
}

/// Compose the desktop dependencies and run the native event loop.
///
/// # Errors
/// Returns native setup or event-loop failures. Storage startup failures are
/// reported separately while the operator window remains usable.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<()> {
  let bindings = bindings::registration();
  tauri::Builder::default()
    .manage(quit::QuitPrompt::default())
    .menu(quit::menu)
    .on_menu_event(|app, event| {
      if event.id().as_ref() == quit::QUIT_MENU_ID {
        quit::request_confirmation(app);
      }
    })
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(bindings.invoke_handler())
    .on_window_event(|window, event| {
      if window.label() == "main" {
        if let tauri::WindowEvent::CloseRequested {
          api,
          ..
        } = event
        {
          api.prevent_close();
          quit::request_confirmation(window.app_handle());
          return;
        }
      }
      if matches!(event, tauri::WindowEvent::Destroyed) && window.label() != "main" {
        let windows = window.state::<native::NativeWindows>();
        if let Some(owner) = windows.retire(window.label()) {
          let runtime = window.state::<DesktopRuntime>().inner().clone();
          let app = window.app_handle().clone();
          tauri::async_runtime::spawn(async move {
            let result = runtime
              .call(move |application| {
                application.audience_closed(&owner.instance_id);
                Ok(())
              })
              .await;
            if let Err(error) = result {
              report_error("audience closure", &error);
            }
            let _ = (native::ApplicationChanged {
              workspace_id: None,
            })
            .emit_to(&app, "main");
          });
        }
      }
    })
    .setup(move |app| {
      bindings.mount_events(app);
      #[cfg(target_os = "macos")]
      if let Some(window) = app.get_webview_window("main") {
        window_chrome::install(&window);
      }
      let database_path = app.path().app_data_dir()?.join("lumina.sqlite3");
      let runtime = DesktopRuntime::new();
      app.manage(runtime.clone());
      let windows = native::NativeWindows::default();
      app.manage(windows.clone());
      let app_handle = app.handle().clone();
      start_runtime_notifications(app_handle.clone(), runtime.clone(), windows);
      eprintln!("Lumina: initializing managed database {}", database_path.display());
      // Returning immediately keeps the native event loop free during startup.
      tauri::async_runtime::spawn(async move {
        let result = runtime
          .initialize(move || {
            let storage = SqliteStorage::open(&database_path)?;
            let mut application = Application::start(storage)?;
            application.restore_workflows()?;
            Ok(application)
          })
          .await;
        match result {
          Ok(()) => {
            eprintln!("Lumina: managed database ready");
            let _ = (native::ApplicationChanged {
              workspace_id: None,
            })
            .emit_to(&app_handle, "main");
          }
          Err(error) => report_error("startup", &error),
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
}

/// Export contracts to the supplied path without constructing a desktop application.
///
/// # Errors
/// Returns export or file access diagnostics.
pub fn export_bindings(path: &std::path::Path) -> Result<(), Box<dyn Error>> {
  bindings::registration().export(specta_typescript::Typescript::default(), path)?;
  Ok(())
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

fn start_runtime_notifications(
  app: tauri::AppHandle,
  runtime: DesktopRuntime,
  windows: native::NativeWindows,
) {
  tauri::async_runtime::spawn(async move {
    loop {
      tokio::time::sleep(std::time::Duration::from_secs(1)).await;
      let disconnected = windows.disconnected(&app);
      let mut native = windows.adapter(app.clone());
      let result = runtime
        .call(move |application| {
          let mut changed = false;
          for owner in disconnected {
            if let Err(error) = application.close_audience(&owner.workspace_id, &mut native) {
              report_error("display loss", &error);
              application.audience_closed(&owner.instance_id);
            }
            changed = true;
          }
          Ok(
            application
              .expire_projections(commands::now_ms())
              .map_err(runtime::RuntimeError::Application)?
              || changed,
          )
        })
        .await;
      match result {
        Ok(true) => {
          let _ = (native::ApplicationChanged {
            workspace_id: None,
          })
          .emit_to(&app, "main");
        }
        Err(runtime::RuntimeError::Starting | runtime::RuntimeError::Startup(_)) | Ok(false) => {}
        Err(error) => report_error("audience state", &error),
      }
    }
  });
}
