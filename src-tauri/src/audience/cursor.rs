//! macOS filtering tap. No event interception is installed until explicit enable.
//! Geometry is shared by all enabled outputs; removing one leaves the others.
use std::{
  collections::HashMap,
  sync::{
    atomic::{AtomicBool, AtomicU8, Ordering},
    mpsc, Arc, Mutex,
  },
  thread,
  time::{Duration, Instant},
};

use core_foundation::{
  base::{CFType, TCFType},
  dictionary::CFDictionary,
  number::CFNumber,
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
  geometry::{CGPoint, CGRect},
  window::{
    create_description_from_array, create_window_list, kCGNullWindowID, kCGWindowListOptionAll,
    kCGWindowListOptionOnScreenOnly,
  },
};
use tauri::{AppHandle, Emitter, Manager};

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
      point.x.clamp(
        self.left,
        self.right - ((self.right - self.left) / 2.0).min(0.5),
      ),
      point.y.clamp(
        self.top,
        self.bottom - ((self.bottom - self.top) / 2.0).min(0.5),
      ),
    )
  }

  fn valid(self) -> bool {
    [self.left, self.top, self.right, self.bottom]
      .iter()
      .all(|value| value.is_finite())
      && self.right > self.left
      && self.bottom > self.top
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
  enabled: HashMap<String, u32>,
  blocked: HashMap<String, Vec<Rect>>,
  displays: Vec<Rect>,
  allowed: Vec<Rect>,
}

impl Geometry {
  fn nearest(&self, point: CGPoint) -> Option<CGPoint> {
    if self.blocked.is_empty()
      || !self
        .blocked
        .values()
        .flatten()
        .any(|rect| rect.contains(point))
    {
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

type WindowDescription = CFDictionary<CFString, CFType>;

fn window_number(window: &WindowDescription, key: &str) -> Result<i64, String> {
  window
    .find(CFString::new(key))
    .and_then(|value| value.downcast::<CFNumber>())
    .and_then(|number| number.to_i64())
    .ok_or_else(|| format!("macOS window metadata is missing {key}."))
}

fn window_list(onscreen: bool) -> Result<Vec<WindowDescription>, String> {
  let option = if onscreen {
    kCGWindowListOptionOnScreenOnly
  } else {
    kCGWindowListOptionAll
  };
  let ids = create_window_list(option, kCGNullWindowID)
    .ok_or("macOS could not list windows. Cursor restriction is unavailable.")?;
  let order = ids
    .iter()
    .enumerate()
    .map(|(index, id)| (*id, index))
    .collect::<HashMap<_, _>>();
  let descriptions = create_description_from_array(ids)
    .ok_or("macOS could not describe windows. Cursor restriction is unavailable.")?;
  let mut windows = Vec::new();
  for window in descriptions.iter() {
    let number = u32::try_from(window_number(&window, "kCGWindowNumber")?)
      .map_err(|_| "macOS returned an invalid window identity.")?;
    let index = order
      .get(&number)
      .ok_or("macOS returned an unexpected window identity.")?;
    windows.push((*index, (*window).clone()));
  }
  windows.sort_by_key(|(index, _)| *index);
  Ok(windows.into_iter().map(|(_, window)| window).collect())
}

fn audience_window_id(workspace_id: &str) -> Result<u32, String> {
  let title = format!("Lumina — Audience {workspace_id}");
  for window in window_list(false)? {
    if window_number(&window, "kCGWindowOwnerPID")? != i64::from(std::process::id()) {
      continue;
    }
    let name = window
      .find(CFString::new("kCGWindowName"))
      .and_then(|value| value.downcast::<CFString>());
    if name.is_some_and(|name| name == title.as_str()) {
      return u32::try_from(window_number(&window, "kCGWindowNumber")?)
        .map_err(|_| "macOS returned an invalid audience window identity.".into());
    }
  }
  Err("macOS did not expose this audience's window identity. Cursor restriction was not enabled; reopen the audience and retry.".into())
}

fn window_bounds(window: &WindowDescription) -> Result<Option<Rect>, String> {
  let bounds = window
    .find(CFString::new("kCGWindowBounds"))
    .and_then(|value| value.downcast::<CFDictionary>())
    .and_then(|dictionary| CGRect::from_dict_representation(&dictionary))
    .ok_or("macOS window bounds are unavailable.")?;
  let rect = Rect {
    left: bounds.origin.x,
    top: bounds.origin.y,
    right: bounds.origin.x + bounds.size.width,
    bottom: bounds.origin.y + bounds.size.height,
  };
  if bounds.size.width == 0.0 || bounds.size.height == 0.0 {
    return Ok(None);
  }
  if !rect.valid() {
    return Err("macOS returned invalid window bounds.".into());
  }
  Ok(Some(rect))
}

fn permitted_regions(displays: &[Rect], blocked: &HashMap<String, Vec<Rect>>) -> Vec<Rect> {
  let mut allowed = displays.to_vec();
  for rect in blocked.values().flatten() {
    allowed = allowed
      .into_iter()
      .flat_map(|region| region.without(*rect))
      .collect();
  }
  allowed
}

fn visible_geometry(enabled: &HashMap<String, u32>) -> Result<Geometry, String> {
  let displays = CGDisplay::active_displays()
    .map_err(|error| format!("Could not inspect connected displays: {error}"))?
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
  if displays.is_empty() {
    return Err("macOS did not expose a usable desktop.".into());
  }
  let mut blocked = HashMap::new();
  let mut above = Vec::new();
  // Quartz returns front-to-back order and point coordinates for both windows
  // and pointer events. No backing-scale conversion or foreign title is used.
  for window in window_list(true)? {
    let alpha = window
      .find(CFString::new("kCGWindowAlpha"))
      .and_then(|value| value.downcast::<CFNumber>())
      .and_then(|number| number.to_f64())
      .ok_or("macOS window transparency metadata is unavailable.")?;
    if !alpha.is_finite() {
      return Err("macOS returned invalid window transparency.".into());
    }
    if alpha <= 0.0 {
      continue;
    }
    let Some(rect) = window_bounds(&window)? else {
      continue;
    };
    let number = u32::try_from(window_number(&window, "kCGWindowNumber")?)
      .map_err(|_| "macOS returned an invalid window identity.")?;
    if let Some((workspace_id, _)) = enabled.iter().find(|(_, id)| **id == number) {
      let mut visible = vec![rect];
      for occluder in &above {
        visible = visible
          .into_iter()
          .flat_map(|region| region.without(*occluder))
          .collect();
      }
      if !visible.is_empty() {
        blocked.insert(workspace_id.clone(), visible);
      }
    }
    // A nontransparent window receives pointer events throughout its bounds,
    // even when its content is translucent. Fully transparent windows are skipped.
    above.push(rect);
  }
  let allowed = permitted_regions(&displays, &blocked);
  if allowed.is_empty() {
    return Err("Restriction would leave no usable desktop area; restrictions are off.".into());
  }
  Ok(Geometry {
    enabled: enabled.clone(),
    blocked,
    displays,
    allowed,
  })
}

fn refresh_geometry(geometry: &Mutex<Geometry>, move_pointer: bool) -> Result<(), String> {
  let enabled = geometry
    .lock()
    .map_err(|error| error.to_string())?
    .enabled
    .clone();
  if enabled.is_empty() {
    return Ok(());
  }
  // Window-server calls and rectangle subtraction never hold the input lock.
  let updated = visible_geometry(&enabled)?;
  let applied = {
    let mut geometry = geometry.lock().map_err(|error| error.to_string())?;
    if geometry.enabled == enabled {
      *geometry = updated;
      true
    } else {
      false
    }
  };
  if applied && move_pointer {
    // An occluder can disappear without any pointer event (for example Cmd-H).
    // Inspect the physical pointer outside the geometry lock, then choose its
    // permitted destination from the latest state, never the stale scan above.
    move_outside(geometry)?;
  }
  Ok(())
}

fn move_outside(geometry: &Mutex<Geometry>) -> Result<(), String> {
  let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
    .map_err(|()| "Could not inspect the pointer's current position.".to_string())?;
  let event = CGEvent::new(source)
    .map_err(|()| "Could not inspect the pointer's current position.".to_string())?;
  let point = event.location();
  let target = geometry
    .lock()
    .map_err(|error| error.to_string())?
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
    let affected = geometry.enabled.keys().cloned().collect::<Vec<_>>();
    geometry.enabled.clear();
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
          let mut last_refresh = Instant::now();
          while !worker_stop.load(Ordering::Acquire) {
            let result = CFRunLoop::run_in_mode(
              mode.as_concrete_TypeRef(),
              Duration::from_millis(40),
              true,
            );
            if worker_stop.load(Ordering::Acquire) {
              break;
            }
            if last_refresh.elapsed() >= Duration::from_millis(40) {
              last_refresh = Instant::now();
              if let Err(error) = refresh_geometry(&geometry, true) {
                fail_all(&handle, &geometry, &format!("{error} Restrictions are off; enable them again explicitly."));
                worker_stop.store(true, Ordering::Release);
                break;
              }
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
      .enabled
      .contains_key(workspace_id),
  )
}

pub fn release(app: &AppHandle, workspace_id: &str, message: Option<String>) {
  let state = app.state::<CursorState>();
  let empty = if let Ok(mut geometry) = state.geometry.lock() {
    geometry.enabled.remove(workspace_id);
    geometry.blocked.remove(workspace_id);
    // Existing permitted regions remain safe after removal; recompute so the
    // newly released area is immediately available to the other applications.
    geometry.allowed = permitted_regions(&geometry.displays, &geometry.blocked);
    geometry.enabled.is_empty()
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
  super::output(app, workspace_id)?;
  let window_id = audience_window_id(workspace_id)?;
  let state = app.state::<CursorState>();
  {
    let mut geometry = state.geometry.lock().map_err(|error| error.to_string())?;
    geometry.enabled.insert(workspace_id.to_string(), window_id);
  }
  if let Err(error) = refresh_geometry(&state.geometry, false) {
    release(app, workspace_id, Some(error.clone()));
    return Err(error);
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
  let moved = move_outside(&state.geometry);
  if let Err(error) = moved {
    release(app, workspace_id, Some(error.clone()));
    return Err(error);
  }
  announce(app, workspace_id, true, None);
  Ok(())
}

pub fn refresh(app: &AppHandle, workspace_id: &str) {
  if enabled(app, workspace_id).unwrap_or(false) {
    if let Err(error) = refresh_geometry(&app.state::<CursorState>().geometry, true) {
      release(app, workspace_id, Some(error));
    }
  }
}
