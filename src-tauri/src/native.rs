//! Native audience ownership and delivery; no application decisions live here.

use lumina_app::{AudienceOutput, AudienceOwner, NativeAudience};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::{
  collections::HashMap,
  sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_specta::Event;

#[derive(Clone, Debug, Serialize, Type, Event)]
pub struct AudienceUpdated {
  pub output: AudienceOutput,
}

/// A notification prompts the operator to read accepted state through IPC.
#[derive(Clone, Debug, Deserialize, Serialize, Type, Event)]
pub struct ApplicationChanged {
  pub workspace_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct MonitorKey {
  name: Option<String>,
  x: i32,
  y: i32,
  width: u32,
  height: u32,
}

impl From<&tauri::Monitor> for MonitorKey {
  fn from(monitor: &tauri::Monitor) -> Self {
    Self {
      name: monitor.name().cloned(),
      x: monitor.position().x,
      y: monitor.position().y,
      width: monitor.size().width,
      height: monitor.size().height,
    }
  }
}

struct RegisteredAudience {
  owner: AudienceOwner,
  output: Option<AudienceOutput>,
  monitor: Option<MonitorKey>,
}

#[derive(Clone, Default)]
pub(crate) struct NativeWindows {
  audiences: Arc<Mutex<HashMap<String, RegisteredAudience>>>,
}

impl NativeWindows {
  pub(crate) fn adapter(&self, app: AppHandle) -> AudienceAdapter {
    AudienceAdapter {
      app,
      windows: self.clone(),
    }
  }

  /// Identity is obtained from Tauri's caller window and this native registry.
  pub(crate) fn owner_for_label(&self, label: &str) -> Option<AudienceOwner> {
    self.audiences.lock().ok()?.get(label).map(|entry| entry.owner.clone())
  }

  pub(crate) fn output_for_label(&self, label: &str) -> Option<AudienceOutput> {
    self.audiences.lock().ok()?.get(label)?.output.clone()
  }

  pub(crate) fn retire(&self, label: &str) -> Option<AudienceOwner> {
    self.audiences.lock().ok()?.remove(label).map(|entry| entry.owner)
  }

  /// Detect loss of a previously observed monitor, preserving unaffected owners.
  pub(crate) fn disconnected(&self, app: &AppHandle) -> Vec<AudienceOwner> {
    let Ok(monitors) = app.available_monitors() else {
      return Vec::new();
    };
    let available: Vec<_> = monitors.iter().map(MonitorKey::from).collect();
    let Ok(mut audiences) = self.audiences.lock() else {
      return Vec::new();
    };
    audiences
      .iter_mut()
      .filter_map(|(label, entry)| {
        if entry.monitor.as_ref().is_some_and(|monitor| !available.contains(monitor)) {
          return Some(entry.owner.clone());
        }
        if let Some(window) = app.get_webview_window(label) {
          if let Ok(Some(monitor)) = window.current_monitor() {
            entry.monitor = Some(MonitorKey::from(&monitor));
          }
        }
        None
      })
      .collect()
  }
}

pub(crate) struct AudienceAdapter {
  app: AppHandle,
  windows: NativeWindows,
}

fn label(owner: &AudienceOwner) -> String {
  format!("audience-{}", owner.instance_id)
}

impl AudienceAdapter {
  fn window(&self, owner: &AudienceOwner) -> Result<tauri::WebviewWindow, String> {
    let window_label = label(owner);
    let registered = self
      .windows
      .owner_for_label(&window_label)
      .ok_or_else(|| "The native audience instance is unavailable.".to_string())?;
    if registered.instance_id != owner.instance_id
      || registered.session_id != owner.session_id
      || registered.workspace_id != owner.workspace_id
    {
      return Err("The native audience owner is obsolete.".into());
    }
    self
      .app
      .get_webview_window(&window_label)
      .ok_or_else(|| "The native audience has closed.".into())
  }
}

impl NativeAudience for AudienceAdapter {
  fn open(&mut self, owner: &AudienceOwner, hide_cursor: bool) -> Result<(), String> {
    let window_label = label(owner);
    if self.app.get_webview_window(&window_label).is_some() {
      return Err("The audience instance already exists.".into());
    }
    let window =
      WebviewWindowBuilder::new(&self.app, &window_label, WebviewUrl::App("audience".into()))
        .title("Lumina · Audience")
        .inner_size(1280.0, 720.0)
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?;
    if let Err(error) = window.set_cursor_visible(!hide_cursor) {
      let _ = window.destroy();
      return Err(error.to_string());
    }
    let monitor = window.current_monitor().ok().flatten().as_ref().map(MonitorKey::from);
    self.windows.audiences.lock().map_err(|error| error.to_string())?.insert(
      window_label.clone(),
      RegisteredAudience {
        owner: owner.clone(),
        output: None,
        monitor,
      },
    );
    if let Err(error) = window.show() {
      self.windows.retire(&window_label);
      let _ = window.destroy();
      return Err(error.to_string());
    }
    Ok(())
  }

  fn close(&mut self, owner: &AudienceOwner) -> Result<(), String> {
    self.window(owner)?.close().map_err(|error| error.to_string())?;
    self.windows.retire(&label(owner));
    Ok(())
  }

  fn dispatch(&mut self, output: &AudienceOutput) -> Result<(), String> {
    let window = self.window(&output.owner)?;
    self
      .windows
      .audiences
      .lock()
      .map_err(|error| error.to_string())?
      .get_mut(&label(&output.owner))
      .ok_or_else(|| "Audience closed before delivery.".to_string())?
      .output = Some(output.clone());
    AudienceUpdated {
      output: output.clone(),
    }
    .emit_to(&self.app, window.label())
    .map_err(|error| error.to_string())
  }

  fn set_cursor(&mut self, owner: &AudienceOwner, hidden: bool) -> Result<(), String> {
    self.window(owner)?.set_cursor_visible(!hidden).map_err(|error| error.to_string())
  }

  fn set_fullscreen(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String> {
    self.window(owner)?.set_fullscreen(enabled).map_err(|error| error.to_string())
  }

  fn set_always_on_top(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String> {
    self.window(owner)?.set_always_on_top(enabled).map_err(|error| error.to_string())
  }
}
