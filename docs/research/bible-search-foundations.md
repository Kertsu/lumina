# Bible search foundations

Research: 14 October 2026 (Asia/Manila). Sources establish engine capabilities;
recommendations below are proposals, not accepted product decisions. No app
implementation, execution, or tests performed.

Product scope update: the maintainer has deferred spelling assistance and meaning-based search beyond MVP. The corresponding findings below are retained for future evaluation; see [future enhancements](../specs/future-enhancements.md).

## Verified: lexical retrieval

FTS5 supports complete tokens, adjacent ordered token phrases, token prefixes,
Boolean combinations, and proximity. A phrase matches tokens, not verbatim
punctuation. Prefix syntax belongs outside quotes: `house* + of` forms a phrase;
`"house* of"` does not reliably express that prefix. Bound SQL parameters still
contain an FTS expression requiring deliberate quoting/parsing.
[Query syntax](https://www.sqlite.org/fts5.html#full_text_query_syntax).

BM25 ranks lexical matches; lower scores rank better. `highlight` marks matching
text; `snippet` selects context. Explicit ordering permits canonical Bible order.
FTS5 has no built-in edit-distance correction or semantic retrieval.
[Ranking and highlights](https://www.sqlite.org/fts5.html#auxiliary_functions).

Highlight output copies verse text with inserted markers; it is not HTML
sanitization. **Proposal:** render escaped text segments with separate highlight
elements, never raw imported text or a user-input regex.
[SQLite implementation](https://github.com/sqlite/sqlite/blob/master/ext/fts5/fts5_aux.c).

## Verified: English/Tagalog normalization

`unicode61` uses Unicode 6.1 case folding and punctuation boundaries. Straight
and curly apostrophes are normally separators, so `ako'y` and `ako’y` each become
`ako` and `y`; `akoy` remains different. Token boundaries are configurable.
Latin diacritics are removed by default: `0` preserves them; `2` also handles
multi-diacritic characters missed by default `1`. FTS5's implementation uses
these rules, shared with FTS3/4's Unicode tokenizer.
[Tokenizer documentation](https://www.sqlite.org/fts3.html#tokenizers),
[FTS5 source](https://github.com/sqlite/sqlite/blob/master/ext/fts5/fts5_tokenize.c).

Porter stems English, not Tagalog morphology. **Proposal:** use unstemmed Unicode
search for both languages; offer English stemming only after language-specific
evaluation. Keep original Scripture text; apply consistent NFC normalization to
search representations. NFC resolves canonical Unicode forms, not curly/straight
apostrophe equivalence.
[Porter algorithm](https://snowballstem.org/algorithms/porter/stemmer.html),
[Unicode normalization](https://www.unicode.org/reports/tr15/).

## Verified: literal substrings

`LIKE` treats `%` and `_` as wildcards; `ESCAPE` permits literal forms, including
the escape character. Its default case folding is ASCII-only. `instr(text, query)`
finds literal substrings without wildcard syntax; SQLite `lower` is also
ASCII-only. **Proposal:** define Unicode case/diacritic policy in one normalized
search representation and use literal matching against it.
[LIKE](https://www.sqlite.org/lang_expr.html#the_like_glob_regexp_match_and_extract_operators),
[instr/lower](https://www.sqlite.org/lang_corefunc.html).

Trigram FTS5 indexes substrings, but `MATCH` queries shorter than three Unicode
characters return nothing. `LIKE ... ESCAPE` cannot use its index optimization.
**Proposal:** keep a literal fallback for short queries; reject empty input;
measure whether an additional trigram index earns its storage cost.
[Trigram limits](https://www.sqlite.org/fts5.html#the_trigram_tokenizer).

## Verified options: corpus-based typo assistance

`fts5vocab` exposes indexed terms and occurrence counts.
[Vocabulary](https://www.sqlite.org/fts5.html#the_fts5vocab_virtual_table_module).
`spellfix1` supplies vocabulary corrections, edit distance, frequency weighting,
and language IDs. It is a separate extension absent from standard SQLite builds;
one query searches one language ID. Its configurable `editdist3` supports Unicode
and custom edit costs; this is not automatic Tagalog spelling knowledge.
[spellfix1](https://www.sqlite.org/spellfix1.html).

**Alternative proposal:** compare unknown query tokens against the selected
translation's corpus vocabulary with bounded Damerau-Levenshtein distance,
including adjacent transpositions. A Rust implementation can avoid SQLite
extension packaging. Choose true Damerau-Levenshtein versus restricted optimal
string alignment explicitly; they differ. Rank suggestions by distance, then
corpus frequency; constrain short-word edits; preserve Bible names. Show a
suggestion requiring selection, never silently replace a valid query. Candidate
limits, recall, and latency remain unmeasured.
[Rust distance definitions](https://docs.rs/strsim/latest/strsim/fn.damerau_levenshtein.html),
[restricted variant](https://docs.rs/strsim/latest/strsim/fn.osa_distance.html).

## Verified option: offline semantic retrieval

Embedding models retrieve by vector similarity. Multilingual E5 offers model
sizes trading inference efficiency against quality. Its small model card lists
English/Tagalog-related evaluation records and warns about weaker performance
in low-resource languages; those records do not establish Bible retrieval
quality. Query/passage prefixes matter; long inputs are truncated.
[E5 paper](https://arxiv.org/abs/2402.05672),
[author model card](https://huggingface.co/intfloat/multilingual-e5-small/blob/main/README.md).

Local model loading can disable downloads. **Inference:** offline retrieval is
feasible after provisioning model/runtime files, with extra model storage, query
inference, corpus embeddings, versioning, and index rebuild work.
[Local-loading API](https://sbert.net/docs/package_reference/sentence_transformer/model.html).

**Proposal:** evaluate semantic search separately with English, Tagalog, mixed
language, paraphrase, obscure-name, and false-positive queries. Judge relevant
verse recall and ranking, cold start, latency, memory, and installed size. Do not
present model similarity as certainty or automatically project a result. No
model, embedding granularity, quality threshold, or MVP inclusion is established.

## Recommended foundation and evidence boundary

### Import and cross-translation identity

Book identity needs a declared mapping; localized names and sequence numbers are not universal identifiers. For example, the supplied Android report uses 43 for John, while USFM's numbering uses 43 for Luke and 44 for John. USFM provides stable book codes such as GEN, JHN, and 1JN, separately from display names/order. [USFM book identifiers](https://docs.usfm.bible/usfm/latest/doc/books.html), [supplied report](/Users/kurtddanielbigtas/Downloads/Digital-Bible-Search-Report-2026-10-12.md).

A shared book key does not guarantee equivalent passage coordinates. USFM supports alternate chapter/verse numbering, including its Psalm 54:1 / alternate 53:3 example. Lumina's accepted Change translation workflow retains the same numbered reference; passage-equivalence mapping is a separate capability requiring declared versification or explicit maps. [Alternate chapters](https://docs.usfm.bible/usfm/latest/cv/ca.html), [alternate verses](https://docs.usfm.bible/usfm/latest/cv/va.html).

Q39 accepts one documented book-number convention in Lumina's import contract, with no manual mapping for conforming files. The exact number-to-book table and validation rules still need specification; this decision does not require an extra identity column in the supplied SQLite file.

### Search foundation

Start with an app-owned literal query contract over local FTS5, separate Bible
reference resolution, clear word/phrase/prefix/substring meanings, and explicit
translation/book scope. Compare relevance and canonical ordering with realistic
operator tasks. For future spelling/semantic work, keep assistance visible and retrieval separable.
Preserve source text and map transformed matches back to displayed text.

The supplied mobile REA report corroborates FTS4/LIKE behavior and demonstrates
wildcard/regex pitfalls. It is evidence about that Android artifact, not proof of
legacy desktop search or a contract Lumina must reproduce:
[supplied report](/Users/kurtddanielbigtas/Downloads/Digital-Bible-Search-Report-2026-10-12.md).
Actual English/Tagalog result quality, performance, platform FTS5 availability,
and implementation behavior remain unverified.
