use lumina_app::{
  Application, AudienceContent, AudienceOutput, AudienceOwner, NativeAudience, ProjectionOutcome,
  ReferenceRequest, VerseActionKind, VerseCoordinate,
};
use lumina_persistence::SqliteStorage;

#[derive(Default)]
struct Audience {
  outputs: Vec<AudienceOutput>,
}
impl NativeAudience for Audience {
  fn open(&mut self, _: &AudienceOwner, _: bool) -> Result<(), String> {
    Ok(())
  }
  fn close(&mut self, _: &AudienceOwner) -> Result<(), String> {
    Ok(())
  }
  fn dispatch(&mut self, output: &AudienceOutput) -> Result<(), String> {
    self.outputs.push(output.clone());
    Ok(())
  }
  fn set_cursor(&mut self, _: &AudienceOwner, _: bool) -> Result<(), String> {
    Ok(())
  }
  fn set_fullscreen(&mut self, _: &AudienceOwner, _: bool) -> Result<(), String> {
    Ok(())
  }
  fn set_always_on_top(&mut self, _: &AudienceOwner, _: bool) -> Result<(), String> {
    Ok(())
  }
}

#[test]
fn closed_output_rejects_send_and_open_starts_blank() -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let mut application =
    Application::start(SqliteStorage::open(&directory.path().join("app.sqlite"))?)?;
  application.restore_workflows()?;
  let workspace_id = application.snapshot().active_workspace_id.clone();
  let verse = application
    .resolve_reference(ReferenceRequest {
      workspace_id: workspace_id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })?
    .verse;
  let mut audience = Audience::default();
  assert!(application
    .send_verse(&workspace_id, verse.clone(), VerseActionKind::SendLive, true, 0.0, &mut audience)
    .is_err());
  assert!(application.snapshot().workspaces[0].current_verse.is_none());
  application.open_audience(&workspace_id, &mut audience)?;
  assert!(matches!(audience.outputs[0].content, AudienceContent::Blank));
  let action = application.send_verse(
    &workspace_id,
    verse,
    VerseActionKind::SendLive,
    true,
    100.0,
    &mut audience,
  )?;
  assert_eq!(action.outcome, ProjectionOutcome::AwaitingConfirmation);
  application.expire_projections(5_100.0)?;
  assert_eq!(application.history(&workspace_id, false)?[0].outcome, ProjectionOutcome::Unconfirmed);
  assert_eq!(
    application.snapshot().workspaces[0].current_verse.as_ref().map(|v| v.coordinate.verse),
    Some(16)
  );
  Ok(())
}

#[test]
fn authenticated_acknowledgments_confirm_original_actions_without_reverting_newer_content(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let mut application =
    Application::start(SqliteStorage::open(&directory.path().join("app.sqlite"))?)?;
  application.restore_workflows()?;
  let id = application.snapshot().active_workspace_id.clone();
  let mut audience = Audience::default();
  let owner = application.open_audience(&id, &mut audience)?;
  let mut requests = Vec::new();
  for verse_number in [16, 17] {
    let verse = application
      .resolve_reference(ReferenceRequest {
        workspace_id: id.clone(),
        coordinate: VerseCoordinate {
          book_number: 43,
          chapter: 3,
          verse: verse_number,
        },
      })?
      .verse;
    requests.push(application.send_verse(
      &id,
      verse,
      VerseActionKind::SendLive,
      true,
      100.0,
      &mut audience,
    )?);
  }
  let output = &audience.outputs[1];
  let ack = lumina_app::AudienceAcknowledgment {
    session_id: owner.session_id.clone(),
    action_id: requests[0].action_id.clone(),
    revision: output.revision,
  };
  assert!(!application.acknowledge("another-window", ack.clone())?);
  assert!(application.acknowledge(&owner.instance_id, ack.clone())?);
  assert!(application.acknowledge(&owner.instance_id, ack.clone())?);
  assert_eq!(application.history(&id, true)?.len(), 1);
  assert_eq!(
    application.snapshot().workspaces[0].current_verse.as_ref().map(|v| v.coordinate.verse),
    Some(17)
  );
  application.close_audience(&id, &mut audience)?;
  let reopened = application.open_audience(&id, &mut audience)?;
  assert_ne!(owner.instance_id, reopened.instance_id);
  assert!(!application.acknowledge(&owner.instance_id, ack)?);
  Ok(())
}

#[test]
fn twenty_workspaces_restore_order_names_and_active_identity_with_closed_audiences(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let path = directory.path().join("app.sqlite");
  let mut application = Application::start(SqliteStorage::open(&path)?)?;
  application.restore_workflows()?;
  for number in 2..=20 {
    application.add_workspace(Some(format!("Audience {number}")))?;
  }
  let twentieth = application.snapshot().workspaces[19].workspace_id.clone();
  application.rename_workspace(&twentieth, "North hall".into())?;
  let mut order = application
    .snapshot()
    .workspaces
    .iter()
    .map(|workspace| workspace.workspace_id.clone())
    .collect::<Vec<_>>();
  let item = order.remove(19);
  order.insert(2, item);
  application.reorder_workspaces(order.clone())?;
  application.activate_workspace(&twentieth)?;
  let mut audience = Audience::default();
  application.open_audience(&twentieth, &mut audience)?;
  application.set_hide_cursor(&twentieth, false, &mut audience)?;
  drop(application);
  let mut restored = Application::start(SqliteStorage::open(&path)?)?;
  restored.restore_workflows()?;
  assert_eq!(restored.snapshot().active_workspace_id, twentieth);
  assert_eq!(
    restored
      .snapshot()
      .workspaces
      .iter()
      .map(|workspace| workspace.workspace_id.clone())
      .collect::<Vec<_>>(),
    order
  );
  assert_eq!(restored.snapshot().workspaces[2].settings.name, "North hall");
  assert!(!restored.snapshot().workspaces[2].settings.hide_cursor);
  assert!(restored
    .snapshot()
    .workspaces
    .iter()
    .all(|workspace| workspace.owner.is_none() && workspace.current_verse.is_none()));
  assert!(restored.remove_workspace(&twentieth, false, &mut audience).is_err());
  restored.remove_workspace(&twentieth, true, &mut audience)?;
  assert_eq!(restored.snapshot().workspaces.len(), 19);
  Ok(())
}

#[test]
fn appearance_counts_original_graphemes_and_applies_shared_bands_atomically(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let mut application =
    Application::start(SqliteStorage::open(&directory.path().join("app.sqlite"))?)?;
  application.restore_workflows()?;
  let id = application.snapshot().active_workspace_id.clone();
  let mut verse = application
    .resolve_reference(ReferenceRequest {
      workspace_id: id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })?
    .verse;
  verse.text = "God is love.".into();
  application.send_verse(
    &id,
    verse,
    VerseActionKind::Navigation,
    false,
    0.0,
    &mut Audience::default(),
  )?;
  let before = application.appearance_state(&id)?;
  assert_eq!(before.grapheme_count, Some(12));
  assert_eq!(before.active_band, None);
  let appearance = lumina_app::Appearance {
    bands: Some(vec![
      lumina_app::SizeBand {
        lower: 0,
        upper: Some(12),
        font_size_px: 72.0,
      },
      lumina_app::SizeBand {
        lower: 12,
        upper: None,
        font_size_px: 64.0,
      },
    ]),
    ..Default::default()
  };
  application.apply_appearance(&id, appearance.clone())?;
  assert_eq!(application.appearance_state(&id)?.active_band, Some(1));
  let mut invalid = appearance.clone();
  invalid.bands.as_mut().ok_or("missing bands")?[1].lower = 13;
  assert!(application.apply_appearance(&id, invalid).is_err());
  assert_eq!(application.discard_appearance(&id)?, appearance);
  Ok(())
}
