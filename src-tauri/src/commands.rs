//! Capability-sized IPC adapters. All accepted transitions stay in lumina-app.

use crate::{
  native::{ApplicationChanged, AudienceAdapter, NativeWindows},
  runtime::{DesktopApplication, DesktopRuntime, RuntimeError},
};
use lumina_app::{
  Appearance, AppearanceState, ApplicationFailure, AssetData, AudienceAcknowledgment,
  AudienceOutput, AudienceOwner, BookInformation, EditionId, HistoryEntry, ImportResult,
  ImportReview, ManagedAsset, NavigationDirection, NavigationState, OperationError,
  PreviewCandidate, PreviewOrigin, ReferenceInputRequest, ReferenceInputResult, ResolvedVerse,
  SearchRequest, SearchResult, TranslationId, VerseActionKind, VerseActionResult, VerseCoordinate,
  WorkspaceId,
};
use tauri::{AppHandle, WebviewWindow};
use tauri_specta::Event;

fn operator(window: &WebviewWindow) -> Result<(), ApplicationFailure> {
  if window.label() == "main" {
    Ok(())
  } else {
    Err(ApplicationFailure::Internal {
      message: "This operation requires the operator window.".into(),
    })
  }
}

/// Called only after the operator's quit shortcut has been confirmed.
#[allow(clippy::needless_pass_by_value, reason = "Tauri injects owned command arguments")]
#[tauri::command]
#[specta::specta]
pub(crate) fn quit_application(
  window: WebviewWindow,
  app: AppHandle,
) -> Result<(), ApplicationFailure> {
  operator(&window)?;
  app.exit(0);
  Ok(())
}

/// Audience keyboard shortcuts request an operator-side native confirmation.
#[allow(clippy::needless_pass_by_value, reason = "Tauri injects owned command arguments")]
#[tauri::command]
#[specta::specta]
pub(crate) fn request_quit_confirmation(
  window: WebviewWindow,
  app: AppHandle,
  windows: tauri::State<'_, NativeWindows>,
) -> Result<(), ApplicationFailure> {
  if window.label() != "main" && windows.owner_for_label(window.label()).is_none() {
    return Err(ApplicationFailure::Internal {
      message: "This window cannot request application quit.".into(),
    });
  }
  crate::quit::request_confirmation(&app);
  Ok(())
}

fn failure(error: &RuntimeError) -> ApplicationFailure {
  crate::report_error("operation", error);
  error.public_failure()
}

pub(crate) fn now_ms() -> f64 {
  // Milliseconds are exact throughout the useful lifetime of this prototype.
  #[allow(clippy::cast_precision_loss)]
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map_or(0.0, |time| time.as_millis() as f64)
}

async fn operation<T: Send + 'static>(
  window: WebviewWindow,
  app: AppHandle,
  runtime: &DesktopRuntime,
  windows: &NativeWindows,
  run: impl FnOnce(
      &mut DesktopApplication,
      &mut AudienceAdapter,
    ) -> Result<T, OperationError<lumina_persistence::StorageError>>
    + Send
    + 'static,
) -> Result<T, ApplicationFailure> {
  operator(&window)?;
  let mut native = windows.adapter(app.clone());
  let result = runtime
    .call(move |application| run(application, &mut native).map_err(RuntimeError::Application))
    .await;
  // An uncertain dispatch may have accepted state even when delivery reports an error.
  let _ = (ApplicationChanged {
    workspace_id: None,
  })
  .emit_to(&app, "main");
  result.map_err(|error| failure(&error))
}

async fn query<T: Send + 'static>(
  window: WebviewWindow,
  app: AppHandle,
  runtime: &DesktopRuntime,
  windows: &NativeWindows,
  run: impl FnOnce(
      &mut DesktopApplication,
      &mut AudienceAdapter,
    ) -> Result<T, OperationError<lumina_persistence::StorageError>>
    + Send
    + 'static,
) -> Result<T, ApplicationFailure> {
  operator(&window)?;
  let mut native = windows.adapter(app.clone());
  let result = runtime
    .call(move |application| run(application, &mut native).map_err(RuntimeError::Application))
    .await;
  result.map_err(|error| failure(&error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn open_audience(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<AudienceOwner, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.open_audience(&workspace_id, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audience_state(
  window: WebviewWindow,
  windows: tauri::State<'_, NativeWindows>,
) -> Result<Option<AudienceOutput>, ApplicationFailure> {
  if windows.owner_for_label(window.label()).is_none() {
    return Err(ApplicationFailure::Internal {
      message: "The audience instance is unavailable.".into(),
    });
  }
  Ok(windows.output_for_label(window.label()))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn acknowledge_audience(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  acknowledgment: AudienceAcknowledgment,
) -> Result<(), ApplicationFailure> {
  let owner =
    windows.owner_for_label(window.label()).ok_or_else(|| ApplicationFailure::Internal {
      message: "Only the owned audience can acknowledge its output.".into(),
    })?;
  let result = runtime
    .call(move |application| {
      application
        .acknowledge(&owner.instance_id, acknowledgment)
        .map(|_| ())
        .map_err(RuntimeError::Application)
    })
    .await;
  // A failed outcome write leaves a typed runtime notice for the operator.
  let _ = (ApplicationChanged {
    workspace_id: None,
  })
  .emit_to(&app, "main");
  result.map_err(|error| failure(&error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn close_audience(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.close_audience(&workspace_id, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn blank_audience(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.blank_audience(&workspace_id, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn resume_audience(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.resume_audience(&workspace_id, now_ms(), native).map(|_| ())
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn add_workspace(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  name: Option<String>,
) -> Result<WorkspaceId, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.add_workspace(name).map(|workspace| workspace.workspace_id)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_workspace(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  name: String,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.rename_workspace(&workspace_id, name, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn activate_workspace(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.activate_workspace(&workspace_id)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reorder_workspaces(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_ids: Vec<WorkspaceId>,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.reorder_workspaces(workspace_ids)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn remove_workspace(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  confirmed: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.remove_workspace(&workspace_id, confirmed, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn select_translation(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  translation_id: TranslationId,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.select_translation(&workspace_id, translation_id)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn change_current_translation(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  translation_id: TranslationId,
) -> Result<VerseActionResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.change_translation(&workspace_id, translation_id, now_ms(), native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn dismiss_preview(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  candidate_id: String,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.dismiss_preview(&workspace_id, &candidate_id).map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn send_preview(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  candidate_id: String,
) -> Result<VerseActionResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.send_preview(&workspace_id, &candidate_id, now_ms(), native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn navigate_verse(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  direction: NavigationDirection,
) -> Result<VerseActionResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.navigate(&workspace_id, direction, now_ms(), native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_hide_cursor(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  hidden: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.set_hide_cursor(&workspace_id, hidden, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_audience_fullscreen(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  enabled: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.set_fullscreen(&workspace_id, enabled, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_audience_always_on_top(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  enabled: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.set_always_on_top(&workspace_id, enabled, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn read_history(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  projected_only: bool,
) -> Result<Vec<HistoryEntry>, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.history(&workspace_id, projected_only).map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn recall_history(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  action_id: String,
) -> Result<VerseActionResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.recall_history(&workspace_id, &action_id, now_ms(), native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn copy_history(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  action_id: String,
) -> Result<String, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.copy_history(&workspace_id, &action_id).map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_history(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  action_ids: Vec<String>,
) -> Result<String, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.export_history(&workspace_id, action_ids).map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn clear_history(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  confirmed: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.clear_history(&workspace_id, confirmed)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn apply_appearance(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  appearance: Appearance,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application.apply_appearance(&workspace_id, appearance)?;
    application.refresh_audience(&workspace_id, native)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn appearance_state(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<AppearanceState, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.appearance_state(&workspace_id).map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn resolve_reference_input(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  request: ReferenceInputRequest,
) -> Result<ReferenceInputResult, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.resolve_reference_input(request)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn search_verses(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  request: SearchRequest,
) -> Result<SearchResult, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| application.search(request))
    .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn review_import(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  path: String,
) -> Result<ImportReview, ApplicationFailure> {
  operator(&window)?;
  let staged =
    tauri::async_runtime::spawn_blocking(move || lumina_persistence::stage_import(&path))
      .await
      .map_err(|error| ApplicationFailure::Internal {
        message: format!("Could not review the Bible file: {error}"),
      })?
      .map_err(|error| {
        crate::report_error("import review", &error);
        error.public_failure()
      })?;
  query(window, app, &runtime, &windows, move |application, _native| {
    application.register_import(staged)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn commit_import(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  token: String,
) -> Result<ImportResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.commit_import(token)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn cancel_import(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  token: String,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.cancel_import(token);
    Ok(())
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_translation(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  translation_id: TranslationId,
  confirmed: bool,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    application.delete_imported_translation(workspace_id, translation_id, confirmed)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn book_information(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  book_number: Option<i32>,
) -> Result<Option<BookInformation>, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.book_information(workspace_id, book_number)
  })
  .await
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct VerseTarget {
  pub workspace_id: WorkspaceId,
  pub translation_id: TranslationId,
  pub edition_id: Option<EditionId>,
  pub coordinate: VerseCoordinate,
}

/// Resolve trusted installed text before capturing or selecting it.
#[tauri::command]
#[specta::specta]
pub(crate) async fn preview_verse(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  target: VerseTarget,
  origin: PreviewOrigin,
) -> Result<PreviewCandidate, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, _native| {
    let verse =
      application.resolve_verse(target.translation_id, target.edition_id, target.coordinate)?;
    application
      .capture_preview(&target.workspace_id, verse, origin)
      .map_err(OperationError::Rejected)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn select_verse(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  target: VerseTarget,
) -> Result<VerseActionResult, ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    let verse =
      application.resolve_verse(target.translation_id, target.edition_id, target.coordinate)?;
    application.send_verse(
      &target.workspace_id,
      verse,
      VerseActionKind::SendLive,
      true,
      now_ms(),
      native,
    )
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_books(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  translation_id: TranslationId,
) -> Result<Vec<BookInformation>, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.list_books(translation_id)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn chapter_verses(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  translation_id: TranslationId,
  book_number: i32,
  chapter: i32,
) -> Result<Vec<ResolvedVerse>, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.chapter_verses(translation_id, book_number, chapter)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn pick_bible_import(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
) -> Result<Option<ImportReview>, ApplicationFailure> {
  operator(&window)?;
  let Some(file) = rfd::AsyncFileDialog::new()
    .set_title("Add Bible translations")
    .add_filter("SQLite Bible", &["sqlite", "sqlite3", "db"])
    .pick_file()
    .await
  else {
    return Ok(None);
  };
  let path = file
    .path()
    .to_str()
    .ok_or_else(|| ApplicationFailure::Internal {
      message: "The selected path is not valid Unicode.".into(),
    })?
    .to_string();
  review_import(window, app, runtime, windows, path).await.map(Some)
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_history(
  window: WebviewWindow,
  runtime: tauri::State<'_, DesktopRuntime>,
  workspace_id: WorkspaceId,
  action_ids: Vec<String>,
) -> Result<Option<String>, ApplicationFailure> {
  operator(&window)?;
  let csv = runtime
    .call(move |application| {
      application
        .export_history(&workspace_id, action_ids)
        .map_err(OperationError::Rejected)
        .map_err(RuntimeError::Application)
    })
    .await
    .map_err(|error| failure(&error))?;
  let Some(file) = rfd::AsyncFileDialog::new()
    .set_title("Export visible verse history")
    .set_file_name("lumina-history.csv")
    .add_filter("CSV", &["csv"])
    .save_file()
    .await
  else {
    return Ok(None);
  };
  file.write(csv.as_bytes()).await.map_err(|error| ApplicationFailure::Internal {
    message: format!("Could not export history: {error}"),
  })?;
  Ok(Some(file.path().to_string_lossy().into_owned()))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn library_revision(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
) -> Result<u32, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| application.library_revision())
    .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_information_mode(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
  enabled: bool,
  book_number: Option<i32>,
) -> Result<(), ApplicationFailure> {
  operation(window, app, &runtime, &windows, move |application, native| {
    application
      .set_information_mode(&workspace_id, enabled, book_number, now_ms(), native)
      .map(|_| ())
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn import_background(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
) -> Result<Option<ManagedAsset>, ApplicationFailure> {
  operator(&window)?;
  let Some(file) = rfd::AsyncFileDialog::new()
    .set_title("Choose audience background")
    .add_filter("Still image", &["jpg", "jpeg", "png", "bmp"])
    .pick_file()
    .await
  else {
    return Ok(None);
  };
  let path = file.path().to_string_lossy().into_owned();
  query(window, app, &runtime, &windows, move |application, _native| {
    application.import_background_asset(path)
  })
  .await
  .map(Some)
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn builtin_background(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  name: String,
) -> Result<ManagedAsset, ApplicationFailure> {
  let bytes: &[u8] = match name.as_str() {
    "mountains" => include_bytes!("../../public/backgrounds/mountains.jpg"),
    "forest" => include_bytes!("../../public/backgrounds/forest.jpg"),
    _ => {
      return Err(ApplicationFailure::AssetRejected {
        message: "The background is unavailable.".into(),
        data: AssetData {
          asset_id: None,
          reason: "unknown builtin".into(),
        },
      })
    }
  };
  query(window, app, &runtime, &windows, move |application, _native| {
    application.import_background_bytes(bytes.to_vec())
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn import_background_data(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  data_url: String,
) -> Result<ManagedAsset, ApplicationFailure> {
  use base64::Engine;
  operator(&window)?;
  let invalid = || ApplicationFailure::AssetRejected {
    message: "Choose a JPEG, PNG or BMP image up to 20 MiB.".into(),
    data: AssetData {
      asset_id: None,
      reason: "invalid image data".into(),
    },
  };
  if data_url.len() > 28_000_000 {
    return Err(invalid());
  }
  let (header, body) = data_url.split_once(',').ok_or_else(invalid)?;
  if !header.starts_with("data:image/") || !header.ends_with(";base64") {
    return Err(invalid());
  }
  let bytes = base64::engine::general_purpose::STANDARD.decode(body).map_err(|_| invalid())?;
  query(window, app, &runtime, &windows, move |application, _native| {
    application.import_background_bytes(bytes)
  })
  .await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn read_asset_uri(
  window: WebviewWindow,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  asset_id: String,
) -> Result<String, ApplicationFailure> {
  use base64::Engine;
  if window.label() != "main" && windows.owner_for_label(window.label()).is_none() {
    return Err(ApplicationFailure::Internal {
      message: "The audience instance is unavailable.".into(),
    });
  }
  let data = runtime
    .call(move |application| {
      application.managed_asset(&asset_id).map_err(RuntimeError::Application)
    })
    .await
    .map_err(|error| failure(&error))?;
  Ok(format!(
    "data:{};base64,{}",
    data.asset.mime_type,
    base64::engine::general_purpose::STANDARD.encode(data.bytes)
  ))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn navigation_state(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  windows: tauri::State<'_, NativeWindows>,
  workspace_id: WorkspaceId,
) -> Result<NavigationState, ApplicationFailure> {
  query(window, app, &runtime, &windows, move |application, _native| {
    application.navigation_state(&workspace_id)
  })
  .await
}

/// Shared confirmed palette preference; every window reads the same accepted state.
#[tauri::command]
#[specta::specta]
pub(crate) async fn set_application_theme(
  window: WebviewWindow,
  app: AppHandle,
  runtime: tauri::State<'_, DesktopRuntime>,
  theme: lumina_app::ApplicationTheme,
) -> Result<(), ApplicationFailure> {
  operator(&window)?;
  runtime
    .call(move |application| {
      application.set_application_theme(theme).map_err(RuntimeError::Application)
    })
    .await
    .map_err(|error| failure(&error))?;
  let _ = (ApplicationChanged {
    workspace_id: None,
  })
  .emit(&app);
  Ok(())
}
