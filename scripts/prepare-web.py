#!/usr/bin/env python3
"""Prepare the pinned publisher engwebp USFM archive; no network or general importer."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import tempfile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1] / "crates/lumina-persistence/seed"
BOOKS = """GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH
EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP
HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI
TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV""".split()
HEADINGS = {"id", "ide", "h", "toc1", "toc2", "toc3", "mt1", "mt2", "mt3", "ms1", "cl", "d", "sp"}
PARAGRAPHS = {"p", "m", "mi", "pi1", "q1", "q2", "li1", "nb", "b"}
# These source labels contain only textual-variant notes, no edition verse text.
ANNOTATION_ONLY = {("LUK", 17, 36), ("ACT", 8, 37), ("ACT", 15, 34), ("ACT", 24, 7), ("ROM", 16, 25)}
SCHEMA = """
PRAGMA user_version = 1;
CREATE TABLE translations (
    id INTEGER PRIMARY KEY CHECK(id > 0), title TEXT NOT NULL, description TEXT NOT NULL,
    edition_label TEXT, source_name TEXT, source_url TEXT, rights_notice TEXT
) STRICT;
CREATE TABLE books (
    id INTEGER PRIMARY KEY CHECK(id > 0), translation_id INTEGER NOT NULL REFERENCES translations(id),
    book_number INTEGER NOT NULL CHECK(book_number BETWEEN 1 AND 66), name TEXT NOT NULL,
    UNIQUE(translation_id, book_number), UNIQUE(id, translation_id)
) STRICT;
CREATE TABLE verses (
    id INTEGER PRIMARY KEY CHECK(id > 0), translation_id INTEGER NOT NULL REFERENCES translations(id),
    book_id INTEGER NOT NULL, chapter INTEGER NOT NULL CHECK(chapter BETWEEN 1 AND 2147483647),
    verse INTEGER NOT NULL CHECK(verse BETWEEN 1 AND 2147483647), text TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    FOREIGN KEY(book_id, translation_id) REFERENCES books(id, translation_id),
    UNIQUE(translation_id, book_id, chapter, verse)
) STRICT;
"""


def text_value(value, limit):
    if not value.strip() or "\0" in value or len(value.encode("utf-8")) > limit:
        raise ValueError(f"Invalid required text (limit {limit} UTF-8 bytes)")
    return value


def coordinate(value):
    if not re.fullmatch(r"[0-9]+", value) or not 1 <= int(value) <= 2_147_483_647:
        raise ValueError(f"Unsupported native coordinate: {value!r}")
    return int(value)


def verse_text(value):
    # Notes/references and lexical attributes are annotation, not verse wording.
    value = re.sub(r"\\([fx]) .*?\\\1\*", "", value)
    value = re.sub(r"\\\+?w ([^|\\]*)\|[^\\]*\\\+?w\*", r"\1", value)
    value = re.sub(r"\\(?:wj|qs|k|bk)\*", "", value)
    value = re.sub(r"\\(?:wj|qs|k|bk) ", "", value)
    if "\\" in value:
        raise ValueError(f"Unrecognized USFM in verse: {value[:120]!r}")
    # USFM line padding is layout syntax. Interior characters remain untouched.
    return value.strip(" \t\r\n")


def read_book(source, identity):
    name = re.search(r"^\\h (.+)$", source, re.MULTILINE)
    if name is None:
        raise ValueError("Missing book name")
    chapter = None
    verse = None
    fragments = []
    rows = []

    def finish():
        if verse is not None:
            text = "\n".join(fragments).strip("\n")
            if not text and (identity, chapter, verse) in ANNOTATION_ONLY:
                return
            rows.append((chapter, verse, text_value(text, 65_536)))

    for line in source.splitlines():
        marker = re.match(r"^\\([a-z0-9]+)\b(?: (.*))?$", line)
        if marker and marker[1] in HEADINGS:
            continue
        if marker and marker[1] == "c":
            finish()
            verse = None
            fragments = []
            chapter = coordinate(marker[2].strip())
        elif marker and marker[1] == "v":
            finish()
            if chapter is None:
                raise ValueError("Verse before chapter")
            label, body = marker[2].split(" ", 1)
            verse = coordinate(label)
            fragments = [verse_text(body)]
        elif marker and marker[1] in PARAGRAPHS:
            if verse is not None:
                body = verse_text(marker[2] or "")
                if body or marker[1] == "b":
                    fragments.append(body)
        elif line.strip():
            raise ValueError(f"Unrecognized USFM line: {line[:120]!r}")
    finish()
    if not rows:
        raise ValueError("Book contains no verses")
    return text_value(name[1].strip(), 512), rows


def convert(destination, provenance):
    archive = ROOT / provenance["artifact_filename"]
    raw = archive.read_bytes()
    if len(raw) > 268_435_456 or hashlib.sha256(raw).hexdigest() != provenance["artifact_sha256"]:
        raise ValueError("Archive differs from the reviewed acquisition")
    with ZipFile(archive) as source, sqlite3.connect(destination) as database:
        # Check all signed-manifest member hashes; this does not verify the PGP signer.
        for digest, filename in re.findall(r"^([0-9a-f]{64})  (.+)$", source.read("signature.txt.asc").decode(), re.MULTILINE):
            if hashlib.sha256(source.read(filename)).hexdigest() != digest:
                raise ValueError(f"Publisher member checksum mismatch: {filename}")
        database.execute("PRAGMA foreign_keys = ON")
        database.executescript(SCHEMA)
        database.execute("INSERT INTO translations VALUES (1, ?, ?, ?, ?, ?, ?)", (
            "World English Bible", "Publisher Protestant edition, 66 books; original native coordinates.",
            provenance["edition_label"], provenance["source_name"], provenance["source_url"], provenance["rights_notice"],
        ))
        seen = set()
        count = 0
        for filename in sorted(source.namelist()):
            if not filename.endswith(".usfm"):
                continue
            content = source.read(filename).decode("utf-8-sig")
            identity = re.match(r"\\id (\S+)", content)[1]
            if identity in {"FRT", "GLO"}:
                continue
            if identity not in BOOKS or identity in seen:
                raise ValueError(f"Unsupported or duplicate book: {identity}")
            seen.add(identity)
            number = BOOKS.index(identity) + 1
            name, verses = read_book(content, identity)
            database.execute("INSERT INTO books VALUES (?, 1, ?, ?)", (number, number, name))
            for chapter, verse, text in verses:
                count += 1
                if count > 1_000_000:
                    raise ValueError("Verse resource ceiling exceeded")
                database.execute("INSERT INTO verses VALUES (?, 1, ?, ?, ?, ?, ?)",
                                 (count, number, chapter, verse, text, count - 1))
        if seen != set(BOOKS):
            raise ValueError("Pinned bundled WEB must contain its documented 66 books")
        database.commit()
        if database.execute("PRAGMA integrity_check").fetchone() != ("ok",):
            raise ValueError("Seed integrity failure")
    if destination.stat().st_size > 268_435_456:
        raise ValueError("Standalone SQLite resource ceiling exceeded")
    return count


def logical_content(path):
    with sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True) as database:
        return "\n".join(database.iterdump())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare schema and every stored value without rewriting")
    args = parser.parse_args()
    provenance = json.loads((ROOT / "provenance.json").read_text())
    target = ROOT / "engwebp.lumina.sqlite"
    with tempfile.TemporaryDirectory() as directory:
        generated = Path(directory) / target.name
        count = convert(generated, provenance)
        if args.check:
            if logical_content(target) != logical_content(generated):
                raise ValueError("Committed seed differs; run python3 scripts/prepare-web.py")
        else:
            # Publish only a complete validated standalone SQLite image.
            with tempfile.NamedTemporaryFile(dir=ROOT, suffix=".sqlite", delete=False) as staged:
                staging_path = Path(staged.name)
                staged.write(generated.read_bytes())
            try:
                staging_path.replace(target)
            finally:
                staging_path.unlink(missing_ok=True)
        print(f"engwebp: 66 books, {count} verses; SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
