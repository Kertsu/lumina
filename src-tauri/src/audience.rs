use std::{collections::HashMap, sync::Mutex, thread, time::Duration};

use serde::{Deserialize, Serialize};
use tauri::{
  AppHandle, Emitter, Manager, Monitor, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
  WindowEvent,
};

#[cfg(target_os = "macos")]
mod cursor;

#[derive(Clone, Deserialize, Serialize)]
pub struct AudiencePayload {
  selection: Option<serde_json::Value>,
  appearance: serde_json::Value,
  blank: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudienceMessage {
  workspace_id: String,
  payload: Option<AudiencePayload>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenMessage {
  workspace_id: String,
  open: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryMessage {
  workspace_id: String,
  message: String,
}

struct OutputState {
  generation: uuid::Uuid,
  payload: Option<AudiencePayload>,
  monitor: Option<MonitorKey>,
}

#[derive(Default)]
pub struct AudienceState(Mutex<HashMap<String, OutputState>>);

fn operator(window: &WebviewWindow) -> Result<(), String> {
  if window.label() == "main" {
    Ok(())
  } else {
    Err("Audience controls are available only in the operator window.".into())
  }
}

fn label(workspace_id: &str) -> Result<String, String> {
  let identity = uuid::Uuid::parse_str(workspace_id)
    .map_err(|_| "Audience workspace identity must be a UUID.".to_string())?;
  if identity.to_string() != workspace_id {
    return Err("Audience workspace identity must use canonical UUID formatting.".into());
  }
  Ok(format!("audience-{workspace_id}"))
}

fn output(app: &AppHandle, workspace_id: &str) -> Result<WebviewWindow, String> {
  app
    .get_webview_window(&label(workspace_id)?)
    .ok_or_else(|| "Open this workspace's audience before changing its output.".into())
}

fn announce(app: &AppHandle, workspace_id: &str, open: bool) -> Result<(), String> {
  app
    .emit_to(
      "main",
      "lumina:audience-open",
      OpenMessage {
        workspace_id: workspace_id.to_string(),
        open,
      },
    )
    .map_err(|error| error.to_string())
}

fn clear(app: &AppHandle, workspace_id: &str, generation: uuid::Uuid) {
  let removed = if let Ok(mut outputs) = app.state::<AudienceState>().0.lock() {
    if outputs
      .get(workspace_id)
      .is_some_and(|state| state.generation == generation)
    {
      outputs.remove(workspace_id);
      true
    } else {
      false
    }
  } else {
    false
  };
  if removed {
    #[cfg(target_os = "macos")]
    cursor::release(app, workspace_id, None);
    let _ = announce(app, workspace_id, false);
  }
}

#[tauri::command]
pub fn audience_is_open(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
) -> Result<bool, String> {
  operator(&window)?;
  Ok(app.get_webview_window(&label(&workspace_id)?).is_some())
}

#[tauri::command]
pub fn audience_payload(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
) -> Result<AudienceMessage, String> {
  if window.label() != label(&workspace_id)? {
    return Err("An audience can read only its own workspace's output.".into());
  }
  let state = app.state::<AudienceState>();
  let outputs = state.0.lock().map_err(|error| error.to_string())?;
  Ok(AudienceMessage {
    payload: outputs
      .get(&workspace_id)
      .and_then(|state| state.payload.clone()),
    workspace_id,
  })
}

/// Keep the last known display when the OS has already relocated a window after
/// display loss. Replacing it in that case would hide the lost-display signal.
fn update_monitor(app: &AppHandle, workspace_id: &str, generation: uuid::Uuid) {
  let Ok(audience) = output(app, workspace_id) else {
    return;
  };
  let Ok(monitors) = audience.available_monitors() else {
    return;
  };
  let Ok(current) = audience.current_monitor() else {
    return;
  };
  let current = current.as_ref().map(MonitorKey::from);
  if let Ok(mut outputs) = app.state::<AudienceState>().0.lock() {
    if let Some(state) = outputs.get_mut(workspace_id) {
      if state.generation != generation {
        return;
      }
      let previous_still_connected = state.monitor.as_ref().is_none_or(|previous| {
        monitors
          .iter()
          .any(|monitor| MonitorKey::from(monitor) == *previous)
      });
      if previous_still_connected {
        state.monitor = current.or_else(|| state.monitor.clone());
      }
    }
  }
}

#[tauri::command]
pub async fn open_audience(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
) -> Result<(), String> {
  operator(&window)?;
  let audience_label = label(&workspace_id)?;
  let _maintenance = crate::storage::MAINTENANCE
    .lock()
    .map_err(|error| error.to_string())?;
  if let Some(audience) = app.get_webview_window(&audience_label) {
    audience.set_focus().map_err(|error| error.to_string())?;
    return Ok(());
  }
  let generation = uuid::Uuid::new_v4();
  let audience = WebviewWindowBuilder::new(
    &app,
    &audience_label,
    WebviewUrl::App(format!("/?audience=1&workspaceId={workspace_id}").into()),
  )
  .title(format!("Lumina — Audience {workspace_id}"))
  .inner_size(1280.0, 720.0)
  .background_color(tauri::window::Color(0, 0, 0, 255))
  .visible(false)
  .build()
  .map_err(|error| error.to_string())?;
  let monitor = audience
    .current_monitor()
    .ok()
    .flatten()
    .as_ref()
    .map(MonitorKey::from);
  match app.state::<AudienceState>().0.lock() {
    Ok(mut outputs) => {
      outputs.insert(
        workspace_id.clone(),
        OutputState {
          generation,
          payload: None,
          monitor,
        },
      );
    }
    Err(error) => {
      let _ = audience.destroy();
      return Err(error.to_string());
    }
  }
  let handle = app.clone();
  let event_workspace = workspace_id.clone();
  audience.on_window_event(move |event| match event {
    WindowEvent::Destroyed => clear(&handle, &event_workspace, generation),
    WindowEvent::Moved(_) | WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
      update_monitor(&handle, &event_workspace, generation);
      #[cfg(target_os = "macos")]
      cursor::refresh(&handle, &event_workspace);
    }
    _ => {}
  });
  if let Err(error) = audience
    .set_cursor_visible(false)
    .and_then(|()| audience.show())
    .map_err(|error| error.to_string())
    .and_then(|()| announce(&app, &workspace_id, true))
  {
    let _ = audience.destroy();
    clear(&app, &workspace_id, generation);
    return Err(error);
  }
  Ok(())
}

#[tauri::command]
pub async fn close_audience(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
) -> Result<(), String> {
  operator(&window)?;
  let _maintenance = crate::storage::MAINTENANCE
    .lock()
    .map_err(|error| error.to_string())?;
  let audience_label = label(&workspace_id)?;
  let generation = app
    .state::<AudienceState>()
    .0
    .lock()
    .map_err(|error| error.to_string())?
    .get(&workspace_id)
    .map(|state| state.generation);
  if let Some(audience) = app.get_webview_window(&audience_label) {
    audience.destroy().map_err(|error| error.to_string())?;
  }
  if let Some(generation) = generation {
    clear(&app, &workspace_id, generation);
  }
  Ok(())
}

#[tauri::command]
pub fn publish_audience(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
  payload: AudiencePayload,
) -> Result<(), String> {
  operator(&window)?;
  let audience = output(&app, &workspace_id)?;
  let message = AudienceMessage {
    workspace_id: workspace_id.clone(),
    payload: Some(payload.clone()),
  };
  audience
    .emit("lumina:audience-payload", message)
    .map_err(|error| error.to_string())?;
  let state = app.state::<AudienceState>();
  let mut outputs = state.0.lock().map_err(|error| error.to_string())?;
  let output = outputs
    .get_mut(&workspace_id)
    .ok_or("This workspace's audience has closed; reopen it to blank output.")?;
  output.payload = Some(payload);
  Ok(())
}

#[tauri::command]
pub fn set_audience_fullscreen(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
  value: bool,
) -> Result<(), String> {
  operator(&window)?;
  output(&app, &workspace_id)?
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
pub fn set_cursor_restriction(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
  value: bool,
) -> Result<(), String> {
  operator(&window)?;
  label(&workspace_id)?;
  #[cfg(target_os = "macos")]
  {
    cursor::set(&app, &workspace_id, value)
  }
  #[cfg(not(target_os = "macos"))]
  {
    if value {
      output(&app, &workspace_id)?;
      return Err(format!(
        "Cursor restriction for workspace {workspace_id} is unavailable on this {} build. Composed audience exclusion requires additional native integration; no pointer constraint has been activated.",
        std::env::consts::OS
      ));
    }
    Ok(())
  }
}

#[tauri::command]
pub fn cursor_restriction_enabled(
  app: AppHandle,
  window: WebviewWindow,
  workspace_id: String,
) -> Result<bool, String> {
  operator(&window)?;
  label(&workspace_id)?;
  #[cfg(target_os = "macos")]
  {
    cursor::enabled(&app, &workspace_id)
  }
  #[cfg(not(target_os = "macos"))]
  {
    Ok(false)
  }
}

#[derive(Clone)]
struct MonitorKey {
  display_id: Option<u32>,
  name: Option<String>,
  position: (i32, i32),
  size: (u32, u32),
}

impl PartialEq for MonitorKey {
  fn eq(&self, other: &Self) -> bool {
    match (self.display_id, other.display_id) {
      (Some(left), Some(right)) => left == right,
      _ => self.name == other.name && self.position == other.position && self.size == other.size,
    }
  }
}

impl From<&Monitor> for MonitorKey {
  fn from(monitor: &Monitor) -> Self {
    // Tao exposes scaled Quartz display origins through Tauri. Recover the
    // session display ID so rearranging surviving displays is not a disconnect.
    #[cfg(target_os = "macos")]
    let display_id = core_graphics::display::CGDisplay::active_displays()
      .ok()
      .and_then(|ids| {
        let scale = monitor.scale_factor();
        let x = f64::from(monitor.position().x) / scale;
        let y = f64::from(monitor.position().y) / scale;
        let matching = ids
          .into_iter()
          .filter(|id| {
            let bounds = core_graphics::display::CGDisplay::new(*id).bounds();
            (bounds.origin.x - x).abs() < 1.0 && (bounds.origin.y - y).abs() < 1.0
          })
          .collect::<Vec<_>>();
        (matching.len() == 1).then(|| matching[0])
      });
    #[cfg(not(target_os = "macos"))]
    let display_id = None;
    Self {
      display_id,
      name: monitor.name().cloned(),
      position: (monitor.position().x, monitor.position().y),
      size: (monitor.size().width, monitor.size().height),
    }
  }
}

/// Registers audience lifecycle recovery. Call once from the Tauri setup callback.
pub fn setup(app: &AppHandle) {
  app.manage(AudienceState::default());
  #[cfg(target_os = "macos")]
  app.manage(cursor::CursorState::default());
  if let Some(main) = app.get_webview_window("main") {
    let handle = app.clone();
    main.on_window_event(move |event| {
      if matches!(event, WindowEvent::Destroyed) {
        for (label, audience) in handle.webview_windows() {
          if label.starts_with("audience-") {
            let _ = audience.destroy();
          }
        }
      }
    });
  }
  let handle = app.clone();
  thread::spawn(move || loop {
    thread::sleep(Duration::from_millis(500));
    let Some(main) = handle.get_webview_window("main") else {
      break;
    };
    let Ok(monitors) = main.available_monitors() else {
      continue;
    };
    let current: Vec<MonitorKey> = monitors.iter().map(MonitorKey::from).collect();
    let affected = if let Ok(outputs) = handle.state::<AudienceState>().0.lock() {
      outputs
        .iter()
        .filter(|(_, state)| {
          state
            .monitor
            .as_ref()
            .is_some_and(|monitor| !current.contains(monitor))
        })
        .map(|(workspace_id, state)| (workspace_id.clone(), state.generation))
        .collect::<Vec<_>>()
    } else {
      continue;
    };
    for (workspace_id, generation) in affected {
      if let Ok(audience) = output(&handle, &workspace_id) {
        let _ = audience.emit(
          "lumina:audience-payload",
          AudienceMessage {
            workspace_id: workspace_id.clone(),
            payload: None,
          },
        );
        let _ = audience.hide();
        if let Err(error) = audience.destroy() {
          let _ = handle.emit_to(
            "main",
            "lumina:audience-recovery",
            RecoveryMessage {
              workspace_id: workspace_id.clone(),
              message: format!("Audience display changed; closing its output failed: {error}"),
            },
          );
          continue;
        }
      }
      clear(&handle, &workspace_id, generation);
      let _ = handle.emit_to(
        "main",
        "lumina:audience-recovery",
        RecoveryMessage {
          workspace_id,
          message: "Audience display changed. This output closed; reopen it to blank output."
            .into(),
        },
      );
    }
  });
}
