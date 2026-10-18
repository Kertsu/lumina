# Search proposal

Historical comparison record. The [MVP plan](mvp.md) and [implementation specification](../../.scratch/lumina-mvp/spec.md) define current requirements. Changes are recorded in the [specification changelog](../../.scratch/lumina-mvp/spec-changelog.md).

Status: the four presets, multi-word matching rules, normalization, ordering, submission, and scope choices are accepted. Spelling assistance and meaning-based search are confirmed deferrals. No search implementation exists. The Android app supplies the behavior foundation; legacy desktop modes remain a comparison baseline.

## Goal

Help an operator find the intended verse quickly from a reference, remembered words, a phrase, or word fragments. Search runs locally over installed translations. Selection updates private preview; Send Live projects the original verse text.

This is a recommended starting design. Actual English/Tagalog retrieval quality and performance need evaluation with the maintainer's corpus and representative operator queries.

## Two search surfaces

### Quick reference

Keep the bottom input reference-only. Resolve supported localized names and aliases such as John, Jn, and Juan to a stable book identity in the selected translation. Show the resolved reference and translation before projection. Valid, unambiguous input projects on Enter, as already accepted.

The accepted import contract uses one documented book-number convention to establish book identity across translations. Files conforming to that convention require no manual book mapping; their database row IDs are not cross-translation identifiers.

For ambiguous supported names or aliases, offer explicit candidates; require selecting one before projection. Unrecognized or misspelled names receive validation feedback; spelling assistance is deferred. Preserve audience content when the reference is invalid or absent. This surface does not run word search.

For partial imports, handle a reference that is not loaded with inline feedback when the operator attempts to use it. No separate missing-reference report is required. Navigation follows available verses in canonical Bible order without renumbering them.

### Word search

Use one field in the Search panel, opened with F3. Submit with Enter or Search; submitting and changing filters never project a result automatically.

Provide explicit Bible-version (translation) and Search at controls. The first selects an installed translation; the second selects Entire Bible, OT, NT, a specific book, Books of Moses, Gospels, or Epistles of Paul. Choose one scope at a time; default to the selected translation and Entire Bible. Search at narrows word search; it does not restrict the reference-only bottom input. Both controls preserve the current audience content.

Accepted groups: OT is Genesis-Malachi; NT is Matthew-Revelation; Books of Moses is Genesis-Deuteronomy; Gospels is Matthew-John; Epistles of Paul is Romans-Philemon. Hebrews remains accessible through NT and specific-book scopes. Apply these filters to available imported verses.

Use one Search mode selector that builds the query internally from ordinary text. The operator selects a behavior instead of entering quotes, an asterisk, or a leading equals sign. Accepted presets:

| Search mode | Meaning | Operator enters | Android equivalent |
| --- | --- | --- | --- |
| All words, default | Every complete word occurs in the same verse; order can differ | `love God` | `love God` |
| Phrase | Complete words occur consecutively in the entered order | `love God` | `"love God"` |
| Word starts | Match words beginning with the entered fragment | `lov` | `lov*` |
| Contains text | Match the entered text anywhere in a verse, including inside words | `love` | `=love` |

These map to behaviors established in the [supplied Android REA report](/Users/kurtddanielbigtas/Downloads/Digital-Bible-Search-Report-2026-10-12.md), through packaged-code inspection and isolated query execution. They are a behavior foundation for Lumina's implementation. The Android app used FTS4/LIKE; this proposal recommends app-owned FTS5/literal lookup and deliberate normalization, so result parity is not established.

Phrase matching uses normalized word boundaries rather than identical punctuation or capitalization. Word starts can match `pananampalataya` against `pananampalatayang`; Contains text can match `righteous` inside `unrighteous`. These remain textual matches rather than morphology or semantic matching.

The accepted multi-word rules are: Word starts requires a prefix match for each entered word in the same verse, in any order; Contains text treats the entire entered string as one contiguous literal substring under the accepted normalization policy. Any word and mixed phrase/operator expressions were previously proposed but have not been selected for this set.

This supersedes the earlier proposal of All words/Phrase/Any word plus independent whole-word/prefix/word-parts options. UI placement and presentation remain design decisions. User text does not activate raw FTS operators, LIKE wildcards, or regex behavior.

## Spelling assistance

Deferred beyond MVP by the maintainer. Queries use the entered text under the chosen normalization and matching rules. This deferral covers typo suggestions and fuzzy spelling correction for both verse words and book names; supported reference aliases remain available. Record future evaluation in [future enhancements](future-enhancements.md).

## Results and refinement

- Default to the selected translation and Entire Bible; provide the accepted scope filters including specific-book filtering.
- Show reference, translation, original verse text, matched text, total count, and an inline query/scope summary. Keep numbered pagination without a silent result cap.
- Best match is the default order; Bible order is available. The recommended scoring approach prefers complete phrase occurrences, then closer occurrences of requested words, then lexical relevance, with ties in Bible order. Exact scoring and Contains text ranking require evaluation; keep all qualifying results.
- Keep the New Testament result jump in Bible-order results. Best-match results can be narrowed with the NT scope filter.
- Label broader matches clearly. Result selection previews privately; private Previous/Next provides surrounding verse context. Ctrl/Cmd+Enter or Send Live projects the selected original text.
- With zero matches, offer deliberate next steps using the available matching controls or a wider book scope. Each choice shows its effect on the query; do not silently relax matching.
- Keep each result bound to its original verse and translation. Clear obsolete results when the search translation changes, retain the typed query, and require another search. Ignore outdated asynchronous responses.

## Offline implementation recommendation

Use an app-owned SQLite database for Bible text and reference indexes, with FTS5 as the lexical search foundation. FTS5 supplies token, phrase, prefix, Boolean and proximity matching, BM25 ranking, and match highlighting. FTS5 support must be enabled in the shipped SQLite build on each release platform. [SQLite FTS5](https://www.sqlite.org/fts5.html).

Word search ignores capitalization and accents and treats straight/curly apostrophes equivalently, across the four modes. Use consistent canonical Unicode normalization. For example, Jose/José and ako'y/ako’y match under this policy. Preserve the imported text for display, copy, and projection; map highlighted spans back to that original text.

Use unstemmed Unicode search as the recommended shared English/Tagalog foundation; English Porter stemming should not be the shared default. Spelling-extension and model research is retained for future evaluation in the [research foundations](../research/bible-search-foundations.md). [Tokenizer limitations](https://www.sqlite.org/fts5.html#tokenizers).

Contains text needs a separate literal strategy. Evaluate a trigram index against normalized literal lookup; retain a path for short queries because trigram MATCH does not handle fewer than three characters. Preserve offsets back to original text when highlighting normalized matches. [Trigram constraints](https://www.sqlite.org/fts5.html#the_trigram_tokenizer).

Build queries from the selected preset and ordinary text. Bound parameters alone do not make raw FTS syntax literal. Escape engine syntax and literal substring wildcards, preserve the documented punctuation/normalization rules, and render escaped text with separate highlight segments. The Android report's unescaped LIKE wildcards and regex-based highlighting are defects to address in Lumina. See [research foundations](../research/bible-search-foundations.md) for sources and constraints.

Keep search retrieval, reference resolution, and audience projection separate. Reference and search indexes are derived data that Lumina can rebuild without requiring users to prepare them in an import file.

## Meaning-based search

Deferred beyond MVP by the maintainer. Reconsider concept/paraphrase retrieval after evaluating the text-search workflow with real operator queries. Model and hybrid-retrieval research remains in [research foundations](../research/bible-search-foundations.md); reconsideration criteria are recorded in [future enhancements](future-enhancements.md).

Phrase matching across verse boundaries, cross-translation search, and language-specific stemming remain evaluation candidates outside this proposed first slice.

## Implementation details to resolve

- Specify ranking weights and paging, then evaluate retrieval quality and performance with representative queries and the supported hardware. Book-group membership is settled above.

## Evaluation before fixing the design

Collect representative English and Tagalog operator queries with intended verses or judged relevant sets: references, reordered remembered words, exact phrases, names, partial words, apostrophes, accents, and legitimate no-match cases. Include misspellings as negative cases for the deferred assistance boundary.

Compare All words and Phrase behavior, Best match and Bible order, and partial-word matching. Record whether the intended verse appears among the first five results and how long an operator takes to find it. Check result completeness, false positives, highlighting, and import/index consistency. Record warm/cold latency and memory on the eventual supported hardware; performance targets need that hardware baseline.

Prospective checks are saved locally in the main checkout's manual-verification directory, following repository policy. No search quality or runtime behavior has been verified by this document.
