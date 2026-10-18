use tauri::{
  menu::{Menu, MenuItem, MenuItemKind, Submenu, WINDOW_SUBMENU_ID},
  AppHandle, Runtime,
};

pub const CLOSE_TAB_ID: &str = "close-operator-tab";
pub const NEW_TAB_ID: &str = "new-operator-tab";

pub fn operator_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
  let menu = Menu::default(app)?;
  let new_tab = MenuItem::with_id(app, NEW_TAB_ID, "New Tab", true, Some("CmdOrCtrl+T"))?;
  let close_tab = MenuItem::with_id(app, CLOSE_TAB_ID, "Close Tab", true, Some("CmdOrCtrl+W"))?;
  let mut has_file_menu = false;

  // Replace the default close-window accelerators, retaining the standard
  // application, editing, and window-management menus.
  for item in menu.items()? {
    if let MenuItemKind::Submenu(submenu) = item {
      if submenu.id().as_ref() == WINDOW_SUBMENU_ID {
        let count = submenu.items()?.len();
        if count > 0 {
          submenu.remove_at(count - 1)?;
        }
      } else if submenu.text()? == "File" {
        submenu.remove_at(0)?;
        submenu.insert(&new_tab, 0)?;
        submenu.insert(&close_tab, 1)?;
        has_file_menu = true;
      }
    }
  }

  // The default Linux menu has no File submenu.
  if !has_file_menu {
    menu.prepend(&Submenu::with_items(
      app,
      "File",
      true,
      &[&new_tab, &close_tab],
    )?)?;
  }
  Ok(menu)
}
