ALTER TABLE application_settings ADD COLUMN application_theme TEXT NOT NULL DEFAULT 'system'
  CHECK(application_theme IN ('system', 'light', 'dark'));
