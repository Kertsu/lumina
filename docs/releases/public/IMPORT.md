# Add a Bible translation to Lumina

Lumina already includes the World English Bible (WEB). You can use it offline
without importing anything. Follow this guide when you want another translation.

## What you need

A **Lumina-compatible SQLite Bible file**, ending in `.sqlite`, `.sqlite3`, or
`.db`. SQLite is a way of storing data in a single file. You do not need to install
a database app or open the file yourself.

The file must use **Lumina import format 1**. A database from another Bible app
may use a different layout, even if its filename ends in `.db`. PDF, Word, text,
CSV, and JSON files cannot be imported directly. Renaming a file does not convert
it. Ask the person providing the file for a Lumina-compatible export. If you
already have a SQLite Bible from another app, the optional conversion help below
explains how to adapt it.

Use Bible text you have permission to use and project. Keep the original file.
A file may contain only some books or chapters; missing passages will not become
available automatically. This beta supports the 66-book Protestant book order.

## Add the file

1. Open Lumina. Click the **Lumina icon** beside the workspace tabs, then choose
   **Bible library**.
2. In **Your Bible library**, click **Review a Bible import**.
3. Choose your SQLite Bible file from your computer.
4. Under **Ready to review**, check the filename, translation names, book and
   verse counts, and any warnings. A small count may mean the file contains only
   part of the Bible. Choosing the file has not added it to your library yet.
5. Click **Add translations** to accept it, or **Cancel** to leave your library
   unchanged.
6. Click **Done**. In the workspace, open **Find in** and select the imported
   translation. Look up several passages and compare their wording and verse
   numbers with your original source before presenting them.

Imported translations are available to every workspace and remain available
offline. Lumina copies the accepted content into its library; it does not change
your original file. Importing the same file again adds another copy rather than
replacing the earlier one. A file containing several translations adds them all
when you choose **Add translations**.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| Your PDF, text, or CSV file is not selectable | Convert it first. A different filename extension will not help. |
| The file ends in `.db` but Lumina rejects it | Ask for a Lumina import format 1 export. Other apps' database layouts are not interchangeable. |
| A message mentions a live WAL or journal | Ask the file's creator for a complete standalone export, with their database app closed. Do not delete companion files to force an import. |
| A warning says optional information was ignored | Read the warning. Optional credits or book information may be missing even when the Bible text can be imported. Check with the file's creator if that information matters to you. |
| A passage is missing after import | Check that you selected the intended translation and that your source includes that passage. Partial Bibles are allowed. |
| You added the wrong file or a duplicate | In **Bible library**, use the unwanted entry's remove button. Close every audience window first, then confirm **Remove translation**. The bundled WEB cannot be removed. |

If a file is rejected, Lumina leaves your installed translations unchanged.
For help, report the exact error, app version, and how the file was produced in
[a bug report](https://github.com/Kertsu/lumina-releases/issues/new/choose).
You do not need to attach a whole Bible or private files to a public issue.

## Optional: convert a database from another Bible app

For most people, the easiest route is to ask the file's creator for a compatible
export. Converting a database is an optional advanced step, not something you
need to do every time you import a translation.

An AI assistant can compare your database's **structure** with Lumina's format
and suggest a converter. Structure means the table names, column names, and how
records connect. The person who made your database can supply this as
`CREATE TABLE` statements, also called its schema. You can start by sharing that
layout instead of uploading the whole Bible or your personal app database.

1. Ask the database's creator for its table definitions and an explanation of
   how books and verses are identified. Do not use Lumina's own app database as
   an import file; it has a different purpose and can contain personal data.
2. Copy the prompt below into an AI assistant and paste the source structure
   where indicated. The assistant may need clarification or a few example rows;
   use made-up verse text when only the row layout is needed.
3. Have the proposed mapping checked. A database's row ID is not necessarily
   its Bible book number; mixing them up can put verses in the wrong book.
4. The assistant can produce a script that reads your original database locally
   and writes a separate compatible file. A schema alone contains no Bible text,
   so it cannot become a populated Bible file by itself. If you are not comfortable
   running a converter, ask the file's creator or someone familiar with databases
   to do that step and give you the finished `.sqlite` file.
5. Import the converted file using **Add the file** above. Check the counts and
   compare passages with your original, including accented characters and any
   unusual verse numbering, before presenting them.

Lumina does not connect to an AI service for imports. Conversion suggestions can
be wrong. Lumina validates the resulting file's structure; it cannot verify that
the Bible text or book mapping matches your original. Keep the original database
and verify the result rather than relying only on an AI assistant's assurance.

<details>
<summary>Copy this database-conversion prompt</summary>

Copy everything inside the following box, then replace the final placeholder
with your source database's structure. The technical instructions are for the
assistant; ordinary Lumina imports do not require SQL or programming.

````text
I have a Bible SQLite database from another app. I will provide its structure
(table definitions, relationships, and any explanation of book identifiers).
Help me convert the existing data into Lumina import format 1.

First compare the source structure with the target below. Explain the proposed
mapping in plain language. Ask about missing relationships, book identities,
translation boundaries, text encoding/markup, and verse numbering. Do not assume
an arbitrary book row ID equals a canonical Bible book number. If you need sample
rows, ask for only what distinguishes the mapping; made-up verse text is enough
when checking the row layout. A schema alone is not the complete Bible data.

Once the mapping is clear, provide a converter that runs locally using Python 3
and its built-in sqlite3 module, with clear instructions for someone helping me.
Open the original database read-only and write a new, separate output file.
Never modify the source or overwrite an existing output without explicit consent.
Use only the source data: do not fetch verses, generate them from memory,
paraphrase, translate, modernize spelling, or invent attribution or permissions.
Preserve the original wording, Unicode characters, chapter numbers, and verse
numbers. Stop and report ambiguity or unreadable data instead of guessing.

Create a real SQLite database named Bible.sqlite, not SQL text renamed to .sqlite.
Use this schema; id columns must be ordinary stored INTEGER PRIMARY KEY columns:

PRAGMA encoding = 'UTF-8';
PRAGMA journal_mode = DELETE;
PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;

CREATE TABLE translations (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_name TEXT,
  source_url TEXT,
  rights_notice TEXT
);
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  translation_id INTEGER NOT NULL REFERENCES translations(id),
  book_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (translation_id, book_number)
);
CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  translation_id INTEGER NOT NULL REFERENCES translations(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  UNIQUE (translation_id, book_id, chapter, verse)
);

Rules:
- Use positive integer IDs, unique within each table. Link each verse to a book
  belonging to the same translation. Use parameterized inserts for the text.
- Title and book name must be nonblank and at most 512 UTF-8 bytes each.
  Description must be text, at most 16,384 UTF-8 bytes; use '' if unavailable.
  Leave optional source/rights fields NULL when not supplied. If supplied,
  source_name is at most 512 UTF-8 bytes, source_url 4,096, rights_notice 65,536.
- Each translation must contain at least one verse. Partial Bibles are allowed.
  Do not fill gaps, add missing books, or drop or renumber verses to match WEB.
- Chapter and verse must be integers from 1 to 2,147,483,647. If the source uses
  labels such as 3a or 3-4, stop and explain that Lumina cannot represent those
  labels directly. Ask for a decision; never silently split, merge, or renumber.
- Preserve book names as supplied. Assign book_number by this fixed identity map,
  not by the position of a book in the supplied file:
  1 Genesis; 2 Exodus; 3 Leviticus; 4 Numbers; 5 Deuteronomy; 6 Joshua;
  7 Judges; 8 Ruth; 9 1 Samuel; 10 2 Samuel; 11 1 Kings; 12 2 Kings;
  13 1 Chronicles; 14 2 Chronicles; 15 Ezra; 16 Nehemiah; 17 Esther; 18 Job;
  19 Psalms; 20 Proverbs; 21 Ecclesiastes; 22 Song of Solomon; 23 Isaiah;
  24 Jeremiah; 25 Lamentations; 26 Ezekiel; 27 Daniel; 28 Hosea; 29 Joel;
  30 Amos; 31 Obadiah; 32 Jonah; 33 Micah; 34 Nahum; 35 Habakkuk;
  36 Zephaniah; 37 Haggai; 38 Zechariah; 39 Malachi; 40 Matthew; 41 Mark;
  42 Luke; 43 John; 44 Acts; 45 Romans; 46 1 Corinthians; 47 2 Corinthians;
  48 Galatians; 49 Ephesians; 50 Philippians; 51 Colossians;
  52 1 Thessalonians; 53 2 Thessalonians; 54 1 Timothy; 55 2 Timothy;
  56 Titus; 57 Philemon; 58 Hebrews; 59 James; 60 1 Peter; 61 2 Peter;
  62 1 John; 63 2 John; 64 3 John; 65 Jude; 66 Revelation.
  Ask me to clarify an unfamiliar book name. Report unsupported books;
  do not silently discard them or map them to another book.
- Store the original verse text as nonblank TEXT, at most 65,536 UTF-8 bytes.
  Do not add NUL characters. Use nonnegative integer sort_order values in the
  intended reading order. Flag duplicate verse coordinates for clarification.
- Keep the file at most 256 MiB, with at most 64 translations and 1,000,000 verses.
  If a limit prevents conversion, explain it rather than silently truncating.
- Commit all writes, close the database, and provide a standalone file without
  a required -wal or -journal companion file. Do not create an app installation.
- Make the converter run PRAGMA integrity_check and PRAGMA foreign_key_check
  on the output, and check stored types, IDs, relationships, duplicates, and limits.
  Compare source and output verse counts and wording. Abort on mismatches or
  unexplained omissions. Report titles, actual counts, and any uncertainty.
- Do not claim you ran a converter or verified the complete Bible from a schema
  alone. Explain what remains for me or my helper to run and check locally.

Here is my source database structure and what I know about its identifiers:
[PASTE SOURCE CREATE TABLE STATEMENTS AND EXPLANATIONS HERE]
````

</details>
