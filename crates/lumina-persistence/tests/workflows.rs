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
    CREATE TABLE translations(id INTEGER PRIMARY KEY,title TEXT,description TEXT);
    CREATE TABLE books(id INTEGER PRIMARY KEY,translation_id INTEGER,book_number INTEGER,name TEXT,author TEXT);
    CREATE TABLE verses(id INTEGER PRIMARY KEY,translation_id INTEGER,book_id INTEGER,chapter INTEGER,verse INTEGER,text TEXT,sort_order INTEGER);
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
  assert_eq!(
    app.book_information(id.clone(), None)?.and_then(|information| information.author),
    Some("Paul".into())
  );
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

struct FaultStorage {
  storage: SqliteStorage,
  fail: std::sync::Arc<std::sync::atomic::AtomicBool>,
}
impl lumina_app::Storage for FaultStorage {
  type Error = std::io::Error;
  fn initialize(&mut self) -> Result<lumina_app::StoredState, Self::Error> {
    self.storage.initialize().map_err(std::io::Error::other)
  }
  fn resolve_reference(
    &self,
    translation: &lumina_app::TranslationId,
    coordinate: VerseCoordinate,
  ) -> Result<Option<lumina_app::ResolvedVerse>, Self::Error> {
    self.storage.resolve_reference(translation, coordinate).map_err(std::io::Error::other)
  }
}
impl lumina_app::WorkspaceStorage for FaultStorage {
  fn load_workflow_state(&self) -> Result<Vec<lumina_app::DurableWorkspace>, Self::Error> {
    self.storage.load_workflow_state().map_err(std::io::Error::other)
  }
  fn save_workflow_state(
    &mut self,
    workspaces: &[lumina_app::DurableWorkspace],
    active: &lumina_app::WorkspaceId,
  ) -> Result<(), Self::Error> {
    if self.fail.load(std::sync::atomic::Ordering::SeqCst) {
      return Err(std::io::Error::other("injected storage failure"));
    }
    self.storage.save_workflow_state(workspaces, active).map_err(std::io::Error::other)
  }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum NativeFault {
  Open,
  Close,
  Delivery,
  Preference,
}

#[derive(Default)]
struct FaultAudience {
  inner: Audience,
  fault: Option<NativeFault>,
  fail_storage_on_delivery: Option<std::sync::Arc<std::sync::atomic::AtomicBool>>,
}
impl NativeAudience for FaultAudience {
  fn open(&mut self, owner: &AudienceOwner, hidden: bool) -> Result<(), String> {
    if self.fault == Some(NativeFault::Open) {
      Err("injected creation failure".into())
    } else {
      self.inner.open(owner, hidden)
    }
  }
  fn close(&mut self, owner: &AudienceOwner) -> Result<(), String> {
    if self.fault == Some(NativeFault::Close) {
      Err("injected closure failure".into())
    } else {
      self.inner.close(owner)
    }
  }
  fn dispatch(&mut self, output: &AudienceOutput) -> Result<(), String> {
    self.inner.dispatch(output)?;
    if let Some(fail) = &self.fail_storage_on_delivery {
      fail.store(true, std::sync::atomic::Ordering::SeqCst);
    }
    if self.fault == Some(NativeFault::Delivery) {
      Err("delivery may have begun".into())
    } else {
      Ok(())
    }
  }
  fn set_cursor(&mut self, owner: &AudienceOwner, hidden: bool) -> Result<(), String> {
    if self.fault == Some(NativeFault::Preference) {
      Err("injected visibility failure".into())
    } else {
      self.inner.set_cursor(owner, hidden)
    }
  }
  fn set_fullscreen(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String> {
    if self.fault == Some(NativeFault::Preference) {
      Err("unsupported fullscreen".into())
    } else {
      self.inner.set_fullscreen(owner, enabled)
    }
  }
  fn set_always_on_top(&mut self, owner: &AudienceOwner, enabled: bool) -> Result<(), String> {
    if self.fault == Some(NativeFault::Preference) {
      Err("unsupported stacking".into())
    } else {
      self.inner.set_always_on_top(owner, enabled)
    }
  }
}

#[test]
fn durable_intent_rejects_before_dispatch_and_reports_storage_uncertainty_after_delivery(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::OperationError;
  let directory = tempfile::tempdir()?;
  let fail = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
  let storage = FaultStorage {
    storage: SqliteStorage::open(&directory.path().join("managed.sqlite"))?,
    fail: fail.clone(),
  };
  let mut app = Application::start(storage)?;
  app.restore_workflows()?;
  let id = app.snapshot().active_workspace_id.clone();
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
  let mut native = FaultAudience::default();
  app.open_audience(&id, &mut native)?;
  fail.store(true, std::sync::atomic::Ordering::SeqCst);
  assert!(matches!(
    app.send_verse(&id, verse.clone(), VerseActionKind::SendLive, true, 0.0, &mut native),
    Err(OperationError::Storage(_))
  ));
  assert!(app.snapshot().workspaces[0].current_verse.is_none());
  assert!(app.history(&id, false)?.is_empty());
  assert_eq!(native.inner.outputs.len(), 1);
  fail.store(false, std::sync::atomic::Ordering::SeqCst);
  native.fault = Some(NativeFault::Delivery);
  native.fail_storage_on_delivery = Some(fail.clone());
  let result = app.send_verse(&id, verse, VerseActionKind::SendLive, true, 1.0, &mut native);
  assert!(matches!(result, Err(OperationError::StorageAfterDelivery { .. })));
  assert_eq!(app.history(&id, false)?[0].outcome, ProjectionOutcome::Unconfirmed);
  assert_eq!(
    app.snapshot().workspaces[0].current_verse.as_ref().map(|verse| verse.coordinate.verse),
    Some(16)
  );
  fail.store(false, std::sync::atomic::Ordering::SeqCst);
  native.fault = None;
  native.fail_storage_on_delivery = None;
  let verse = app
    .resolve_reference(ReferenceRequest {
      workspace_id: id.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 17,
      },
    })?
    .verse;
  app.send_verse(&id, verse, VerseActionKind::SendLive, true, 2.0, &mut native)?;
  assert_eq!(app.history(&id, false)?.len(), 2);
  assert_eq!(
    app.snapshot().workspaces[0].current_verse.as_ref().map(|verse| verse.coordinate.verse),
    Some(17)
  );
  Ok(())
}

#[test]
fn native_failures_and_display_loss_retire_only_the_intended_audience(
) -> Result<(), Box<dyn std::error::Error>> {
  let directory = tempfile::tempdir()?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  app.restore_workflows()?;
  let first = app.snapshot().active_workspace_id.clone();
  let mut native = FaultAudience {
    fault: Some(NativeFault::Open),
    ..Default::default()
  };
  assert!(app.open_audience(&first, &mut native).is_err());
  assert!(app.snapshot().workspaces[0].owner.is_none());
  native.fault = None;
  let first_owner = app.open_audience(&first, &mut native)?;
  let second = app.add_workspace(None)?;
  let second_owner = app.open_audience(&second.workspace_id, &mut native)?;
  let verse = app
    .resolve_reference(ReferenceRequest {
      workspace_id: first.clone(),
      coordinate: VerseCoordinate {
        book_number: 43,
        chapter: 3,
        verse: 16,
      },
    })?
    .verse;
  app.send_verse(&first, verse, VerseActionKind::SendLive, true, 0.0, &mut native)?;
  native.fault = Some(NativeFault::Preference);
  assert!(app.set_hide_cursor(&first, false, &mut native).is_err());
  assert!(app.set_fullscreen(&first, true, &mut native).is_err());
  assert!(app.set_always_on_top(&first, true, &mut native).is_err());
  assert!(app.snapshot().workspaces[0].settings.hide_cursor);
  assert!(!app.snapshot().workspaces[0].fullscreen);
  assert!(!app.snapshot().workspaces[0].always_on_top);
  native.fault = Some(NativeFault::Close);
  assert!(app.close_audience(&first, &mut native).is_err());
  assert_eq!(app.snapshot().workspaces[0].owner, Some(first_owner.clone()));
  assert!(app.audience_closed(&first_owner.instance_id));
  assert!(app.snapshot().workspaces[0].current_verse.is_some());
  assert_eq!(app.history(&first, false)?[0].outcome, ProjectionOutcome::Unconfirmed);
  assert_eq!(app.snapshot().workspaces[1].owner, Some(second_owner));
  native.fault = None;
  native.fault = None;
  let recovered = app.open_audience(&first, &mut native)?;
  assert_ne!(recovered.instance_id, first_owner.instance_id);
  assert!(!app.audience_closed(&first_owner.instance_id));
  assert!(matches!(
    native.inner.outputs.last().map(|output| &output.content),
    Some(AudienceContent::Blank)
  ));
  Ok(())
}

#[test]
fn unicode_counts_and_invalid_profiles_do_not_change_confirmed_appearance(
) -> Result<(), Box<dyn std::error::Error>> {
  use lumina_app::{Appearance, SizeBand};
  let directory = tempfile::tempdir()?;
  let mut app = Application::start(SqliteStorage::open(&directory.path().join("managed.sqlite"))?)?;
  app.restore_workflows()?;
  let id = app.snapshot().active_workspace_id.clone();
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
  for (text, count) in [
    ("God is love.", 12),
    (" God is love. ", 14),
    ("e\u{301}", 1),
    ("é", 1),
    ("a\r\nb", 3),
    ("👩‍👩‍👧‍👦", 1),
    ("🇵🇭", 1),
    ("👍🏽", 1),
  ] {
    let mut capture = verse.clone();
    capture.text = text.into();
    app.send_verse(
      &id,
      capture,
      VerseActionKind::Navigation,
      false,
      0.0,
      &mut Audience::default(),
    )?;
    assert_eq!(app.appearance_state(&id)?.grapheme_count, Some(count), "{text:?}");
  }
  let confirmed = Appearance {
    color: Some("#abcdef01".into()),
    bands: Some(vec![SizeBand {
      lower: 0,
      upper: None,
      font_size_px: 64.0,
    }]),
    ..Default::default()
  };
  app.apply_appearance(&id, confirmed)?;
  let confirmed = app.discard_appearance(&id)?;
  assert_eq!(confirmed.color.as_deref(), Some("#ABCDEF01"));
  for bands in invalid_size_profiles() {
    let mut proposal = confirmed.clone();
    proposal.bands = Some(bands);
    assert!(app.apply_appearance(&id, proposal).is_err());
    assert_eq!(app.discard_appearance(&id)?, confirmed);
  }
  let mut invalid = confirmed.clone();
  invalid.color = Some("#ffffff".into());
  assert!(app.apply_appearance(&id, invalid).is_err());
  assert_eq!(app.discard_appearance(&id)?, confirmed);
  Ok(())
}

fn invalid_size_profiles() -> Vec<Vec<lumina_app::SizeBand>> {
  use lumina_app::SizeBand;
  vec![
    vec![SizeBand {
      lower: 1,
      upper: None,
      font_size_px: 64.0,
    }],
    vec![SizeBand {
      lower: 0,
      upper: Some(12),
      font_size_px: 64.0,
    }],
    vec![
      SizeBand {
        lower: 0,
        upper: Some(12),
        font_size_px: 64.0,
      },
      SizeBand {
        lower: 11,
        upper: None,
        font_size_px: 64.0,
      },
    ],
    vec![SizeBand {
      lower: 0,
      upper: None,
      font_size_px: 0.0,
    }],
    vec![SizeBand {
      lower: 0,
      upper: None,
      font_size_px: f64::NAN,
    }],
    vec![SizeBand {
      lower: 0,
      upper: None,
      font_size_px: f64::INFINITY,
    }],
    vec![SizeBand {
      lower: 0,
      upper: None,
      font_size_px: 513.0,
    }],
  ]
}
