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

#[test]
fn native_navigation_and_translation_changes_preserve_captures_on_rejection(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let mut application =
    Application::start(SqliteStorage::open(&directory.path().join("app.sqlite"))?)?;
  application.restore_workflows()?;
  let id = application.snapshot().active_workspace_id.clone();
  let verse = application
    .resolve_reference(ReferenceRequest {
      workspace_id: id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })?
    .verse;
  let mut native = Audience::default();
  application.send_verse(&id, verse, VerseActionKind::Navigation, false, 0.0, &mut native)?;
  assert!(application.navigation_state(&id)?.can_next);
  application.navigate(&id, lumina_app::NavigationDirection::Next, 1.0, &mut native)?;
  assert_eq!(
    application.snapshot().workspaces[0].current_verse.as_ref().map(|v| v.coordinate.verse),
    Some(17)
  );
  let before = application.snapshot().workspaces[0].current_verse.clone();
  assert!(application
    .change_translation(&id, lumina_app::TranslationId("missing".into()), 2.0, &mut native)
    .is_err());
  assert_eq!(application.snapshot().workspaces[0].current_verse, before);
  assert!(application.snapshot().workspaces[0].owner.is_none());
  assert_eq!(application.history(&id, false)?.len(), 2);
  Ok(())
}

// One cross-capability regression follows a Saved copy through its full lifecycle.
#[test]
#[allow(clippy::too_many_lines)]
fn immutable_previews_information_and_assets_survive_source_deletion_and_restart(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{
    Appearance, AudienceState, BackgroundFit, PreviewOrigin, TranslationBackground,
  };
  let directory = tempfile::tempdir()?;
  let source_path = directory.path().join("Bible.sqlite");
  let source = rusqlite::Connection::open(&source_path)?;
  source.execute_batch("PRAGMA user_version=1;
    CREATE TABLE translations(id INTEGER,title TEXT,description TEXT);
    CREATE TABLE books(id INTEGER,translation_id INTEGER,book_number INTEGER,name TEXT,author TEXT);
    CREATE TABLE verses(id INTEGER,translation_id INTEGER,book_id INTEGER,chapter INTEGER,verse INTEGER,text TEXT,sort_order INTEGER);
    INSERT INTO translations VALUES(9,'Original translation','');
    INSERT INTO books VALUES(1,9,45,'Roma','Paul');
    INSERT INTO verses VALUES(1,9,1,16,24,'Original, \"wording\"\nline two.',0),(2,9,1,16,25,'Native next verse.',1);")?;
  drop(source);
  let path = directory.path().join("managed.sqlite");
  let mut app = Application::start(SqliteStorage::open(&path)?)?;
  app.restore_workflows()?;
  let id = app.snapshot().active_workspace_id.clone();
  let review = app.review_import(source_path.to_string_lossy().into())?;
  let imported = app.commit_import(review.token)?;
  let translation_id = imported.translation_ids[0].clone();
  app.select_translation(&id, translation_id.clone())?;
  let image_path = directory.path().join("background.bmp");
  image::RgbImage::from_pixel(1, 1, image::Rgb([17, 34, 51])).save(&image_path)?;
  let asset = app.import_background_asset(image_path.to_string_lossy().into())?;
  assert_eq!((asset.width, asset.height, asset.mime_type.as_str()), (1, 1, "image/bmp"));
  let original_bytes = std::fs::read(&image_path)?;
  std::fs::remove_file(&image_path)?;
  assert_eq!(app.managed_asset(&asset.asset_id)?.bytes, original_bytes);
  app.apply_appearance(
    &id,
    Appearance {
      backgrounds: vec![TranslationBackground {
        translation_id: translation_id.clone(),
        asset_id: Some(asset.asset_id.clone()),
        fallback_color: Some("#112233ff".into()),
        fit: BackgroundFit::Fit,
      }],
      ..Default::default()
    },
  )?;
  let verse = app
    .resolve_reference(ReferenceRequest {
      workspace_id: id.clone(),
      coordinate: VerseCoordinate {
        book_number: 45,
        chapter: 16,
        verse: 24,
      },
    })?
    .verse;
  let preview = app.capture_preview(&id, verse.clone(), PreviewOrigin::Reference)?;
  let mut native = Audience::default();
  let second = app.add_workspace(None)?;
  assert!(app.send_preview(&id, &preview.candidate_id, 0.0, &mut native).is_err());
  app.activate_workspace(&id)?;
  assert!(app.send_preview(&id, &preview.candidate_id, 0.0, &mut native).is_err());
  assert_eq!(
    app.snapshot().workspaces[0].preview.as_ref().map(|candidate| candidate.verse.text.as_str()),
    Some(verse.text.as_str())
  );
  app.open_audience(&id, &mut native)?;
  app.send_preview(&id, &preview.candidate_id, 1.0, &mut native)?;
  assert_eq!(
    app.history(&id, false)?[0]
      .background
      .as_ref()
      .and_then(|background| background.asset_id.as_ref()),
    Some(&asset.asset_id)
  );
  app.set_information_mode(&id, true, None, 2.0, &mut native)?;
  assert_eq!(
    app.snapshot().workspaces[0]
      .information
      .as_ref()
      .and_then(|information| information.author.as_deref()),
    Some("Paul")
  );
  assert_eq!(app.history(&id, false)?.len(), 1);
  app.blank_audience(&id, &mut native)?;
  app.set_information_mode(&id, false, None, 3.0, &mut native)?;
  assert_eq!(app.snapshot().workspaces[0].audience, AudienceState::Blank);
  app.set_information_mode(&id, true, None, 4.0, &mut native)?;
  assert_eq!(app.snapshot().workspaces[0].audience, AudienceState::Blank);
  app.close_audience(&id, &mut native)?;
  app.delete_imported_translation(id.clone(), translation_id.clone(), true)?;
  assert!(!app.navigation_state(&id)?.can_next);
  let second_import = app.review_import(source_path.to_string_lossy().into())?;
  let reimported = app.commit_import(second_import.token)?;
  assert_ne!(reimported.translation_ids[0], translation_id);
  assert!(!app.navigation_state(&id)?.can_next);
  app.open_audience(&id, &mut native)?;
  app.resume_audience(&id, 5.0, &mut native)?;
  assert!(matches!(
    native.outputs.last().map(|output| &output.content),
    Some(AudienceContent::BookInformation { .. })
  ));
  app.set_information_mode(&id, false, None, 6.0, &mut native)?;
  assert_eq!(app.history(&id, false)?.len(), 1);
  let output = native.outputs.last().ok_or("missing return output")?.clone();
  assert_eq!(
    output.background.as_ref().and_then(|background| background.asset_id.as_ref()),
    Some(&asset.asset_id)
  );
  app.acknowledge(
    &output.owner.instance_id,
    lumina_app::AudienceAcknowledgment {
      session_id: output.owner.session_id.clone(),
      action_id: output.action_id.ok_or("missing action")?,
      revision: output.revision,
    },
  )?;
  assert_eq!(app.history(&id, false)?.len(), 2);
  let csv = app.export_history(
    &id,
    app.history(&id, false)?.iter().map(|entry| entry.action_id.clone()).collect(),
  )?;
  assert!(csv.contains("Original, \"\"wording\"\"\nline two."));
  assert!(app.clear_history(&id, false).is_err());
  assert!(app.history(&second.workspace_id, false)?.is_empty());
  drop(app);
  let mut restored = Application::start(SqliteStorage::open(&path)?)?;
  restored.restore_workflows()?;
  assert_eq!(restored.history(&id, false)?.len(), 2);
  assert!(restored.snapshot().workspaces[0].current_verse.is_none());
  assert!(!restored.snapshot().workspaces[0].book_information_mode);
  assert_eq!(restored.managed_asset(&asset.asset_id)?.bytes, original_bytes);
  restored.clear_history(&id, true)?;
  assert!(restored.history(&id, false)?.is_empty());
  Ok(())
}

#[test]
fn image_validation_and_cosmetic_updates_preserve_history_and_revision_order(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{Appearance, BackgroundFit, TranslationBackground};
  let directory = tempfile::tempdir()?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  app.restore_workflows()?;
  let id = app.snapshot().active_workspace_id.clone();
  assert!(app.import_background_bytes(b"not an image".to_vec()).is_err());
  assert!(app.import_background_bytes(vec![0; 20 * 1024 * 1024 + 1]).is_err());
  let path = directory.path().join("image.png");
  image::RgbaImage::from_pixel(1, 1, image::Rgba([1, 2, 3, 255])).save(&path)?;
  let bytes = std::fs::read(&path)?;
  let mut animated = bytes[..8].to_vec();
  animated.extend_from_slice(&0_u32.to_be_bytes());
  animated.extend_from_slice(b"acTL");
  animated.extend_from_slice(&0_u32.to_be_bytes());
  animated.extend_from_slice(&bytes[8..]);
  assert!(app.import_background_bytes(animated).is_err());
  let asset = app.import_background_bytes(bytes)?;
  let mut native = Audience::default();
  app.open_audience(&id, &mut native)?;
  let verse = app
    .resolve_reference(ReferenceRequest {
      workspace_id: id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })?
    .verse;
  app.send_verse(&id, verse, VerseActionKind::SendLive, true, 0.0, &mut native)?;
  let content = native.outputs.last().ok_or("missing output")?.clone();
  let appearance = Appearance {
    backgrounds: vec![TranslationBackground {
      translation_id: app.snapshot().translations[0].translation_id.clone(),
      asset_id: Some(asset.asset_id.clone()),
      fallback_color: None,
      fit: BackgroundFit::Fill,
    }],
    ..Default::default()
  };
  app.apply_appearance(&id, appearance)?;
  app.refresh_audience(&id, &mut native)?;
  let cosmetic = native.outputs.last().ok_or("missing cosmetic output")?;
  assert!(cosmetic.revision > content.revision);
  assert!(cosmetic.action_id.is_none());
  assert_eq!(
    cosmetic.background.as_ref().and_then(|background| background.asset_id.as_ref()),
    Some(&asset.asset_id)
  );
  assert_eq!(app.history(&id, false)?.len(), 1);
  app.acknowledge(
    &content.owner.instance_id,
    lumina_app::AudienceAcknowledgment {
      session_id: content.owner.session_id.clone(),
      action_id: content.action_id.ok_or("missing content action")?,
      revision: content.revision,
    },
  )?;
  assert_eq!(app.history(&id, true)?.len(), 1);
  assert_eq!(app.audience_output(&id)?.revision, cosmetic.revision);
  Ok(())
}
