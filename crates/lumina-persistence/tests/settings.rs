use lumina_app::{Application, ApplicationTheme};
use lumina_persistence::SqliteStorage;

#[test]
fn application_theme_defaults_to_system_and_restores_all_accepted_modes(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("theme.sqlite");
  let mut application = Application::start(SqliteStorage::open(&path)?)?;
  assert_eq!(application.snapshot().application_theme, ApplicationTheme::System);
  application.restore_workflows()?;
  let id = application.snapshot().active_workspace_id.clone();
  application.apply_appearance(
    &id,
    lumina_app::Appearance {
      color: Some("#123456ff".into()),
      ..Default::default()
    },
  )?;
  for mode in [ApplicationTheme::Dark, ApplicationTheme::Light, ApplicationTheme::System] {
    application.set_application_theme(mode)?;
    assert_eq!(application.snapshot().application_theme, mode);
    drop(application);
    application = Application::start(SqliteStorage::open(&path)?)?;
    application.restore_workflows()?;
    assert_eq!(application.snapshot().application_theme, mode);
    assert_eq!(application.snapshot().workspaces[0].appearance.color.as_deref(), Some("#123456FF"));
  }
  Ok(())
}

#[test]
fn upgrading_version_five_preserves_workspace_identity_and_uses_system_theme(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("old-theme.sqlite");
  let application = Application::start(SqliteStorage::open(&path)?)?;
  let workspace = application.snapshot().active_workspace_id.clone();
  drop(application);
  {
    let fixture = rusqlite::Connection::open(&path)?;
    fixture.execute_batch(
      "ALTER TABLE application_settings DROP COLUMN application_theme; PRAGMA user_version=5;",
    )?;
  }
  let application = Application::start(SqliteStorage::open(&path)?)?;
  assert_eq!(application.snapshot().active_workspace_id, workspace);
  assert_eq!(application.snapshot().application_theme, ApplicationTheme::System);
  Ok(())
}
