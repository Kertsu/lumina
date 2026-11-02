//! Native geometry for the operator header; audience windows retain system chrome.

use objc2::MainThreadMarker;
use objc2_app_kit::{NSApplication, NSWindow, NSWindowButton, NSWindowStyleMask};
use tauri::{WebviewWindow, WindowEvent};

// Logical points; matches .workspace-bar in src/styles.css.
const OPERATOR_HEADER_HEIGHT: f64 = 44.0;

pub fn install(window: &WebviewWindow) {
  center_traffic_lights(window);
  let observed = window.clone();
  window.on_window_event(move |event| {
    if matches!(
      event,
      WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } | WindowEvent::Focused(true)
    ) {
      center_traffic_lights(&observed);
    }
  });
}

fn center_traffic_lights(window: &WebviewWindow) {
  if align(window).is_none() {
    eprintln!("Lumina: could not align operator window controls");
  }
}

fn align(window: &WebviewWindow) -> Option<()> {
  let main_thread = MainThreadMarker::new()?;
  let handle = window.ns_window().ok()?;
  let application = NSApplication::sharedApplication(main_thread);
  // Find the retained AppKit object by identity; never dereference the raw handle.
  let native = application.windows().iter().find(|candidate| {
    std::ptr::eq(std::ptr::from_ref::<NSWindow>(candidate), handle.cast_const().cast())
  })?;
  if native.styleMask().contains(NSWindowStyleMask::FullScreen) {
    return Some(());
  }
  let content = native.contentView()?;
  for kind in
    [NSWindowButton::CloseButton, NSWindowButton::MiniaturizeButton, NSWindowButton::ZoomButton]
  {
    let button = native.standardWindowButton(kind)?;
    let bounds = button.convertRect_toView(button.bounds(), Some(&content));
    let center = bounds.origin.y + bounds.size.height / 2.0;
    let center_from_top = if content.isFlipped() {
      center
    } else {
      content.bounds().size.height - center
    };
    let offset = OPERATOR_HEADER_HEIGHT / 2.0 - center_from_top;
    let mut origin = button.frame().origin;
    // AppKit's standard titlebar-button frames use bottom-left coordinates.
    origin.y -= offset;
    button.setFrameOrigin(origin);
  }
  Some(())
}
