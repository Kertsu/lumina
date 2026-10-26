CREATE TABLE workspace_data (
  workspace_id TEXT PRIMARY KEY NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK (json_valid(data))
) STRICT;
CREATE TABLE managed_assets (
  id TEXT PRIMARY KEY NOT NULL DEFAULT ('asset_' || lower(hex(randomblob(16)))),
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes BLOB NOT NULL
) STRICT;
