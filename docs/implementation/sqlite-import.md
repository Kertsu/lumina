# Bible SQLite import contract v1

Lumina accepts standalone SQLite 3 files, `PRAGMA user_version = 1`, with the
following real tables. Views do not qualify. Additional columns/tables are
ignored. There is no compatibility guesswork or automatic book mapping.
Use SQLite TEXT values for identifiers; local IDs may differ in every file.
Use `NULL` for absent optional fields, rather than empty strings.

```sql
PRAGMA user_version = 1;
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  description TEXT,
  language TEXT
);
CREATE TABLE books (
  translation_id TEXT NOT NULL REFERENCES translations(id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT,       -- JSON array of localized names/abbreviations, or NULL
  information TEXT,   -- JSON object below, or NULL
  PRIMARY KEY (translation_id, number)
);
CREATE TABLE verses (
  translation_id TEXT NOT NULL REFERENCES translations(id),
  book_number INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (translation_id, book_number, chapter, verse),
  FOREIGN KEY (translation_id, book_number)
    REFERENCES books(translation_id, number)
);
```

`sort_order = book_number * 1000000 + chapter * 1000 + verse`. Every verse must
use that value, regardless of source insertion order. Lumina derives its own
reference lookup and frontend Unicode lexical index from canonical coordinates;
no supplied FTS index, normalized text, or execution/query syntax is trusted.
Original text is stored and displayed unchanged.

Book numbers are the standard Protestant 66-book order: Genesis=1, Exodus=2,
Leviticus=3, Numbers=4, Deuteronomy=5; Joshua=6 through Malachi=39; Matthew=40,
Mark=41, Luke=42, John=43, Acts=44; Romans=45 through Philemon=57; Hebrews=58,
James=59, 1 Peter=60, 2 Peter=61, 1 John=62, 2 John=63, 3 John=64, Jude=65,
Revelation=66. The full ordered names are in `public/bibles/web.json`. Local
book-row IDs, zero-based numbering, Catholic/deuterocanonical sets, and alternate
chapter/verse numbering are unsupported. Coordinates must fit the bundled WEBP
chapter/verse bounds. Gaps and incomplete coverage are accepted. Each listed
translation and each listed book must have at least one valid verse. Every verse
must belong to a listed translation/book. Duplicate translation IDs, book
numbers, or verse coordinates reject the entire file.

Book information example:

```json
{
  "author": "Import-supplied attribution",
  "date": "Import-supplied writing date",
  "location": "Import-supplied writing location",
  "source": "Dataset title, author/publisher, URL, and applicable data terms"
}
```

`source` is required whenever `information` exists. Other fields are optional;
unknown information keys or wrong JSON types fail validation. These are supplied
claims with visible attribution, not Lumina editorial assertions. The importer
must have appropriate rights to the text and metadata. No curated book
information ships with the starter Bible.

Input limits: 128 MiB file, 100 translations, 500,000 total verses; source ID
256 UTF-8 bytes, title 512, abbreviation/language 64, description 16,384; book
name/alias 256, at most 64 aliases per book; verse text 65,536; metadata field
2,048. Required strings cannot be whitespace-only or contain NUL. Optional
strings, if present, obey the same rule. Malformed SQLite/JSON, noninteger
coordinates, unsupported schema versions, inconsistent sort values, and
out-of-range coordinates fail review without changing installed data.

Close the source editor and checkpoint any WAL before import. A nonempty `-wal`
sidecar is rejected. Lumina opens an immutable read-only SQLite URI, never creates
source journal/SHM/index files, never executes supplied SQL, and compares source
bytes before/after validation. Review returns the canonical path and validated
translations, coverage, and edition hash. Acceptance requires a previous review
of that path with identical bytes; a changed source must be reviewed again.
A file picker accepts `.sqlite`, `.sqlite3`, or `.db` names; its extension does
not establish validity.

## Installed identity and transactions

A source translation ID identifies a row only within that import. Add allocates
an app-owned random UUID. The UUID survives Replace, Remove, and explicit
Restore. Titles are labels, never identity or automatic replacement keys.
An imported edition is SHA-256 of deterministic JSON containing title,
abbreviation, description, language, sorted canonical books/metadata/aliases,
and sorted canonical verse coordinates/original text. Source row IDs and SQLite
layout do not affect comparison. Alias order and metadata changes do affect it.
Identical installed content is skipped during Add, including when local source
IDs differ or when the same data matches the bundled starter. The starter keeps
its publisher artifact edition identity; duplicate comparison uses the common
canonical content digest. Different text sharing a title requires an explicit Add or Replace
choice in review; backend never silently chooses Replace.

Each source needs one Add, Replace, Restore, or Skip choice. Every non-skipped
source is accepted in one app-owned SQLite transaction; any error rolls the
whole acceptance back. Replace requires confirmation, an available imported
target UUID, and a closed audience window. Remove also requires confirmation
and a closed audience window. Native guards enforce this; opening an audience
uses the same maintenance mutex. Add remains available during presentation.
The embedded `bundled-web` entry is protected from Replace and Remove.

Remove retains a tombstone: UUID, last edition, label, and book metadata remain;
verse payload is removed and `available` becomes false. Queue entries still
resolve that UUID and become unavailable. Restore explicitly names that removed
UUID and requires confirmation; its new edition supplies current queue text.
Adding the same file as a separate translation never restores a tombstone.
Restore may run with the audience open because the removed entry cannot supply
live current text. An exact edition already available in another imported entry
must be skipped rather than assigned to a second target. History keeps its own
original wording/label and is not rewritten by maintenance.

The app-owned `lumina.sqlite3` lives in Tauri's OS application-data directory.
Installed payloads and workspace JSON are atomic SQLite records. Workspace limit
is 32 MiB. The browser prototype has a separate local persistence adapter; it
cannot import SQLite or claim native/offline package verification.

## Managed backgrounds

The native picker accepts decoded JPEG/PNG/BMP, at most 20 MiB, 8,192 pixels per
axis and 32 megapixels, with a 256 MiB decoder allocation limit. It copies the
original bytes into application-data `backgrounds/<sha256>.<extension>` and
returns an embedded data URL for runtime preview. Removing/changing the
original file does not affect the managed copy. Invalid formats, oversized
images, and decode failures return a visible error without applying an image.

Workspace persistence stores background images as content-addressed managed
asset references, rather than embedding their base64 bytes in the SQLite JSON
record. Runtime loading resolves those references to renderable image data.
Missing or changed managed files fall back to the translation's background
color without discarding queue/history preparation. The 32 MiB workspace limit
applies after replacing image bytes with references.
