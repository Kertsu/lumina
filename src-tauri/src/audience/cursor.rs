//! macOS filtering tap. No event interception is installed until explicit enable.
//! Geometry is shared by all enabled outputs; removing one leaves the others.
use std::{
  collections::HashMap,
  sync::{
    atomic::{AtomicBool, AtomicU8, Ordering},
    mpsc, Arc, Mutex,
  },
  thread,
  time::Duration,
};

use core_foundation::{
  base::TCFType,
  runloop::{CFRunLoop, CFRunLoopRunResult},
  string::CFString,
};
use core_graphics::{
  display::CGDisplay,
  event::{
    CGEvent, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
    CallbackResult,
  },
  event_source::{CGEventSource, CGEventSourceStateID},
  geometry::CGPoint,
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[derive(Clone, Copy)]
struct Rect {
  left: f64,
  top: f64,
  right: f64,
  bottom: f64,
}

impl Rect {
  fn contains(self, point: CGPoint) -> bool {
    point.x >= self.left && point.x < self.right && point.y >= self.top && point.y < self.bottom
  }

  fn nearest(self, point: CGPoint) -> CGPoint {
    CGPoint::new(
      point.x.clamp(self.left, self.right - 0.5),
      point.y.clamp(self.top, self.bottom - 0.5),
    )
  }

  fn valid(self) -> bool {
    [self.left, self.top, self.right, self.bottom]
      .iter()
      .all(|value| value.is_finite())
      && self.right - self.left >= 1.0
      && self.bottom - self.top >= 1.0
  }

  fn without(self, blocked: Rect) -> Vec<Rect> {
    let left = self.left.max(blocked.left);
    let right = self.right.min(blocked.right);
    let top = self.top.max(blocked.top);
    let bottom = self.bottom.min(blocked.bottom);
    if left >= right || top >= bottom {
      return vec![self];
    }
    [
      Rect {
        right: left,
        ..self
      },
      Rect {
        left: right,
        ..self
      },
      Rect {
        left,
        right,
        bottom: top,
        ..self
      },
      Rect {
        left,
        right,
        top: bottom,
        ..self
      },
    ]
    .into_iter()
    .filter(|rect| rect.valid())
    .collect()
  }
}

#[derive(Default)]
struct Geometry {
  blocked: HashMap<String, Rect>,
  allowed: Vec<Rect>,
}

impl Geometry {
  fn nearest(&self, point: CGPoint) -> Option<CGPoint> {
    if self.blocked.is_empty() || !self.blocked.values().any(|rect| rect.contains(point)) {
      return Some(point);
    }
    self
      .allowed
      .iter()
      .map(|rect| rect.nearest(point))
      .min_by(|left, right| {
        let distance =
          |candidate: &CGPoint| (candidate.x - point.x).powi(2) + (candidate.y - point.y).powi(2);
        distance(left).total_cmp(&distance(right))
      })
  }
}

struct Worker {
  stop: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct CursorState {
  geometry: Arc<Mutex<Geometry>>,
  worker: Mutex<Option<Worker>>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestrictionMessage {
  pub workspace_id: String,
  pub enabled: bool,
  pub message: Option<String>,
}

fn announce(app: &AppHandle, workspace_id: &str, enabled: bool, message: Option<String>) {
  let _ = app.emit_to(
    "main",
    "lumina:cursor-restriction",
    RestrictionMessage {
      workspace_id: workspace_id.to_string(),
      enabled,
      message,
    },
  );
}

fn window_rect(audience: &WebviewWindow) -> Result<Rect, String> {
  let scale = audience.scale_factor().map_err(|error| error.to_string())?;
  if !scale.is_finite() || scale <= 0.0 {
    return Err("Audience display scale is unavailable.".into());
  }
  let position = audience
    .outer_position()
    .map_err(|error| error.to_string())?;
  let size = audience.outer_size().map_err(|error| error.to_string())?;
  // Tao's macOS outer coordinates are global top-left logical points multiplied
  // by the window's backing scale. Quartz event/display coordinates use points.
  let rect = Rect {
    left: f64::from(position.x) / scale,
    top: f64::from(position.y) / scale,
    right: (f64::from(position.x) + f64::from(size.width)) / scale,
    bottom: (f64::from(position.y) + f64::from(size.height)) / scale,
  };
  if !rect.valid() {
    return Err("Audience exclusion bounds are unavailable.".into());
  }
  Ok(rect)
}

fn allowed_regions(blocked: &HashMap<String, Rect>) -> Result<Vec<Rect>, String> {
  let displays = CGDisplay::active_displays()
    .map_err(|error| format!("Could not inspect connected displays: {error}"))?;
  let mut allowed = displays
    .into_iter()
    .map(|id| CGDisplay::new(id).bounds())
    .map(|bounds| Rect {
      left: bounds.origin.x,
      top: bounds.origin.y,
      right: bounds.origin.x + bounds.size.width,
      bottom: bounds.origin.y + bounds.size.height,
    })
    .filter(|rect| rect.valid())
    .collect::<Vec<_>>();
  for rect in blocked.values() {
    allowed = allowed
      .into_iter()
      .flat_map(|region| region.without(*rect))
      .collect();
  }
  if allowed.is_empty() && !blocked.is_empty() {
    return Err(
      "Restriction would leave no usable desktop area; this audience remains unrestricted.".into(),
    );
  }
  Ok(allowed)
}

fn move_outside(geometry: &Geometry) -> Result<(), String> {
  let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
    .map_err(|()| "Could not inspect the pointer's current position.".to_string())?;
  let event = CGEvent::new(source)
    .map_err(|()| "Could not inspect the pointer's current position.".to_string())?;
  let point = event.location();
  let target = geometry
    .nearest(point)
    .ok_or("Restriction has no usable desktop area.")?;
  if target.x != point.x || target.y != point.y {
    CGDisplay::warp_mouse_cursor_position(target)
      .map_err(|error| format!("Could not move the pointer outside the audience: {error}"))?;
  }
  Ok(())
}

fn fail_all(app: &AppHandle, geometry: &Mutex<Geometry>, reason: &str) {
  let affected = if let Ok(mut geometry) = geometry.lock() {
    let affected = geometry.blocked.keys().cloned().collect::<Vec<_>>();
    geometry.blocked.clear();
    geometry.allowed.clear();
    affected
  } else {
    Vec::new()
  };
  for workspace_id in affected {
    announce(app, &workspace_id, false, Some(reason.to_string()));
  }
}

fn start_worker(app: &AppHandle, state: &CursorState) -> Result<Worker, String> {
  let stop = Arc::new(AtomicBool::new(false));
  let worker_stop = stop.clone();
  let geometry = state.geometry.clone();
  let handle = app.clone();
  let (ready, started) = mpsc::sync_channel(1);
  thread::Builder::new()
    .name("lumina-cursor-exclusion".into())
    .spawn(move || {
      let failed = Arc::new(AtomicU8::new(0));
      let callback_failed = failed.clone();
      let callback_stop = worker_stop.clone();
      let callback_geometry = geometry.clone();
      let tap = CGEventTap::with_enabled(
        CGEventTapLocation::Session,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::Default,
        vec![
          CGEventType::MouseMoved,
          CGEventType::LeftMouseDragged,
          CGEventType::RightMouseDragged,
          CGEventType::OtherMouseDragged,
          CGEventType::LeftMouseDown,
          CGEventType::LeftMouseUp,
          CGEventType::RightMouseDown,
          CGEventType::RightMouseUp,
          CGEventType::OtherMouseDown,
          CGEventType::OtherMouseUp,
          CGEventType::ScrollWheel,
        ],
        move |_proxy, kind, event| {
          if matches!(
            kind,
            CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput
          ) {
            callback_failed.store(1, Ordering::Release);
            return CallbackResult::Keep;
          }
          if callback_stop.load(Ordering::Acquire) {
            return CallbackResult::Keep;
          }
          let Ok(geometry) = callback_geometry.try_lock() else {
            // Never block the system input stream behind a UI/geometry update.
            // Drop this pointer event rather than let it enter a restricted area.
            return CallbackResult::Drop;
          };
          let point = event.location();
          let Some(target) = geometry.nearest(point) else {
            callback_failed.store(2, Ordering::Release);
            return CallbackResult::Keep;
          };
          if target.x == point.x && target.y == point.y {
            return CallbackResult::Keep;
          }
          let replacement = event.clone();
          replacement.set_location(target);
          // Keep the visible physical pointer and the forwarded event together.
          // No new synthetic event is posted, so this cannot recurse into the tap.
          if CGDisplay::warp_mouse_cursor_position(target).is_err() {
            callback_failed.store(2, Ordering::Release);
            return CallbackResult::Keep;
          }
          CallbackResult::Replace(replacement)
        },
        || {
          let _ = ready.send(Ok(()));
          let mode = CFString::new("kCFRunLoopDefaultMode");
          while !worker_stop.load(Ordering::Acquire) {
            let result = CFRunLoop::run_in_mode(
              mode.as_concrete_TypeRef(),
              Duration::from_millis(100),
              true,
            );
            if worker_stop.load(Ordering::Acquire) {
              break;
            }
            let failure = failed.load(Ordering::Acquire);
            if failure != 0 || result == CFRunLoopRunResult::Finished {
              let reason = if failure == 1 {
                "macOS disabled the cursor filter. Restrictions are off; enable them again explicitly after checking Accessibility permission."
              } else {
                "The cursor filter stopped protecting the desktop. Restrictions are off; enable them again explicitly."
              };
              fail_all(&handle, &geometry, reason);
              worker_stop.store(true, Ordering::Release);
            }
          }
        },
      );
      if tap.is_err() {
        let _ = ready.send(Err(
          "macOS denied the cursor filter. Grant Lumina Accessibility permission in System Settings, then enable restriction again. No pointer restriction was activated."
            .to_string(),
        ));
      }
    })
    .map_err(|error| format!("Could not start cursor restriction: {error}"))?;
  match started.recv_timeout(Duration::from_secs(3)) {
    Ok(Ok(())) => Ok(Worker { stop }),
    Ok(Err(error)) => Err(error),
    Err(error) => {
      stop.store(true, Ordering::Release);
      Err(format!("Cursor restriction did not initialize: {error}"))
    }
  }
}

pub fn enabled(app: &AppHandle, workspace_id: &str) -> Result<bool, String> {
  Ok(
    app
      .state::<CursorState>()
      .geometry
      .lock()
      .map_err(|error| error.to_string())?
      .blocked
      .contains_key(workspace_id),
  )
}

pub fn release(app: &AppHandle, workspace_id: &str, message: Option<String>) {
  let state = app.state::<CursorState>();
  let empty = if let Ok(mut geometry) = state.geometry.lock() {
    geometry.blocked.remove(workspace_id);
    // Existing permitted regions remain safe after removal; recompute so the
    // newly released area is immediately available to the other applications.
    if let Ok(allowed) = allowed_regions(&geometry.blocked) {
      geometry.allowed = allowed;
    }
    geometry.blocked.is_empty()
  } else {
    true
  };
  if empty {
    if let Ok(mut worker) = state.worker.lock() {
      if let Some(worker) = worker.take() {
        worker.stop.store(true, Ordering::Release);
      }
    }
  }
  announce(app, workspace_id, false, message);
}

pub fn set(app: &AppHandle, workspace_id: &str, value: bool) -> Result<(), String> {
  if !value {
    release(app, workspace_id, None);
    return Ok(());
  }
  let audience = super::output(app, workspace_id)?;
  let rect = window_rect(&audience)?;
  let state = app.state::<CursorState>();
  {
    let mut geometry = state.geometry.lock().map_err(|error| error.to_string())?;
    let mut blocked = geometry.blocked.clone();
    blocked.insert(workspace_id.to_string(), rect);
    let allowed = allowed_regions(&blocked)?;
    geometry.blocked = blocked;
    geometry.allowed = allowed;
  }
  let mut worker = state.worker.lock().map_err(|error| error.to_string())?;
  if worker
    .as_ref()
    .is_none_or(|worker| worker.stop.load(Ordering::Acquire))
  {
    match start_worker(app, &state) {
      Ok(started) => *worker = Some(started),
      Err(error) => {
        drop(worker);
        release(app, workspace_id, None);
        return Err(error);
      }
    }
  }
  drop(worker);
  let moved = {
    let geometry = state.geometry.lock().map_err(|error| error.to_string())?;
    move_outside(&geometry)
  };
  if let Err(error) = moved {
    release(app, workspace_id, Some(error.clone()));
    return Err(error);
  }
  announce(app, workspace_id, true, None);
  Ok(())
}

pub fn refresh(app: &AppHandle, workspace_id: &str) {
  if enabled(app, workspace_id).unwrap_or(false) {
    if let Err(error) = set(app, workspace_id, true) {
      release(app, workspace_id, Some(error));
    }
  }
}
