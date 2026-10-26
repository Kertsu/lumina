//! Atomic durable workspace/history snapshots. Captures do not depend on live editions.

use crate::{SqliteStorage, StorageError};
use lumina_app::{
  Appearance, DurableWorkspace, TranslationId, WorkspaceId, WorkspaceSettings, WorkspaceStorage,
};
use rusqlite::params;

impl WorkspaceStorage for SqliteStorage {
  fn load_workflow_state(&self) -> Result<Vec<DurableWorkspace>, StorageError> {
    let mut statement = self.connection.prepare(
      "SELECT w.id,w.name,w.selected_translation_id,w.hide_cursor,d.data
       FROM workspaces w LEFT JOIN workspace_data d ON d.workspace_id=w.id ORDER BY w.position,w.id"
    ).map_err(StorageError::WorkspaceSql)?;
    let rows = statement
      .query_map([], |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, String>(2)?,
          row.get::<_, bool>(3)?,
          row.get::<_, Option<String>>(4)?,
        ))
      })
      .map_err(StorageError::WorkspaceSql)?;
    rows
      .map(|row| {
        let (id, name, translation, hide_cursor, data) = row.map_err(StorageError::WorkspaceSql)?;
        let mut workspace = if let Some(data) = data {
          serde_json::from_str::<DurableWorkspace>(&data).map_err(StorageError::WorkspaceCodec)?
        } else {
          DurableWorkspace {
            workspace_id: WorkspaceId(id.clone()),
            settings: WorkspaceSettings {
              name: name.clone(),
              selected_translation_id: TranslationId(translation.clone()),
              hide_cursor,
            },
            appearance: Appearance::default(),
            history: Vec::new(),
          }
        };
        // Library deletion atomically updates this FK-backed selector; JSON cannot
        // restore a deleted translation or silently reconnect a captured edition.
        workspace.workspace_id = WorkspaceId(id);
        workspace.settings = WorkspaceSettings {
          name,
          selected_translation_id: TranslationId(translation),
          hide_cursor,
        };
        Ok(workspace)
      })
      .collect()
  }

  fn save_workflow_state(
    &mut self,
    workspaces: &[DurableWorkspace],
    active: &WorkspaceId,
  ) -> Result<(), StorageError> {
    let encoded = workspaces
      .iter()
      .map(serde_json::to_string)
      .collect::<Result<Vec<_>, _>>()
      .map_err(StorageError::WorkspaceCodec)?;
    let transaction = self.connection.transaction().map_err(StorageError::WorkspaceSql)?;
    let existing = {
      let mut statement =
        transaction.prepare("SELECT id FROM workspaces").map_err(StorageError::WorkspaceSql)?;
      let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(StorageError::WorkspaceSql)?;
      rows.collect::<rusqlite::Result<Vec<_>>>().map_err(StorageError::WorkspaceSql)?
    };
    let offset: i64 = transaction
      .query_row("SELECT coalesce(max(position),0)+count(*)+1 FROM workspaces", [], |row| {
        row.get(0)
      })
      .map_err(StorageError::WorkspaceSql)?;
    transaction
      .execute("UPDATE workspaces SET position=position+?1", [offset])
      .map_err(StorageError::WorkspaceSql)?;
    for (position, (workspace, data)) in workspaces.iter().zip(encoded).enumerate() {
      let position = i64::try_from(position).map_err(|_| StorageError::InvalidState)?;
      transaction.execute(
        "INSERT INTO workspaces(id,name,position,selected_translation_id,hide_cursor) VALUES(?1,?2,?3,?4,?5)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,selected_translation_id=excluded.selected_translation_id,hide_cursor=excluded.hide_cursor",
        params![workspace.workspace_id.0,workspace.settings.name,position,workspace.settings.selected_translation_id.0,workspace.settings.hide_cursor]
      ).map_err(StorageError::WorkspaceSql)?;
      transaction.execute("INSERT INTO workspace_data(workspace_id,data) VALUES(?1,?2) ON CONFLICT(workspace_id) DO UPDATE SET data=excluded.data", params![workspace.workspace_id.0,data]).map_err(StorageError::WorkspaceSql)?;
    }
    transaction
      .execute(
        "UPDATE application_settings SET active_workspace_id=?1 WHERE singleton=1",
        [&active.0],
      )
      .map_err(StorageError::WorkspaceSql)?;
    for id in existing {
      if !workspaces.iter().any(|workspace| workspace.workspace_id.0 == id) {
        transaction
          .execute("DELETE FROM workspaces WHERE id=?1", [id])
          .map_err(StorageError::WorkspaceSql)?;
      }
    }
    transaction.commit().map_err(StorageError::WorkspaceSql)
  }
}
