CREATE TABLE translations (
  id TEXT PRIMARY KEY NOT NULL DEFAULT ('translation_' || lower(hex(randomblob(16)))),
  edition_id TEXT NOT NULL UNIQUE DEFAULT ('edition_' || lower(hex(randomblob(16)))),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(CAST(title AS BLOB)) <= 512),
  description TEXT NOT NULL CHECK (length(CAST(description AS BLOB)) <= 16384),
  bundled INTEGER NOT NULL DEFAULT 0 CHECK (bundled IN (0, 1)),
  publisher_edition_id TEXT,
  artifact_sha256 TEXT,
  edition_label TEXT,
  source_name TEXT,
  source_url TEXT,
  rights_notice TEXT
) STRICT;

CREATE UNIQUE INDEX bundled_publisher_edition
  ON translations(publisher_edition_id) WHERE bundled = 1;

CREATE TRIGGER protect_bundled_translation
BEFORE DELETE ON translations WHEN OLD.bundled = 1
BEGIN
  SELECT RAISE(ABORT, 'bundled WEB cannot be deleted');
END;

CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  translation_id TEXT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
  book_number INTEGER NOT NULL CHECK (book_number BETWEEN 1 AND 66),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(CAST(name AS BLOB)) <= 512),
  UNIQUE(translation_id, book_number),
  UNIQUE(id, translation_id)
) STRICT;

CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  translation_id TEXT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL CHECK (chapter BETWEEN 1 AND 2147483647),
  verse INTEGER NOT NULL CHECK (verse BETWEEN 1 AND 2147483647),
  text TEXT NOT NULL CHECK (length(trim(text)) > 0 AND length(CAST(text AS BLOB)) <= 65536),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  FOREIGN KEY (book_id, translation_id) REFERENCES books(id, translation_id) ON DELETE CASCADE,
  UNIQUE(translation_id, book_id, chapter, verse)
) STRICT;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY NOT NULL DEFAULT ('workspace_' || lower(hex(randomblob(16)))),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  selected_translation_id TEXT NOT NULL REFERENCES translations(id),
  hide_cursor INTEGER NOT NULL DEFAULT 1 CHECK (hide_cursor IN (0, 1))
) STRICT;

CREATE TABLE application_settings (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  active_workspace_id TEXT NOT NULL REFERENCES workspaces(id)
) STRICT;
