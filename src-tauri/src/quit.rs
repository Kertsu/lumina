//! Native quit entry points. Keyboard confirmation lives in the operator UI.

use std::sync::{
  atomic::{AtomicBool, Ordering},
  Arc,
};
use tauri::{
  menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
  AppHandle, Manager,
};

pub(crate) const QUIT_MENU_ID: &str = "lumina.quit";

#[derive(Clone, Default)]
pub(crate) struct QuitPrompt {
  pending: Arc<AtomicBool>,
}

impl QuitPrompt {
  fn begin(&self) -> bool {
    !self.pending.swap(true, Ordering::AcqRel)
  }

  fn complete(&self, result: &rfd::MessageDialogResult) -> bool {
    let confirmed = result == &rfd::MessageDialogResult::Custom("Quit".into());
    if !confirmed {
      self.pending.store(false, Ordering::Release);
    }
    confirmed
  }
}

/// Keep native editing/window actions, but leave Cmd/Ctrl+Q to the quit guard.
pub(crate) fn menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
  let display_name = crate::application_display_name(app.package_info());
  let about_title = format!("About {display_name}");
  let about = PredefinedMenuItem::about(
    app,
    Some(&about_title),
    Some(AboutMetadata {
      name: Some(display_name),
      version: Some(app.package_info().version.to_string()),
      ..AboutMetadata::default()
    }),
  )?;
  let quit = MenuItem::with_id(app, QUIT_MENU_ID, "Quit Lumina…", true, None::<&str>)?;
  let menu = Menu::new(app)?;
  #[cfg(target_os = "macos")]
  menu.append(&Submenu::with_items(
    app,
    "Lumina",
    true,
    &[
      &about,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::services(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::hide(app, None)?,
      &PredefinedMenuItem::hide_others(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &quit,
    ],
  )?)?;
  #[cfg(not(target_os = "macos"))]
  menu.append(&Submenu::with_items(
    app,
    "File",
    true,
    &[&PredefinedMenuItem::close_window(app, None)?, &quit],
  )?)?;
  menu.append(&Submenu::with_items(
    app,
    "Edit",
    true,
    &[
      &PredefinedMenuItem::undo(app, None)?,
      &PredefinedMenuItem::redo(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::cut(app, None)?,
      &PredefinedMenuItem::copy(app, None)?,
      &PredefinedMenuItem::paste(app, None)?,
      &PredefinedMenuItem::select_all(app, None)?,
    ],
  )?)?;
  #[cfg(target_os = "macos")]
  menu.append(&Submenu::with_items(
    app,
    "View",
    true,
    &[&PredefinedMenuItem::fullscreen(app, None)?],
  )?)?;
  let window_menu = Submenu::with_items(
    app,
    "Window",
    true,
    &[
      &PredefinedMenuItem::minimize(app, None)?,
      &PredefinedMenuItem::maximize(app, None)?,
      #[cfg(target_os = "macos")]
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::close_window(app, None)?,
    ],
  )?;
  #[cfg(target_os = "macos")]
  window_menu.set_as_windows_menu_for_nsapp()?;
  menu.append(&window_menu)?;
  #[cfg(not(target_os = "macos"))]
  menu.append(&Submenu::with_items(app, "Help", true, &[&about])?)?;
  #[cfg(target_os = "macos")]
  {
    let help = Submenu::with_items(app, "Help", true, &[])?;
    help.set_as_help_menu_for_nsapp()?;
    menu.append(&help)?;
  }
  Ok(menu)
}

/// One application-modal confirmation, including before frontend startup succeeds.
pub(crate) fn request_confirmation(app: &AppHandle) {
  let prompt = app.state::<QuitPrompt>().inner().clone();
  if !prompt.begin() {
    return;
  }
  let app = app.clone();
  let parent = app.get_webview_window("main");
  if let Some(window) = &parent {
    if let Err(error) =
      window.unminimize().and_then(|()| window.show()).and_then(|()| window.set_focus())
    {
      crate::report_error("quit confirmation focus", &error);
    }
  }
  tauri::async_runtime::spawn(async move {
    let dialog = rfd::AsyncMessageDialog::new()
      .set_title("Quit Lumina?")
      .set_description("Quitting closes all audience windows.")
      .set_buttons(rfd::MessageButtons::OkCancelCustom("Quit".into(), "Cancel".into()));
    let dialog = if let Some(window) = &parent {
      dialog.set_parent(window)
    } else {
      dialog
    };
    let result = dialog.show().await;
    if prompt.complete(&result) {
      app.exit(0);
    }
  });
}

#[cfg(test)]
mod tests {
  use super::QuitPrompt;
  use rfd::MessageDialogResult;

  #[test]
  fn concurrent_window_requests_share_one_prompt_and_cancel_allows_retry() {
    let prompt = QuitPrompt::default();
    let other_window = prompt.clone();
    assert!(prompt.begin());
    assert!(!other_window.begin());
    assert!(!other_window.complete(&MessageDialogResult::Cancel));
    assert!(prompt.begin());
    assert!(!other_window.begin());
  }

  #[test]
  fn only_the_explicit_quit_button_confirms_and_prevents_a_second_prompt() {
    for result in [
      MessageDialogResult::Cancel,
      MessageDialogResult::No,
      MessageDialogResult::Ok,
      MessageDialogResult::Custom("Cancel".into()),
    ] {
      let prompt = QuitPrompt::default();
      assert!(prompt.begin());
      assert!(!prompt.complete(&result));
      assert!(prompt.begin());
    }
    let prompt = QuitPrompt::default();
    assert!(prompt.begin());
    assert!(prompt.complete(&MessageDialogResult::Custom("Quit".into())));
    assert!(!prompt.begin());
  }
}
