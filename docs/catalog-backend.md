# Library, lookup and search backend

The catalog adds capability contracts to the existing `Application` and
`SqliteStorage`; it does not create another application engine. Read
[bible-interchange.md](specs/bible-interchange.md) for the format and
[reference-aliases.md](reference-aliases.md) for every documented name.

## Public operations

- `stage_import(path)` reads a bounded immutable temporary image, validates the
  standalone format and returns staging data. Desktop runs this outside the
  serialized application lock. `register_import(staged)` returns the private
  review token, source filename, title/description/provenance, coverage, metadata
  and warnings. Missing optional data produces no warning.
- `commit_import(token)` atomically allocates the next available filename label,
  creates new installed translation/edition identities, inserts original text,
  builds managed search data and increments the library revision. The accepted
  translation list is read inside that transaction. A failed publication keeps
  its review retryable. Canceling consumes only its review token.
- `delete_imported_translation(workspace, translation, confirmed)` rechecks every
  audience, protects bundled WEB and atomically removes only the selected entry.
  Affected durable selectors use WEB. Captures remain independent of live source
  rows. The final entry's deletion releases its managed filename label.
- `resolve_reference_input(request)` accepts the documented grammar and exact
  names from the selected edition. Ambiguous input returns all candidates and a
  choice token bound to exact input/workspace/edition. An old choice never sends.
  `resolve_verse(translation, edition?, coordinate)` resolves server-owned text for
  subsequent action/preview commands.
- `list_books`, `chapter_verses` and `adjacent_verse` use edition-native numbered
  coordinates. Source row IDs and `sort_order` never define navigation order.
- `search(request)` returns complete counts, deterministic pages, NT jump,
  workspace/edition/request/library correlation and original text. A supplied
  obsolete library revision is rejected. The caller discards obsolete request
  IDs after input, workspace or translation changes.

## Matching and highlights

Search uses canonical NFD normalization, Unicode lowercase/full non-Turkic case folding,
combining-mark removal, and straight/curly/modifier apostrophe equivalence.
Unicode full-fold mappings come from `unicode-casefold`; newer simple lowercase
mappings come from the pinned Rust toolchain. Original display/capture text is
never rewritten.

Words are maximal Unicode letter/number runs, retaining apostrophes only when
flanked by word characters. All words requires every term; duplicates do not
require separate occurrences. Phrase requires consecutive complete words and
retains repeated positions. Word starts requires each literal prefix to match a
word. Contains text keeps all punctuation, whitespace, edge spaces and line
breaks as a contiguous literal substring. Whitespace-only and normalized-empty
input is invalid; punctuation-only input remains valid for Contains text.
There is no SQL, Boolean, wildcard or regular-expression query language.

Highlight ranges are half-open original **UTF-8 byte** ranges, expanded to original
grapheme boundaries and merged when overlapping/adjacent. TypeScript must convert
them before indexing UTF-16 strings. Only the returned page's original highlights
are materialized. Best match currently ranks by matching occurrence count, then
book/chapter/verse; Bible order uses those coordinates directly. Neither order
caps the result set.

## Index strategy observation

Managed normalized data and the FTS5 lexical index are populated in the same
publication transaction. The prototype currently evaluates exact membership over
normalized rows; the FTS5 tokenizer does not define accepted matching semantics.
This includes a literal scan for one-/two-character substrings and special
characters. FTS5 is available for later candidate filtering with a final exact
matcher.

A count-only experiment used the actual bundled `rusqlite 0.40.2` engine against
31,098 WEB rows on arm64 macOS 27.0.1, debug build, 2026-10-26. It compared
`instr(normalized, query)` with FTS5 trigram `LIKE` for plain literal queries.
Values are the mean of twenty warm requests; they exclude application result
construction, ranking, highlights and IPC.

| Query | Matching rows, both paths | Normalized scan | Trigram |
| --- | ---: | ---: | ---: |
| righteous | 616 | 15.108 ms | 1.413 ms |
| love god | 3 | 14.937 ms | 0.935 ms |
| a | 30,954 | 5.281 ms | 8.596 ms |
| go | 7,137 | 13.531 ms | 10.475 ms |

Normalized-table construction took 1,955.9 ms and occupied 4,403,200 bytes in this
isolated experiment. The additional trigram index took 526.6 ms and 12,656,640
bytes. Longer plain queries benefit, while short input still needs a correct
fallback and literal special characters need deliberate compilation. The
prototype retains the normalized path. These observations do not qualify native
responsiveness, million-row capacity, release latency or physical display
behavior. Initial import/publication still needs running-app measurement.

## Automated evidence

`crates/lumina-persistence/tests/catalog.rs` exercises public application/storage
interfaces with real temporary SQLite sources and managed files:

- Complete paging, every scope and NT jump; all four modes, significant whitespace,
  literal punctuation, apostrophes, composed/decomposed text, full-fold expansion
  and original UTF-8/grapheme highlights.
- Every documented alias, exact ambiguity choices and stale-choice rejection;
  unknown/malformed names preserve selected content.
- Immutable review, repeated/multiple editions, unrelated source row IDs, original
  text, zero-coverage books and optional metadata without credit.
- Ordinary stored tables/primary IDs, types, relationships, duplicate/native
  coordinates and representative byte bounds; invalid optional values warn.
- Atomic index failure/retry, cancellation, protected WEB, confirmation,
  library-revision invalidation, independent deletion and concurrent filename
  allocation.

The existing bootstrap/library tests cover stable identities, migration/startup
rollback and original lookup; workflow integration adds source-bound captures,
audience gates and Saved copies. Automated correlation tests do not establish
actual receiver application or physical display visibility.
