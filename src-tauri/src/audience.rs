use std::{sync::Mutex, thread, time::Duration};

use serde::{Deserialize, Serialize};
use tauri::{
  AppHandle, Emitter, Manager, Monitor, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
  WindowEvent,
};

const AUDIENCE: &str = "audience";

#[derive(Clone, Deserialize, Serialize)]
pub struct AudiencePayload {
  selection: Option<serde_json::Value>,
  appearance: serde_json::Value,
  blank: bool,
}

#[derive(Default)]
pub struct AudienceState(Mutex<Option<AudiencePayload>>);

fn operator(window: &WebviewWindow) -> Result<(), String> {
  if window.label() == "main" {
    Ok(())
  } else {
    Err("Audience controls are available only in the operator window.".into())
  }
}

fn output(app: &AppHandle) -> Result<WebviewWindow, String> {
  app
    .get_webview_window(AUDIENCE)
    .ok_or_else(|| "Open Audience before changing audience output.".into())
}

fn clear(app: &AppHandle) {
  if let Ok(mut payload) = app.state::<AudienceState>().0.lock() {
    *payload = None;
  }
  let _ = app.emit_to("main", "lumina:audience-open", false);
}

#[tauri::command]
pub fn audience_is_open(app: AppHandle) -> bool {
  app.get_webview_window(AUDIENCE).is_some()
}

#[tauri::command]
pub fn audience_payload(app: AppHandle) -> Result<Option<AudiencePayload>, String> {
  let state = app.state::<AudienceState>();
  let payload = state.0.lock().map_err(|error| error.to_string())?.clone();
  Ok(payload)
}

#[tauri::command]
pub async fn open_audience(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
  operator(&window)?;
  let _maintenance = crate::storage::MAINTENANCE
    .lock()
    .map_err(|error| error.to_string())?;
  if let Some(audience) = app.get_webview_window(AUDIENCE) {
    audience.set_focus().map_err(|error| error.to_string())?;
    return Ok(());
  }
  *app
    .state::<AudienceState>()
    .0
    .lock()
    .map_err(|error| error.to_string())? = None;
  let audience = WebviewWindowBuilder::new(&app, AUDIENCE, WebviewUrl::App("/?audience=1".into()))
    .title("Lumina — Audience")
    .inner_size(1280.0, 720.0)
    .background_color(tauri::window::Color(0, 0, 0, 255))
    .visible(false)
    .build()
    .map_err(|error| error.to_string())?;
  let handle = app.clone();
  audience.on_window_event(move |event| {
    if matches!(event, WindowEvent::Destroyed) {
      clear(&handle);
    }
  });
  audience
    .set_cursor_visible(false)
    .map_err(|error| error.to_string())?;
  audience.show().map_err(|error| error.to_string())?;
  app
    .emit_to("main", "lumina:audience-open", true)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_audience(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
  operator(&window)?;
  if let Some(audience) = app.get_webview_window(AUDIENCE) {
    audience.destroy().map_err(|error| error.to_string())?;
  }
  clear(&app);
  Ok(())
}

#[tauri::command]
pub fn publish_audience(
  app: AppHandle,
  window: WebviewWindow,
  payload: AudiencePayload,
) -> Result<(), String> {
  operator(&window)?;
  let audience = output(&app)?;
  *app
    .state::<AudienceState>()
    .0
    .lock()
    .map_err(|error| error.to_string())? = Some(payload.clone());
  audience
    .emit("lumina:audience-payload", payload)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_audience_fullscreen(
  app: AppHandle,
  window: WebviewWindow,
  value: bool,
) -> Result<(), String> {
  operator(&window)?;
  output(&app)?
    .set_fullscreen(value)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_operator_on_top(window: WebviewWindow, value: bool) -> Result<(), String> {
  operator(&window)?;
  window
    .set_always_on_top(value)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_cursor_restriction(window: WebviewWindow, value: bool) -> Result<(), String> {
  operator(&window)?;
  if value {
    return Err(format!(
            "Cursor restriction is unavailable on this {} prototype. Preventing audience-window entry across application switches requires additional native integration; no pointer constraint has been activated.",
            std::env::consts::OS
        ));
  }
  // Never substitute set_cursor_grab: its behavior does not match audience exclusion.
  Ok(())
}

#[derive(PartialEq)]
struct MonitorKey {
  name: Option<String>,
  position: (i32, i32),
  size: (u32, u32),
}

impl From<&Monitor> for MonitorKey {
  fn from(monitor: &Monitor) -> Self {
    Self {
      name: monitor.name().cloned(),
      position: (monitor.position().x, monitor.position().y),
      size: (monitor.size().width, monitor.size().height),
    }
  }
}

/// Registers audience lifecycle recovery. Call once from the Tauri setup callback.
pub fn setup(app: &AppHandle) {
  app.manage(AudienceState::default());
  if let Some(main) = app.get_webview_window("main") {
    let handle = app.clone();
    main.on_window_event(move |event| {
      if matches!(event, WindowEvent::Destroyed) {
        if let Some(audience) = handle.get_webview_window(AUDIENCE) {
          let _ = audience.destroy();
        }
        clear(&handle);
      }
    });
  }
  let handle = app.clone();
  thread::spawn(move || {
    let mut previous: Vec<MonitorKey> = Vec::new();
    loop {
      thread::sleep(Duration::from_millis(500));
      if handle.get_webview_window("main").is_none() {
        break;
      }
      if let Some(audience) = handle.get_webview_window(AUDIENCE) {
        if let Ok(monitors) = audience.available_monitors() {
          let current: Vec<MonitorKey> = monitors.iter().map(MonitorKey::from).collect();
          // Fail closed after removal/reconfiguration. Detection is polled, so
          // immediate OS relocation remains a physical-display qualification check.
          if previous.iter().any(|monitor| !current.contains(monitor)) {
            let _ = audience.emit("lumina:audience-payload", Option::<AudiencePayload>::None);
            let _ = audience.hide();
            let _ = audience.destroy();
            clear(&handle);
            let _ = handle.emit_to(
              "main",
              "lumina:audience-recovery",
              "Display changed. Audience closed; reopen it to blank output.",
            );
          }
          previous = current;
        }
      } else {
        previous.clear();
      }
    }
  });
}
