# Bundled World English Bible

`engwebp_usfm.zip` is the exact acquired publisher archive. `provenance.json`
records its filename, URL, SHA-256, acquisition date, edition/source dates and
notices. `NOTICE.html` is copied verbatim from its `copr.htm`; the original
archive also retains the publisher's signed member-checksum manifest and keys.
Member hashes are checked during conversion. PGP signer authenticity has not
been verified. ZIP timestamps have no timezone and differ from the source date
printed in the publisher notice; both observations are recorded.

Bible text remains public domain under the publisher's notice and trademark
condition. Lumina code is separately [MIT licensed](../../../LICENSE).
No book-information dataset is bundled. Source/rights fields grant no new
permissions for other imported content.

## Reproduce offline

From the repository root, with Python 3 and its standard library:

```sh
python3 scripts/prepare-web.py
python3 scripts/prepare-web.py --check
```

The converter accepts only this pinned acquisition, never downloads anything,
and checks its artifact/member hashes. It produces a standalone version-1
[interchange file](../../../docs/specs/bible-interchange.md). `--check` compares
the schema and every stored value, without modifying the committed file.
SQLite file headers can differ by producing SQLite version; logical content
must remain identical. The initial generated image SHA-256 is
`316399e122e85fdbffeee2bdbd15c4f2e0296cef5b74f3bf0f4e0d3dd19f8940`.

## Source-format extraction

- Map the 66 explicit USFM book codes to the contract's canonical book numbers;
  neither ZIP filename numbering nor source row IDs establish book identity.
- Preserve the positive integer `\c`/`\v` coordinates. Keep Scripture Unicode
  code points, punctuation and interior spacing. Do not normalize case, accents
  or apostrophes. Keep continuation/poetry lines as newlines and stanza breaks
  inside verses. Remove USFM line padding at text-fragment boundaries.
- Remove Strong's attributes and inline style wrappers, retaining their text.
  Exclude footnotes/cross-references, unnumbered book/section/psalm headings,
  speaker labels, preface and glossary from verse text. No metadata is inferred.
- Five numbered source labels contain annotation only, with no edition verse
  text: Luke 17:36; Acts 8:37, 15:34, 24:7; Romans 16:25. They produce no verse
  row. The converter explicitly allows only these observed annotation-only
  labels. Romans 14:24–26 remain at their original coordinates. Empty Scripture,
  unknown markers, duplicate coordinates and unsupported numeric labels fail
  conversion; there is no automatic remapping.
- The result has 66 books and 31,098 verse rows. These are observations of this
  artifact, never bounds/completeness requirements for another edition. The
  converter validates core storage/relationship/resource rules independently
  of WEB chapter counts. A general importer/converter remains separate work.

Production embeds only the reviewed SQLite image and provenance/notice values
in the executable. Startup deserializes it read-only using bundled SQLite;
migrations, publication, default workspace and active selection share one
immediate transaction. Any failure rolls everything back. Relaunch uses the
persisted identities and installed data without reseeding or network access.
