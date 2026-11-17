ALTER TABLE application_settings
ADD COLUMN auto_open_search_summary INTEGER NOT NULL DEFAULT 0
CHECK (auto_open_search_summary IN (0, 1));
