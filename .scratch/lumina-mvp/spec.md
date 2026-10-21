# Lumina implementation specification

Status: ready-for-agent

This document defines Lumina's MVP behavior and implementation requirements. The [MVP plan](../../docs/specs/mvp.md) presents the same scope as a product walkthrough. Requirement history is maintained in the [specification changelog](spec-changelog.md).

## Problem Statement

An operator needs to find and project English and Tagalog Bible verses during gatherings without relying on an account or network. Several local audiences may need different passages, translations, and appearances. Controlling one audience must not alter another, and shared Bible maintenance must preserve recognizable captured text.

## Solution

Use one Tauri/React operator window with independent workspace tabs and a shared installed Bible library. Each workspace can explicitly open one native audience window on the local extended desktop. Keep direct projection available; quick reference and search also offer optional private inspection with an explicit Send Live action. Searching or checking a preview alone does not change the current verse or audience.

Bundle a usable WEB Bible, support reviewed SQLite imports, and keep core operations local. Persist workspace identities, organization, history, selected translation, and confirmed appearance. Restart restores the operator with every audience closed and each workspace's saved cursor-visibility preference.

## User Stories

| Capability | Operator or maintainer outcome |
| --- | --- |
| Offline first use | Install and launch a downloaded build with a bundled Bible, without fetching required assets or creating an account |
| Local Bible library | Review/import translations with their own chapter/verse numbering, see available coverage, and manage duplicates, replacement, removal, and explicit restoration |
| Independent audiences | Add and rename workspace tabs, select unrelated content, and control each associated audience without a fixed count cap |
| Verse choices | Send a reference/search result live directly, or privately inspect the same content and explicitly Send Live; history, translation changes, and current-verse navigation retain direct behavior |
| Book information | Toggle attributed book metadata onto an audience using its translation's background, then restore the retained verse |
| Search | Choose a translation, one scope, and a named text-matching preset; inspect complete, highlighted, paged results without query syntax |
| History | Recall original wording, filter projected verses, copy identifiable text, and export or deliberately clear workspace-specific records |
| Appearance | Adjust verse formatting, character-count size bands, and translation backgrounds independently per workspace |
| Display control | Open blank output, place/fullscreen it, use Blank/Resume, and independently show/hide the cursor over each audience |
| Continuity | Retain saved workspace organization/settings/history and recover display failures without deliberately disrupting other outputs |
| Release quality | Publish support and capacity claims only with packaged offline, physical-display, and sustained-workflow evidence |

## Implementation Decisions

### Application foundation and ownership

Use Tauri for the desktop application and React for the interface. Organize responsibilities around local Bible storage/reference/search, operator workspaces, native audience/display controls, and persistence. Existing native commands can support storage/window operations; precise module and command contracts remain engineering work.

Use an English interface with English/Tagalog Bible search and supported localized book names/abbreviations. Import, search, navigation, and projection must work offline without an account.

One operator tab represents one workspace with at most one associated local audience window. Each workspace owns its search/reference translation selection, query, mode, scope, results/page, current verse, temporary verse-preview candidate, book information mode and captured metadata, output visibility, history, appearance, and Hide cursor preference. The installed Bible library is shared.

Switching tabs changes only the controlled context. Active-workspace actions and shortcuts cannot update another audience. Late search/native responses remain bound to their initiating workspace after tab switches. Workspace names identify controls and are not extra labels on Scripture slides.

### Workspace creation, removal, and capacity

Start with one workspace. Additional workspaces are explicit, have renameable Audience N names, and start with WEB, default appearance, empty search/history, no current verse, book information mode off, Hide cursor enabled, and a closed audience. Dedicated cloning is deferred; ordinary clipboard Copy remains available.

Close Audience preserves its workspace. Removing a tab requires confirmation, closes its audience, and deletes only that workspace's saved state/history. Keep at least one workspace. Other workspaces and the shared Bible library remain unchanged.

No application-imposed numeric cap applies to workspaces or audiences. Provide usable tab overflow; report additional-window creation/operation failures in the affected workspace without deliberately interrupting other outputs. Capacity depends on hardware, OS resources, retained state, and rendering. Do not promise recovery from arbitrary OS-wide resource exhaustion. Publish measured simultaneous-output counts separately.

### Audience lifecycle and current verse

Startup opens only the operator. Open Audience explicitly creates blank output for its workspace; use OS Extend, manual window placement, and fullscreen. Search, private inspection, and current-verse navigation remain available with output closed and never open an audience. Send Live requires an already-open audience; attempting it with output closed reports that condition and retains the candidate without changing current output.

Each workspace has one current verse and one Previous/Next pair. Book information mode temporarily replaces audience verse content while retaining that verse for navigation and restoration. Resolve valid content before updating either surface; rejection before dispatch preserves the current verse, information mode, and audience content. A verse action counts as Projected only after the intended audience confirms applying that exact action. Acceptance or dispatch alone does not confirm projection, and confirmation does not prove physical display visibility. Once delivery may have begun, missing confirmation is unconfirmed; content may already have appeared, so unchanged output cannot be promised.

| Action | Required behavior |
| --- | --- |
| Choose Send Live for a reference or search result | Resolve valid content and update the operator current verse and its open audience directly |
| Choose Check preview for a reference or search result | Inspect captured text/reference/translation without changing the current verse, audience, or blanking state |
| Choose Send Live from the preview | Project exactly the inspected content to its originating workspace's open audience |
| Dismiss the preview | Discard private inspection without display/history changes |
| Turn book information on | Retain the current verse and present its book metadata; preserve Blank/Closed state |
| Turn book information off | Restore the retained verse, or blank output if none exists; preserve Blank/Closed state |
| Select a history entry | Recall its captured wording in the operator current verse and open audience directly |
| Previous/Next | Display the next available verse in the current verse's translation/edition, ordered by book ID, chapter, and verse |
| Change translation for the current verse | Resolve the same reference in the chosen translation and immediately replace displayed wording |
| Edit/submit search, filter/page results, or change search translation | Update search configuration/results without replacing the current verse or audience content |
| Invalid, unknown, ambiguous, or unloaded reference | Show inline feedback; preserve both verse surfaces until an explicit valid selection |

Quick reference and search share one optional preview behavior. Capture text, reference, translation label, edition, and originating workspace when inspecting; Send Live must use exactly that content rather than silently resolving a later selector or edition. Show Saved copy if the captured edition becomes unavailable. Sending requires the originating workspace to be active and its audience open. Tab switches never retarget the candidate; return to its workspace before sending. Removing its workspace discards it. A send rejected before dispatch preserves current output and keeps the candidate available for retry. Missing confirmation after delivery may have begun is unconfirmed rather than proof that the output stayed unchanged.

Inspection is temporary, excluded from restart persistence, and creates no verse-history event until sent/displayed. Dismissal has no projection/history effect; a successful preview Send Live creates one normal event. The preview presentation, default activation, and keyboard bindings are UI-design work shared between both sources; no modal, panel, drawer, or extra navigation pair is required. There is no queue, persistent private/live preparation workflow, or mandatory inspection gate.

Blank hides output while retaining the current verse and book information mode. Resume displays captured book information when that mode is on, otherwise the retained verse if one exists. Successful Send Live, history recall, current-verse navigation, or displayed-translation changes turn book information mode off, end blanking, and show the chosen verse. Preview inspection and information toggles do not end blanking. Closed-output history recall/navigation/translation changes can update the operator only; Send Live reports closed output without changing current content. Opening/reopening remains blank until a deliberate verse-display action or Resume. Show output Closed/Blank status and book information mode beside the retained operator verse so the operator can identify the actual audience content.

Closing an audience preserves runtime workspace state. Closing the operator window saves the state defined in Persistence and closes all audience windows. Detected display loss closes only affected outputs; other audiences continue displaying. Recover to blank output using that workspace's Hide cursor preference. Verify native window/display mapping and failure isolation.

Each audience window supports optional always-on-top where the operating system supports it. Control it independently for the active workspace's associated audience; changing one audience's setting leaves other audiences unchanged.

### Quick reference and book identity

Keep quick reference reference-only, separate from word search. Support documented English/Tagalog names and aliases, show resolved identity, offer Send Live and Check preview, and require explicit candidate selection for ambiguity. Both actions use the same validation/resolution and shared preview behavior as word-search results; action presentation and keyboard bindings remain unspecified. Word-search scope never constrains reference lookup. Report missing verses inline at attempted use, without a standalone missing-reference report.

For example, `John`, `Jn`, and `Juan` resolve to the same book identity in the selected translation edition.

Use one declared book-ID convention for the standard 66 books; database row IDs remain local identities. Each translation edition retains its native positive-integer chapter/verse coordinates. Resolve references and navigate available rows within the selected edition, ordered by shared book ID, chapter, and verse; skip absent coordinates without renumbering them. Captured saved copies require their original installed edition for adjacent navigation. Single verses are supported; ranges are deferred.

Change translation looks up the same book ID, chapter, and verse in the target translation. Identical coordinates do not guarantee equivalent passage content across versification schemes. If that coordinate is absent, show inline unavailability and preserve the displayed verse; do not relocate the passage or substitute another translation. Automatic passage-equivalence mapping is outside scope.

### Word search

Search one installed translation and one Search at scope. Build engine queries internally from ordinary input; users do not enter required syntax. User text must not activate raw FTS operators, SQL wildcards, or regex behavior.

| Mode | Match semantics | Example |
| --- | --- | --- |
| All words, default | Each complete entered word occurs in the same verse, in any order | `love God` matches both words in either order |
| Phrase | Complete words occur consecutively in the entered order, using normalized word boundaries rather than identical punctuation | `love God` requires those consecutive words in that order; quotes are unnecessary |
| Word starts | Each entered prefix matches a word in the same verse, in any order | `lov` needs no asterisk; `pananampalataya` matches `pananampalatayang` |
| Contains text | The entire entered string matches one literal contiguous substring under the same normalization policy | `righteous` matches inside `unrighteous` |

These examples exercise literal word, phrase, prefix, and substring matching. Stemming and semantic assistance remain deferred.

Ignore case and accents and treat straight/curly apostrophes equivalently across all modes. For example, `Jose`/`José` and `ako'y`/`ako’y` match equivalently under these rules. Use consistent Unicode normalization while preserving imported Scripture text for display, copy, export, and projection. Map match highlights back to original text.

| Scope | Books |
| --- | --- |
| Entire Bible, default | All available books in the selected translation |
| OT | Genesis–Malachi |
| NT | Matthew–Revelation |
| Specific book | Selected book |
| Books of Moses | Genesis–Deuteronomy |
| Gospels | Matthew–John |
| Epistles of Paul | Romans–Philemon |

Hebrews remains in NT and its specific-book scope. Filters operate on available imported verses.

Submit only on Enter or Search. Editing queries preserves submitted results. Changing search translation clears obsolete results, retains typed text, and requires another search. Ignore outdated responses. Search submission, filters, paging, and preview inspection never project; choose direct Send Live or Send Live from preview for a search result.

Show original text, highlighted matches, reference/translation, total count, and an inline query/mode/translation/scope summary. Clearly label broader prefix/substring matches. Use numbered pages without a silent result cap. Best match is default, with Bible order and an NT result jump in Bible order. With no matches, offer deliberate mode/scope changes; never silently rewrite or relax a query.

For Best match, the recommended scoring priority is complete phrase occurrences, then closer occurrences of requested words, then lexical relevance, with ties in Bible order. Ranking reorders qualifying results while retaining the full matching set. Exact weights, page size, substring ranking, and performance require evaluation.

Use app-owned lexical indexes. FTS5 is the recommended word/phrase/prefix foundation, subject to shipped-build support. Evaluate normalized literal lookup and trigram indexing for Contains text, including short queries. Unstemmed Unicode matching is the shared English/Tagalog recommendation. Engine choices must preserve these matching semantics; evaluate retrieval quality on representative English/Tagalog queries.

### Import contract and shared Bible maintenance

Use app-managed SQLite storage: `versions` contains translation titles/descriptions; `books` identifies a translation's book number/name; `verses` contains book/translation identity, chapter, verse, original text, and sort order. Define exact validation and optional metadata contracts before implementing them. Conforming files use the declared book convention and need no manual mapping.

Accept one or several translations per import. Validate and show proposed contents before accepting managed copies. Preserve supplied files and valid installed data on failure. Reject unsupported book identities, malformed field types, invalid relationships, duplicate coordinates within one translation, and violations of documented resource limits. Chapter/verse values must be positive integers within documented storage limits; those limits are independent of any bundled translation. The same coordinate can occur in different translations.

Preserve each edition's source coordinates and text. WEB supplies starter content, not chapter/verse bounds for other translations. Different chapter counts, verse counts, or passage placement must not cause rejection solely because they differ from WEB. Converters and native import validation must follow this rule. Do not drop, relocate, or renumber source verses to fit another edition. Unsupported source identifiers such as `3a` or `3–4` require a clear error rather than silent coercion; representing them is outside the current contract.

Valid partial Bibles remain acceptable. Show available books/chapters/verses without inferring completeness from WEB counts. Lookup, search indexes/results, sorting, navigation, copy/export, and projection use the selected edition's stored coordinates. Reference/search indexes are regenerable app-owned data, not required import assets.

Installed translations have stable identity independent of title and changing text. Skip exact duplicates. Different data with a matching title requires an explicit Add or Replace choice; titles never trigger automatic overwrites.

| Operation | Rule |
| --- | --- |
| Add | Available during presentation; data becomes available across workspaces |
| Replace | Confirm and require every audience closed, including inactive tabs; review an updated SQLite import and update the same installed entry |
| Remove | Confirm and require every audience closed; remove only the selected imported entry |
| Restore | Explicitly target the removed entry; another import cannot silently inherit its identity |

Specify exact duplicate comparison, atomic replacement/failure handling, and restoration mechanics as engineering details. Protect bundled WEB from Replace/Remove; other WEB editions can be separately imported.

After replacement, retain the selected installed entry and use updated text for future lookups. After removal, switch affected search/reference selectors to WEB. Clear obsolete results, retain typed query/mode/scope, and require deliberate search again.

Current verses and history keep captured wording/translation labels. Captured book information also retains its original metadata, attribution, and translation identity during the session; maintenance does not silently replace it. Show Saved copy in operator UI when the original edition is unavailable. Saved verse text can still display/project/copy/export; adjacent navigation requires the original edition. Retained book information can still be resumed; enabling a new information display requires available source metadata. Maintenance alone never rewrites captured content into WEB or replacement wording. Selecting a new search result uses installed text. Reopened output remains blank until a deliberate verse-display action or Resume.

For example, replacing an imported Tagalog Bible keeps an already-captured John 3:16 recognizable while a new search uses the replacement edition. Removing it switches future lookups to WEB without converting the captured Tagalog wording. Unaffected workspaces remain unchanged.

### Verse history and export

Maintain timestamped, newest-first history per workspace, including repeats. Capture original text, reference, translation label, edition identity, action, and projection outcome. One selection/navigation action creates one record; do not duplicate it as separate preview/projection events. Typing, submitting searches, paging, scrolling, and checking/dismissing a verse preview create no history. Preview Send Live creates one normal display/projection event.

Projected filtering includes verse actions the intended open audience confirmed applying. Resume or turning book information off records a projection event only when that audience confirms applying the restored verse to its visible content, without rewriting earlier closed-output records. Unconfirmed actions are excluded from Projected. Opening/reading book information, enabling its display, and resuming metadata create no verse-history entries. Selecting history turns information mode off and immediately displays its captured verse text in the operator view and open audience.

Copy includes verse text, reference, and translation. CSV export uses visible history. Confirm clearing; filtering, clearing, copying, and export affect only the relevant workspace. Preserve original text across translation removal/replacement and require the original installed edition for adjacent navigation.

### Appearance and interface

Provide access to current verse, search/history, adjacent verses, one navigation pair, quick reference, operator tabs, book information and its display toggle, and the shared optional verse preview. Show each tab's name/Live/Blank/Closed status and identify the controlled workspace and active content mode. Layout, control placement, action presentation, and preview/book-information containers are not prescribed. Validate discoverability, workspace/output-state clarity, and readability through an operator walkthrough.

Verse-text controls include font family, size, bold/italic, color, underline, and strikeout. Reference and translation-label styles/sizes stay fixed. Font defaults and editable character-count size bands are workspace-scoped. Show current length and active band; a manual adjustment changes that band's size for all matching-length verses in that workspace and persists. Evaluate initial ranges, values, and units visually; validate defaults with representative verses and display sizes.

Keep one complete verse per slide, using sensible defaults and manual size reduction. Backgrounds are per translation within the workspace with a readable fallback. Accept managed JPEG/PNG/BMP copies; Fill/crop defaults and Fit shows the whole image. Styling has an appearance-settings sample with Apply/Cancel. Apply changes only that workspace's confirmed appearance; Cancel discards unconfirmed styling. This styling sample is distinct from the optional reference/search verse preview. Image decoding/limits remain engineering work.

### Cursor visibility and shortcuts

Each workspace has an independent **Hide cursor** setting, enabled by default for new workspaces. When enabled, the pointer image is hidden over that audience's content; when disabled, it is visible there. The pointer stays visible outside the audience area. Movement across window edges, clicks, and normal focus behavior remain available.

Save the preference per workspace. Tab switches, fullscreen, application switches, audience closure/reopening, and application restart preserve the chosen value. Changing or closing one audience does not change another workspace's preference. With an audience closed, its setting determines visibility when it next opens.

Coordinate native-window and rendered cursor settings so disabling hiding actually restores visibility. Verify the behavior on real supported displays, including entering/leaving the audience, blank output, focus/fullscreen changes, and multiple audiences with different settings. Native APIs may have focus-dependent visibility behavior; the user-facing result must remain scoped to the audience area. [Tauri cursor visibility](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html#method.set_cursor_visible).

While the operator window is focused, F1 opens translation selection, F3 opens search, and F7 opens book information. Opening or reading information alone does not change audience output.

### Book information projection

Use optional attributed import metadata for book name, author, writing date, and location. Each workspace has its own display toggle. Turning it on captures and displays the book information in place of the projected verse while retaining that verse. Turning it off restores the verse held before activation if no verse-changing action has intervened; if no verse exists, output is blank. The operator must be able to distinguish the retained verse from the information currently presented. No modal or other container is prescribed.

When a current verse exists, its book, translation, and edition identify the metadata source, even if the search/reference translation selector differs. Every workspace already has a selected translation. Without a current verse, require an explicit book choice from that selected translation before enabling information mode; no additional translation picker is required. Capture book identity/name, available metadata, attribution, translation label, and edition on activation. Later search-selector changes or private inspection must not silently change that information or its background.

Use the source translation's confirmed background in the originating workspace, with the same fallback and Fill/Fit behavior as its verses. Display the book name, translation, available supplemental fields, and source attribution. Missing fields show Information unavailable privately and are omitted from audience content. Require at least one supplemental field beyond the book name and attribution; otherwise disable the display toggle with an explanation. Missing metadata never blocks Bible import, verse selection, or projection. A curated bundled metadata dataset is outside scope. Metadata typography and arrangement remain UI-design work; verse-text size bands remain specific to verses.

Previous/Next remains available against the retained verse and its original installed edition. Successful navigation, new Send Live, history recall, or a current-verse translation change turns information mode off and displays the selected verse using its own translation background. For example, John 3:16 followed by information on and Next projects John 3:17. Invalid/unavailable verse actions preserve information mode and output. With no retained verse, adjacent navigation remains unavailable.

Information toggles preserve Blank and Closed output states and never open an audience. Resume shows the currently selected content mode. Closing/reopening an audience retains its runtime mode and captured information but reopens blank. Tab switches do not retarget it or affect another workspace. Restart resets information mode off and discards captured information.

### Persistence

Persist installed Bibles, managed assets, workspace identities/names/order, per-workspace history, selected translation, confirmed appearance, Hide cursor preference, and last active workspace. Use stable identity, not tab number or name: moving workspace 20 to position 3 retains its own data.

Current verse, search results, temporary verse preview, book information mode/captured metadata, and output visibility remain runtime state outside the restart-persistence promise. Restart restores saved workspaces with audiences closed, book information mode off, and saved cursor-visibility preferences retained.

### Distribution and remaining engineering work

Target Windows, macOS, and Linux. Begin qualification with Windows 10 22H2/11, macOS 13.3+, and updated Ubuntu 22.04/Debian 12; evaluate Linux display sessions separately. These are candidate baselines, not verified compatibility. Downloaded packages and any offline dependency bundle must install/launch without fetching required runtime or Bible assets. Document prerequisites and supply required offline runtimes where needed.

Bundle the publisher's WEB Protestant edition for the 66-book starter. Record exact edition, source, acquisition date, artifact identity, and applicable notices before distribution. MIT is selected for code; license-file changes remain separate release work. Keep code, Bible, metadata, and dependency terms distinguishable. No application-level Bible encryption.

Complete detailed import/metadata contracts, stable identity/migration and failure handling, ranking/paging, initial appearance values, UI walkthrough, native display/cursor qualification, and packaged offline verification within this scope. Use the [plan's remaining-work table](../../docs/specs/mvp.md#work-remaining-before-release) for the grouped handoff.

## Testing Decisions

Use the [TDD skill](../../.agents/skills/tdd/SKILL.md) where possible, at pre-agreed public interfaces. Tests verify observable behavior rather than implementation details. Prefer existing interfaces and agree the testing boundaries before implementation.

Cover Bible import, search/reference lookup, workspace state and persistence, projection/history, and appearance/book information through those interfaces. The branch has a Vitest/jsdom setup and React Testing Library dependencies, but no existing test files to use as prior art.

The table below supplies expected behavior for automated tests and packaged operator/audience checks. Native windows, physical pointer movement, display behavior, and release qualification still need app checks. Where UI failures cannot reliably be induced, use fixture imports or an observable native boundary without unnecessary production seams.

| Starting condition and action | Expected result |
| --- | --- |
| Open audience showing John 3:16; direct Send Live for reference/result, history recall, navigation, or displayed-translation change | Operator verse and intended audience change directly; preview is optional, no queue |
| Check preview from quick reference and search for the same verse; cancel, then inspect and Send Live | Both sources have identical behavior; inspection/cancel preserves current verse/output/blanking/history; sending projects inspected content with one event |
| Preview in A; change search translation, switch to B, remove A, or close A's audience | No silent wording change or cross-workspace send; removed workspace discards candidate; closed-output send gives feedback without opening an audience |
| Verse displayed; edit/submit search, change mode/scope/page/search translation, or switch tabs | Existing audience content stays unchanged; late results stay with initiating workspace |
| Verse displayed; try invalid, unknown, ambiguous, unloaded, or unavailable replacement references | Inline feedback, explicit ambiguity choice, unchanged verse surfaces until valid resolution |
| Audience closed; inspect a reference/result, attempt Send Live, then explicitly open output | Inspection works, send reports closed output without changing current content, explicit open starts blank until a deliberate display action |
| Verse update accepted or dispatched, but application is not confirmed | Outcome remains unconfirmed and excluded from Projected; do not assert that previous audience content remained unchanged |
| Intended audience confirms applying the exact verse action | Mark the matching action Projected, retaining one history record per action |
| Blank audience; navigate to an available verse | New verse appears directly and blanking ends |
| John 3:16 live with attributed book metadata; open information, turn display on, then off | Opening alone leaves output unchanged; on shows metadata with its translation background and retains John 3:16; off restores that verse and records its actual projection; no metadata history entry |
| Information on over John 3:16; use Previous/Next, Send Live, history recall, or current-verse translation change; also try invalid/unavailable actions | Valid actions exit information mode and show the chosen verse; Next yields John 3:17; pre-dispatch rejections preserve mode, verse, and output |
| Current verse in translation A, search selector B; activate information and later change search settings | Metadata/attribution/background remain bound to the verse's book and edition A |
| No current verse, selected translation with metadata; explicitly choose a book, toggle on, then off | Book information can be shown without a verse; navigation stays unavailable; off leaves blank output |
| Information has some missing fields, then no supplemental fields | Audience omits unavailable fields while operator explains them; no supplemental data disables the toggle; Bible use remains available |
| Audience blank or closed; toggle information, Resume, close/reopen, switch tabs, and restart | Toggles preserve Blank/Closed and never open output; Resume uses chosen mode; reopening retains runtime mode but starts blank; other workspaces unchanged; restart resets mode off |
| Captured information active, audiences closed; Replace/Remove its source, reopen, and Resume | Reopened output starts blank; captured metadata/attribution retained with operator Saved copy identification; no silent replacement or WEB substitution |
| Several audiences with different references/translations/history/appearance; operate or disconnect one | Only intended/affected workspace/output changes; other audiences continue |
| Two windowed audiences on a supported OS; enable always-on-top for A, overlap it with an ordinary window, then disable it | A stays above ordinary windows while enabled and returns to normal stacking when disabled; B's setting is unchanged |
| Empty/default workspace; rename, close audience, cancel/confirm tab removal, try removing last workspace | WEB/defaults on creation; closure retains state; removal confirmed and isolated; final workspace retained |
| Multiple workspaces including a representative 20-workspace case; reorder and restart | Stable identity restores matching names/history/settings and last active tab; every audience closed and saved Hide cursor preferences retained |
| New workspace, then open audience and move the pointer across it | Hide cursor defaults on; pointer hidden over content, visible outside it, free to cross edges and click |
| A hides its cursor, B shows it; toggle A, switch tabs/apps/fullscreen, close/reopen A, then restart | Only A changes; each saved preference survives; native and rendered visibility agree, including blank output |
| Fixture imports: one/many translations, differing row IDs, invalid book identities, partial data, duplicates/same titles | Review/validation and explicit choices work; source files/valid installed data survive failures; partial coverage visible |
| Import fixtures with Romans 16:24–27 in one translation and Romans 14:24–26 in another, with no Romans 16:25 in the latter | Both imports accepted without a WEB-bounds gate; source coordinates/text preserved through lookup, search, preview, projection, copy/export, and navigation from 16:24 to 16:25 in the first edition |
| Display Romans 16:25 from the first fixture; Change translation to the edition without that coordinate | Inline unavailability; current operator/audience content unchanged; no automatic relocation to 14:24 or WEB substitution |
| Import duplicate coordinates within one translation, nonpositive/noninteger coordinates, unsupported suffixed/range identifiers, or data exceeding documented limits | Clear validation failure with source/installed data preserved; the same coordinate in different translations remains valid |
| Add while presenting; attempt Replace/Remove with an inactive audience still open, then close all | Add shared across tabs; maintenance blocked until every output closes; bundled WEB protected |
| Captured imported current verse/history; Replace/Remove and explicitly restore same entry | Original wording/labels retained, new searches use installed text or WEB fallback, saved copies remain usable, adjacent navigation requires original edition |
| Repeated selections with open/closed output; Resume, filter, copy/export, cancel/confirm clearing | One entry per selection, correct Projected records and original text, visible-history CSV, workspace-scoped deliberate clearing |
| Appearance sample; Cancel then Apply font/band/background changes across short/long verses | Cancel preserves confirmed appearance; Apply affects only workspace; band sharing/fixed labels/Fill/Fit/managed files and persistence hold |

Use English/Tagalog search fixtures covering complete/reordered words, phrases, prefixes, literal substrings, accents, Unicode composition, straight/curly apostrophes, punctuation, and wildcard characters. Include the reference-alias and matching examples above, legitimate no-match cases, and typo/paraphrase negative cases for deferred assistance. Check membership, completeness, ordering, page access, NT jump, normalized matching, broader-match labels, and original-text highlighting. Never silently relax queries or accept stale results after translation changes. Verify reference lookup outside the word-search scope.

Collect representative operator queries with intended verses or independently judged relevant sets, including references, names, remembered words, exact phrases, and fragments. Compare All words with Phrase, Best match with Bible order, and prefix/substring matching against those expected results. Check import/index consistency and measure retrieval quality and performance on supported hardware; use the release-rehearsal metrics below when recording results.

Observe physical extended displays, fullscreen, cursor visibility with hiding enabled/disabled, app switching, and disconnection on every release configuration. Exercise operation/creation failures as available without claiming recovery from arbitrary OS exhaustion. Test representative workspace counts; twenty saved workspaces does not require twenty native audiences. Measure actual simultaneous output capacity separately.

Before publishing each supported build, run a 60-minute packaged-app offline rehearsal with English/Tagalog text and physical extended displays. Cover offline installation/first use, import, search, navigation, direct projection, long verses, restoration, and display recovery. Record hardware, OS/engine/session/architecture, tested counts/limits, cold/warm latency, memory, intended-verse retrieval within the first five results, task time, and false positives. Performance thresholds require measured baselines. Report observed runs, unverified configurations, and limitations separately from static checks.

## Out of Scope

- Verse queue, persistent private/live preparation workflow, mandatory preview-before-projection, and separate live/private navigation. Optional reference/search inspection with Send Live and appearance-settings Apply/Cancel remain included.
- Dedicated reading mode, reference ranges, and simultaneous multi-slot content within one audience. Independent multiple audiences are included.
- Detached operator windows; network/browser/mobile/remote receivers; bulk Blank/Resume/Send controls; linked navigation; workspace copy/clone controls. Clipboard Copy remains included.
- Spelling/fuzzy correction, semantic search, book-name typo suggestions, Any word mode, mixed query expressions, cross-translation search, cross-verse phrases, and language-specific stemming. Supported reference aliases remain included.
- Automatic text fitting, pagination, per-verse sizes, independent reference/translation-label formatting, and a separate font Script selector.
- In-app monitor picker, book sets beyond the supported 66, manual remapping of alternative book-ID conventions, and a curated bundled book-information dataset.
- Suffixed/split verse identifiers, merged verse-range identifiers, and automatic passage-equivalence mapping across versification schemes. Native positive-integer chapter/verse differences are supported.
- Cloud/account requirements for core use and application-level Bible encryption.
- Pointer confinement, audience-area pointer exclusion, click blocking, and standalone missing-reference reports.

## Further Notes

Keep this contract, the [MVP plan](../../docs/specs/mvp.md), and [domain glossary](../../GLOSSARY.md) consistent. Record requirement changes and rationale in the [specification changelog](spec-changelog.md). Deferred capabilities and reconsideration criteria belong in [future enhancements](../../docs/specs/future-enhancements.md).

- Architecture decisions: [offline core](../../docs/adr/0001-offline-core-workflow.md), [original history text](../../docs/adr/0002-preserve-original-history-text.md), [independent workspaces](../../docs/adr/0003-isolate-operator-workspaces.md), and [native verse coordinates](../../docs/adr/0004-preserve-native-verse-coordinates.md).
- Research: [search foundations](../../docs/research/bible-search-foundations.md), [desktop qualification](../../docs/research/desktop-release-targets.md), and [open-source release](../../docs/research/open-source-release.md).
- Technical sources: [supporting material](../../docs/specs/mvp.md#supporting-material).
