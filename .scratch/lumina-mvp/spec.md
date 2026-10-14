# Lumina MVP: offline Bible selection and projection

Status: ready-for-agent

## Problem Statement

An operator needs to find and project Bible verses during a gathering without exposing preparation to the audience. The workflow must remain usable without an account or network connection, support English and Tagalog translations, and preserve the useful capabilities of the existing digital Bible application.

The existing application's reference and word-search surfaces provide a functional baseline, but its documentation does not establish its internal search algorithms. Lumina currently contains a desktop scaffold rather than an implemented Bible workflow. Operators need predictable matching, independent preparation and projection controls, straightforward local Bible imports, and reliable recovery when an audience display closes or disconnects.

## Solution

Build an open-source desktop application with one operator window and one audience window. Bundle a usable Bible, accept additional translations through a documented SQLite contract, and keep the core workflow local. Preserve direct reference projection while providing a separate word-search panel with ordinary-text presets, translation selection, and Search at scopes.

Keep private preview independent of audience content. Search results, verse queue entries, and verse history entries prepare content privately; Send Live projects it explicitly. Give live and private navigation separate controls. Retain original Scripture wording, protect preparation across display interruptions, and provide practical appearance controls without adding deferred search or presentation features.

## User Stories

1. As an operator, I want to install and launch a downloaded release without fetching runtime or Bible assets, so that offline first use works on a documented supported configuration.
2. As an operator, I want import, search, navigation, and projection to work without an account or network connection, so that a gathering does not depend on an external service.
3. As an operator, I want a bundled World English Bible Protestant edition, so that the application is useful before I import another translation.
4. As an operator, I want to import one or several translations from a supported SQLite file, so that I can use locally available Bible data.
5. As an operator, I want English and Tagalog Bible search through an English interface, so that I can operate the app with either language's Scripture text.
6. As an operator, I want supported localized book names and abbreviations, so that references resolve using familiar names.
7. As an operator, I want to review validated import contents before accepting them, so that I know which translations and coverage will be added.
8. As an operator, I want unsupported or inconsistent imports rejected without changing their source files, so that failed imports preserve my data.
9. As an operator, I want Lumina to create its own reference and search indexes, so that I do not need to prepare engine-specific indexes in an import file.
10. As an operator, I want partial Bibles accepted with visible coverage, so that an incomplete but valid translation remains useful.
11. As an operator, I want inline feedback when I try an unloaded reference, so that I understand the failure while audience content stays unchanged.
12. As an operator, I want exact duplicate imports skipped, so that repeated imports do not create redundant entries.
13. As an operator, I want an explicit Add or Replace choice for different data sharing an existing title, so that a title match never overwrites a translation automatically.
14. As an operator, I want Replace to require confirmation and a closed audience window, so that maintenance does not disrupt presentation.
15. As an operator, I want Add available while the audience window is open, so that I can install another translation during a gathering.
16. As an operator, I want Remove to require confirmation and a closed audience window, so that I deliberately remove an imported translation.
17. As an operator, I want the bundled WEB entry protected from Replace and Remove, so that a usable starter translation remains available.
18. As an operator, I want explicit reimport into a removed translation's entry, so that retained references can become available without silently substituting another Bible.
19. As an operator, I want startup to open only the operator window, so that relaunching does not unexpectedly display audience content.
20. As an operator, I want closing the operator window to save my workspace and close the audience window, so that the app exits consistently.
21. As an operator, I want Open Audience to create a blank audience window, so that I can place it before projecting Scripture.
22. As an operator, I want to move the audience window using the operating system's extended desktop and enter fullscreen, so that I can use an HDMI projector or second display.
23. As an operator, I want projection to require an already-open audience window, so that projection does not create a window unexpectedly.
24. As an operator, I want search, private preview, and queue preparation available while the audience window is closed, so that I can prepare before presenting.
25. As an operator, I want audience closure or display disconnection to preserve my preparation, so that I can recover to blank output and explicitly resume projection.
26. As an operator, I want a valid, unambiguous reference in the bottom bar to project on Enter, so that a known verse can go live immediately.
27. As an operator, I want ambiguous references to offer explicit candidates and invalid references to show feedback, so that the app preserves audience content until I choose valid content.
28. As an operator, I want the bottom bar limited to references, so that word and phrase search has a distinct surface.
29. As an operator, I want named search presets without required query syntax, so that I can select matching behavior and enter ordinary text.
30. As an operator, I want All words to require every complete word in the same verse, so that remembered words can match in any order.
31. As an operator, I want Phrase to match consecutive complete words in their entered order, so that I can find a remembered phrase without typing quotes.
32. As an operator, I want Word starts to require each entered prefix in the same verse, so that fragments such as lov match corresponding words without an asterisk.
33. As an operator, I want Contains text to match the complete entered string as a literal contiguous substring, so that I can find text inside words without engine syntax.
34. As an operator, I want search to ignore case and accents and treat straight and curly apostrophes equivalently, so that typographic differences do not prevent matching.
35. As an operator, I want display, copy, and projection to retain original wording and punctuation, so that search normalization never alters Scripture text.
36. As an operator, I want to select a translation and one Search at scope, so that I control the Bible and books searched.
37. As an operator, I want Entire Bible, OT, NT, specific-book, Books of Moses, Gospels, and Epistles of Paul scopes, so that I can narrow a remembered passage.
38. As an operator, I want Hebrews searchable through NT and its own book scope, so that excluding it from the Paul filter does not hide it.
39. As an operator, I want searches to run only on Enter or Search, so that editing a query preserves the currently submitted results.
40. As an operator, I want original verse text, highlighted matches, references, translations, counts, and an inline query/scope summary, so that I can assess each result.
41. As an operator, I want numbered result pages without a silent result cap, so that all qualifying verses remain reachable.
42. As an operator, I want Best match by default and an optional Bible order, so that I can choose relevance or canonical browsing.
43. As an operator, I want a New Testament result jump in Bible order, so that I can reach matching NT verses quickly.
44. As an operator, I want deliberate mode or scope changes when no matches appear, so that the app never silently relaxes my query.
45. As an operator, I want translation changes to clear obsolete results while retaining my typed query, so that delayed searches cannot display another Bible's results.
46. As an operator, I want selecting a search result to update private preview only, so that finding a verse does not interrupt audience content.
47. As an operator, I want Send Live or Ctrl/Cmd+Enter to project private preview explicitly, so that I choose when prepared content reaches the audience.
48. As an operator, I want private Previous/Next to use the preview's translation while preserving audience content, so that I can inspect surrounding verses privately.
49. As an operator, I want live Previous/Next to use the live verse's translation while preserving private preview, so that I can advance presentation without losing preparation.
50. As an operator, I want ordinary translation selection to affect search and preparation only, so that choosing another Bible does not change a live verse.
51. As an operator, I want Change translation beside the live reference to privately load that reference in another translation, so that Send Live deliberately replaces the audience wording.
52. As an operator, I want unavailable references in a chosen replacement translation to leave audience content unchanged, so that translation changes fail visibly and predictably.
53. As an operator, I want to add, remove, and reorder verse queue entries, so that I can prepare a sequence for a gathering.
54. As an operator, I want repeated queue entries that each retain their translation, so that revisiting a verse or using another Bible remains intentional.
55. As an operator, I want queued references to resolve updated text after translation replacement, so that the queue follows the installed edition.
56. As an operator, I want missing queued verses or removed translations marked Unavailable and blocked from projection, so that the queue never silently substitutes content.
57. As an operator, I want timestamped, newest-first verse history recording preview and projection actions, including repeats, so that I can recall passages used during a gathering.
58. As an operator, I want a Sent Live filter, so that I can isolate projection history from privately previewed verses.
59. As an operator, I want selecting a history entry to preview its recorded verse privately, so that recalling a passage does not immediately project it.
60. As an operator, I want saved copies to retain original wording and translation labels after replacement or removal, so that I can preview, copy, export, and explicitly re-project what was recorded.
61. As an operator, I want adjacent navigation from history available only when its original translation edition is installed, so that surrounding verses are never taken from a different edition.
62. As an operator, I want Copy to include text, reference, and translation and CSV export to use visible history, so that copied or exported content remains identifiable.
63. As an operator, I want confirmation before clearing history, so that I do not erase it accidentally.
64. As an operator, I want queue, history, selected translation, and appearance restored across restarts, so that preparation survives closing the app.
65. As an operator, I want verse-text family, size, bold, italic, color, underline, and strikeout controls, so that I can choose a readable presentation.
66. As an operator, I want fixed reference and translation-label styles and sizes, so that appearance controls remain manageable.
67. As an operator, I want to see a verse's character count and active size band, so that I understand which shared font-size setting applies.
68. As an operator, I want a manual size adjustment to update every verse in that global band and persist, so that one shared profile controls similar-length verses.
69. As an operator, I want a whole verse on one slide with sensible defaults and manual size reduction, so that long verses use the established presentation workflow.
70. As an operator, I want a background per translation with a readable fallback and global font defaults, so that translation appearance stays consistent.
71. As an operator, I want JPEG, PNG, and BMP backgrounds copied into managed storage with Fill/crop and Fit options, so that presentation does not depend on the original image remaining in place.
72. As an operator, I want private appearance preview with Apply and Cancel, so that unconfirmed changes leave the audience appearance unchanged.
73. As an operator, I want Blank and Resume, so that I can hide and restore the current audience content deliberately.
74. As an operator, I want the audience cursor hidden, so that the pointer does not distract the audience.
75. As an operator, I want manual cursor restriction that prevents hover over the audience window, so that I can avoid pointer distraction while using other applications normally.
76. As an operator, I want cursor restriction initially off and unaffected by entering fullscreen, so that activation is always my explicit choice.
77. As an operator, I want switching applications to preserve my chosen cursor-restriction state, so that the audience remains protected during other work.
78. As an operator, I want manual release and release on audience closure or display disconnection, so that the desktop remains usable after presentation ends or a display fails.
79. As an operator, I want optional operator always-on-top where the operating system supports it, so that presentation controls can remain accessible.
80. As an operator, I want F1 for translation selection, F3 for search, F7 for book information, and Ctrl/Cmd+Enter for Send Live while the operator window is focused, so that common actions have keyboard access.
81. As an operator, I want optional attributed book information from imports and Information unavailable when it is absent, so that missing metadata never blocks Bible use.
82. As an operator, I want a dominant live preview, right-side search/history panel, adjacent-verse strip, and bottom queue with clearly separate navigation targets, so that the interface follows the supplied inspiration and accepted workflow.
83. As a maintainer, I want support claims tied to verified Windows, macOS, and Linux configurations, so that published compatibility reflects actual workflow behavior.
84. As a maintainer, I want a 60-minute packaged-app offline rehearsal on each supported configuration with English/Tagalog text and physical extended displays, so that release qualification covers sustained presentation and recovery.
85. As a maintainer, I want the selected MIT application license and separate Bible, metadata, and dependency notices completed before distribution, so that reuse terms are explicit.
86. As a maintainer, I want deferred features recorded with reasons and reconsideration criteria, so that future work can revisit scope without losing this session's decisions.

## Implementation Decisions

- Keep the existing Tauri desktop and React interface foundation. The current app has a landing surface, a development playground, one configured native window, and a generic greeting command; it has no implemented Bible import, search, workspace, or audience-window behavior. The existing digital Bible app is a reference product, not functionality already present in Lumina.
- Group implementation around local Bible storage/reference/search, the operator workspace, audience output/native display controls, and persisted workspace/appearance. Use the existing native-command bridge where native storage or window operations are needed. Detailed command contracts and module boundaries remain engineering design work; no new dependency is selected merely by this spec.
- Respect the decisions to keep the core workflow local and account-free and to preserve original history text. Reference resolution and search retrieval must remain separate from audience projection.
- Use an app-managed SQLite import/storage workflow based on the supplied translation, book, and verse schema. Translations have titles and optional descriptions; books belong to translations and carry book numbers/names; verses carry book/translation identity, chapter, verse, original text, and sort order. Define the precise import contract and validation rules before implementation.
- Declare one supported book-number convention for the standard 66-book set. Local database row IDs are not cross-translation identities. Conforming imports require no manual mapping. Partial imports retain canonical coordinates; navigation follows available verses in Bible order and skips absent coordinates.
- Validate and review imports before accepting managed copies; leave supplied files unchanged. Reference and search indexes are derived app-owned data that can be regenerated. Reject unsupported book identities or inconsistent records; valid partial coverage remains acceptable.
- Give installed translations stable identity independent of title and changing text. Skip exact duplicates. Distinct data with a matching title requires an explicit Add or Replace decision. Replace/Remove require confirmation and a closed audience window; Add is allowed during presentation. The bundled WEB entry remains protected and available.
- Preserve queued translation/reference identities across replacement/removal. Updated imports supply current queue text; missing data becomes Unavailable and cannot be sent live. Restoration explicitly targets the original installed entry; a separate import never silently replaces its identity. Specify duplicate comparison, replacement failure handling, and restoration mechanics as implementation details.
- Preserve original verse text, translation label, edition identity, timestamp, and preview/projection action in verse history. Repeated actions create repeated entries; typing and scrolling do not. Saved copies remain usable after removal or replacement, with an operator-only Saved copy indication when appropriate. Adjacent navigation requires that original edition still be installed.
- Keep startup/restart limited to the operator window. Open Audience explicitly opens blank output; projection requires it to be open. Closing the operator saves queue, history, selected translation, and appearance and closes the audience. Audience closure/disconnection preserves operator preparation; reopened or recovered output starts blank until explicit projection.
- Keep quick reference in the bottom bar reference-only. Support documented English/Tagalog names and aliases, show resolved identity, project valid unambiguous input on Enter, and require explicit candidate selection for ambiguity. Invalid, unknown, or unloaded references receive inline feedback without changing audience content. No separate missing-reference report is required; the word-search scope does not constrain quick reference.
- Search one selected installed translation and one Search at scope, using All words by default. All words requires each complete word in one verse in any order; Phrase requires consecutive complete words in entered order; Word starts requires every prefix in one verse in any order; Contains text requires the entire normalized input as a literal contiguous substring. User text never activates raw FTS operators, SQL wildcards, or regex behavior.
- Normalize case, accents, and straight/curly apostrophes consistently across all four modes while preserving original Scripture text. Phrase matching uses normalized word boundaries rather than identical punctuation. Build engine queries internally and map highlight positions back to original text.
- Use app-owned lexical indexes; SQLite FTS5 is the recommended word/phrase/prefix foundation, subject to verifying support in shipped builds. Evaluate literal normalized lookup and a trigram index for Contains text, retaining short-query handling. Unstemmed Unicode matching is the recommended shared English/Tagalog basis. These engine recommendations do not change the accepted matching semantics or establish Android result parity.
- Define OT as Genesis-Malachi, NT as Matthew-Revelation, Books of Moses as Genesis-Deuteronomy, Gospels as Matthew-John, and Epistles of Paul as Romans-Philemon. Hebrews remains available in NT and specific-book scopes. Filters apply to available imported verses.
- Submit word searches only on Enter or Search. Query editing preserves submitted results. Translation changes clear obsolete results, retain typed text, and require another search; outdated asynchronous responses cannot refill the new translation's result view. Search, filter changes, result paging, and result selection do not project automatically.
- Show original text with highlighting, reference/translation, count, and inline query/translation/scope summary. Preserve numbered pagination and all qualifying results. Best match is the default; Bible order and an NT jump in that order are available. Phrase occurrence, proximity, lexical relevance, and Bible-order ties are ranking recommendations; weights, page size, and Contains text ranking require evaluation rather than invented quality guarantees.
- Keep live content and private preview independent. Search, queue, and history selection update private preview; Send Live or Ctrl/Cmd+Enter projects it. Each Previous/Next pair uses its own translation/edition and preserves the other target. Ordinary translation selection is preparatory; Change translation beside the live reference stages the same reference privately, then requires Send Live. Missing content leaves the audience unchanged.
- Provide verse-text family, size, bold/italic, color, underline, and strikeout. Reference and translation labels retain fixed application styles/sizes. Editable global character-count size bands show current length and active band; manual adjustment changes the shared band and persists. Evaluate initial band ranges, size values, and rendering units visually; do not treat legacy screenshots or demo values as shipped defaults.
- Keep one complete verse on one slide, using sensible defaults and manual size reduction. Fonts are global; backgrounds are per translation with a readable fallback. Accept managed copies of JPEG, PNG, and BMP, with Fill/crop default and Fit available. Appearance changes preview privately until Apply; Cancel discards them. Image decoding and limits require implementation design.
- Use OS extended-desktop placement followed by audience fullscreen. Provide Blank/Resume, hidden audience cursor, and optional operator always-on-top where supported. Cursor restriction prevents hover over the audience window while allowing normal use of other apps; it is a manual, initially-off toggle. Fullscreen and application switches preserve the chosen state. Manual release, audience closure, and display disconnection release it.
- Native cursor feasibility must satisfy the accepted behavior on every configuration claimed as supported. A browser demonstration or successful cursor-grab API return is insufficient. The inspected Tauri cursor-grab behavior does not establish the required cross-application audience exclusion; investigate platform integration without silently dropping the feature or claiming unsupported configurations.
- Retain F1, F3, F7, and operator-focused Ctrl/Cmd+Enter. F7 uses optional import-supplied book name, author, writing date, and location with source attribution; absent fields show Information unavailable and never block Bible use. Define the optional metadata/provenance contract before implementation.
- Closely follow the supplied inspiration: dominant live preview, right-side search/history, adjacent verses, bottom queue, and reference-only quick input. Live/private navigation must be clearly distinguishable; placement, size, prominence, cursor-toggle presentation, and final appearance remain UI-review decisions. Unreviewed prototype layouts are not accepted production designs.
- Target Windows, macOS, and Linux. Qualification starts with Windows 10 22H2/11, macOS 13.3+, and updated Ubuntu 22.04/Debian 12, evaluating Linux display sessions separately. These are candidates, not verified compatibility. Offline release packages plus any supplied dependency bundle must install and launch without fetching required runtime or Bible assets on the documented baseline.
- Bundle the publisher's WEB Protestant edition for the 66-book starter, preserving Scripture text and recording exact edition, source, acquisition date, and artifact identity before release. MIT remains the selected code license; adding its license file is separate release work. Keep application, Bible, metadata, and dependency terms distinguishable. Do not add application-level Bible encryption.

## Testing Decisions

- Follow the repository's manual-verification policy. This spec does not authorize new or modified automated test files. Existing non-test build, lint, formatting, and type checks may support implementation, but cannot prove runtime behavior.
- Use the packaged operator/audience workflow as the highest verification seam: perform operator actions and observe private preview, live preview, audience output, saved workspace, and actual pointer movement. This follows the already-agreed manual checks and release rehearsal. Prefer this seam over testing internal UI state, query strings, or particular module arrangements.
- Verify local Bible storage/reference/search, operator workspace/queue/history/appearance, native audience/display controls, and packaged offline installation through their public behavior. Where failures cannot be triggered reliably from the UI, use fixture import files or an observable native-command boundary rather than adding unnecessary production seams.
- Prior art is the session's local MVP-scope and search manual guides. The inspected app has testing tooling but no Bible-specific behavior suite or established Bible-service test seam to reuse. Those guides are prospective instructions, not successful app runs.
- Exercise successful, invalid, ambiguous, and unloaded references; confirm only explicit valid projection changes audience content. Test preparation with the audience closed, independent live/private navigation, translation staging, and quick reference outside the selected word-search scope.
- Use English/Tagalog fixtures for complete words, reordered words, phrases, prefixes, literal substrings, accents, Unicode composition, apostrophes, and punctuation/wildcards. Include misspellings and paraphrases as negative cases for deferred assistance. Check result membership, completeness, ordering, pages, NT jump, and highlighting against original text; confirm no silent query relaxation or stale response after translation changes.
- Verify one/many-translation imports, differing local row IDs, unsupported book numbers, partial coverage, exact duplicates, same-title alternatives, protected WEB, and Add during presentation. Check Replace/Remove confirmation and audience-closed requirements; failures must preserve valid installed data and supplied files.
- Verify updated and missing queue references, removed translations, explicit same-entry restoration, and retained history wording/labels. Saved copies must still preview/copy/export/re-project, while adjacent navigation is unavailable without the original edition. Confirm repeats, Sent Live filtering, visible-history CSV export, and clear confirmation.
- Check Apply/Cancel, global band effects across several verses, fixed labels, per-translation backgrounds, managed image copies, Fill/Fit, whole-verse readability, and persistence. Evaluate defaults with real short/long passages and real display sizes.
- On each release configuration, verify physical extended displays, fullscreen, hidden cursor, manual restriction activation/release, app switching, and disconnection. Observe pointer behavior directly. Reopening/recovering audience output must stay blank while preparation survives; relaunch must open only the operator.
- Before publishing a supported build, run the accepted 60-minute packaged-app offline rehearsal with English/Tagalog text and physical extended displays. Cover installation/first use, search, navigation, projection, long verses, restoration, and display recovery. Record reference hardware, OS/engine/session/architecture, warm/cold search latency, memory, intended-verse retrieval within the first five results, operator task time, and false positives. Performance targets need measured baselines; no numerical quality or latency threshold has been accepted.
- Keep manual verification guides local in the designated main/master checkout per repository policy. Report actual observed runs separately from static checks and document any configuration that could not be verified.

## Out of Scope

- Dedicated personal reading mode, multiple audience windows, simultaneous multi-slot presentation, and reference ranges.
- Spelling assistance, fuzzy spelling correction, meaning-based semantic search, and book-name typo suggestions; known reference aliases remain included.
- Any word mode, mixed query/operator expressions, cross-translation search, cross-verse phrase matching, and language-specific stemming in this first slice.
- Automatic font fitting, projection pagination, per-verse size overrides, independent reference/translation-label formatting, and the legacy Script selector.
- In-app monitor selection; MVP uses OS Extend, manual placement, and fullscreen.
- Bible book sets outside the standard 66 books and manual mapping of alternative numbering conventions.
- A curated bundled book-information dataset until a suitable redistributable source is established; optional attributed import metadata remains included.
- Account/cloud dependencies for the core workflow and application-level Bible encryption. Encryption was explicitly removed, not merely deferred.
- Automatic cursor-restriction activation or deactivation on application switching; the accepted manual toggle and closure/disconnection release behavior remain included.
- A standalone missing-reference report; missing verses receive inline feedback at attempted use.
- License-file changes in this documentation/spec work. The MIT choice remains recorded for later release work.
- Production implementation or promotion of an unreviewed demo as part of publishing this spec.

## Further Notes

- This is the synthesis of the first grilling session through October 14, 2026. The maintainer requested local Markdown tracking for this work; no GitHub issue or implementation tickets are created. Ready-for-agent records the requested triage state, not verified runtime readiness or final UI approval.
- Accepted feature scope is settled. UI/shared-understanding review, detailed import/metadata contracts, installed-translation identity mechanics, initial appearance values, engine/ranking choices, and native platform qualification remain explicit engineering or review work. Resolve them without silently widening scope or treating provisional prototypes as approved designs.
- The desktop PDF and Notion current-state page establish a functional comparison baseline, not fuzzy/semantic algorithm verification. The supplied Android REA report establishes word/phrase/prefix/substring behavior and informed the presets; its FTS4/LIKE implementation is not a requirement to reproduce its defects or reuse its packaged Bible data.
- Supporting session records: [MVP scope](../../docs/specs/mvp.md), [search design](../../docs/specs/search-proposal.md), [desktop feature coverage](../../docs/specs/desktop-feature-coverage.md), [finalization decisions](../../docs/specs/mvp-finalization.md), and [future enhancements with reconsideration criteria](../../docs/specs/future-enhancements.md).
- Domain decisions: [local, account-free core](../../docs/adr/0001-offline-core-workflow.md) and [original history text](../../docs/adr/0002-preserve-original-history-text.md). Use the [domain glossary](../../GLOSSARY.md) consistently.
- Feasibility evidence: [search foundations](../../docs/research/bible-search-foundations.md), [cursor restriction](../../docs/research/cursor-confinement.md), [desktop qualification](../../docs/research/desktop-release-targets.md), and [open-source release findings](../../docs/research/open-source-release.md). Evidence limits and prospective checks remain attached to their conclusions.
