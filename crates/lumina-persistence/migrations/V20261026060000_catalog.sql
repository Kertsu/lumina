CREATE TABLE imports (
  id TEXT PRIMARY KEY NOT NULL DEFAULT ('import_' || lower(hex(randomblob(16)))),
  filename TEXT NOT NULL UNIQUE
) STRICT;
ALTER TABLE translations ADD COLUMN import_id TEXT REFERENCES imports(id);
ALTER TABLE books ADD COLUMN author TEXT;
ALTER TABLE books ADD COLUMN writing_date TEXT;
ALTER TABLE books ADD COLUMN writing_location TEXT;
ALTER TABLE books ADD COLUMN metadata_attribution TEXT;
ALTER TABLE books ADD COLUMN metadata_source_url TEXT;
ALTER TABLE books ADD COLUMN metadata_rights_notice TEXT;
CREATE TABLE catalog_meta (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), revision INTEGER NOT NULL);
INSERT INTO catalog_meta VALUES (1, 0);
CREATE TABLE verse_search (
  verse_id INTEGER PRIMARY KEY REFERENCES verses(id) ON DELETE CASCADE,
  normalized TEXT NOT NULL
) STRICT;
CREATE VIRTUAL TABLE verse_fts USING fts5(normalized, content='verse_search', content_rowid='verse_id', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER verse_search_insert AFTER INSERT ON verse_search BEGIN
  INSERT INTO verse_fts(rowid, normalized) VALUES (new.verse_id, new.normalized);
END;
CREATE TRIGGER verse_search_delete AFTER DELETE ON verse_search BEGIN
  INSERT INTO verse_fts(verse_fts, rowid, normalized) VALUES ('delete', old.verse_id, old.normalized);
END;
