# Lumina MVP specification

Status: agreed product baseline; feature-specific design remains.

This is the canonical contract for Lumina's MVP scope, behavior, and acceptance checks. Derive focused feature specifications from it. The implemented [architecture](../architecture.md) and accepted [ADRs](../adr/) constrain implementation. Requirement history belongs in the [specification changelog](mvp-changelog.md).

## Purpose and scope

Lumina is an open-source desktop Bible application for operators presenting Scripture during gatherings. Import, search, navigation, and projection work offline without an account. The interface is English; Bible search and reference entry support English and Tagalog, including supported localized book names and abbreviations.

Use Tauri for the desktop application and React for the interface. Verify each supported native configuration through the packaged application workflow.

The application ships with the publisher's World English Bible Protestant edition, covering the standard 66 books. Operators can import additional translations through the UI. Bible text remains in its original wording and punctuation for display, copy, export, and projection.

### Operator and maintainer outcomes

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

## Operator workspaces and audiences

One operator window contains tabs. Each tab represents an independent workspace associated with at most one local audience window. Audiences can show different verses, book information, translations, and appearances. The installed Bible library is shared; search state, current verse, book information mode, history, and appearance belong to each workspace.

Start with one workspace. Operators explicitly add more, with default names such as Audience 2 that they can rename. New workspaces have WEB selected, default appearance, empty search/history, no current verse, book information mode off, Hide cursor enabled, and a closed audience. Keep at least one workspace. Removing a tab requires confirmation, closes its audience, and deletes only that workspace's saved state.

There is no application-imposed workspace or audience count cap. Practical capacity depends on hardware and operating-system resources; publish actual tested counts separately. Provide usable tab overflow and report window-creation and operation failures in the affected workspace without deliberately disrupting existing outputs. Do not promise recovery from arbitrary OS-wide resource exhaustion.

Each tab shows its name and Live, Blank, or Closed status. Repeat the active workspace name beside its projection controls. Workspace names are not extra labels on projected Scripture. Switching tabs changes which workspace is controlled; it does not change any audience's output. Shortcuts and verse actions target the active workspace. Delayed searches and native responses remain associated with the workspace that initiated them.

### Opening, closing, and recovery

- Startup and restart open only the operator window. Restored audiences remain closed; each workspace retains its saved Hide cursor preference.
- Open Audience explicitly creates a blank window. Use the operating system's extended desktop, move it to the desired display, then enter fullscreen.
- Each audience window has optional always-on-top where the OS supports it. Control the active workspace's audience independently; other audiences keep their own settings.
- Search, private verse inspection, and current-verse navigation work while the audience is closed. They never open an audience automatically. Send Live requires an already-open audience.
- Opening or reopening an audience stays blank until Resume or a deliberate verse-display action. Resume shows book information when its mode is on, otherwise a retained current verse if one exists.
- Close Audience preserves its workspace, current verse, and book information mode during the running session. Closing the operator saves persistent workspace state and closes every audience.
- Detected display loss closes only affected outputs and preserves their workspaces. Unaffected audiences continue displaying. Recovered output opens blank using its workspace's Hide cursor preference.

## One current verse with an optional preview

Each workspace has one current verse, represented in the operator view and retained while book information is displayed instead. Quick reference and word-search results each offer two explicit choices: Send Live for immediate projection, or Check preview for private inspection before deciding. The same preview behavior applies to both sources. One Previous/Next pair navigates the current verse in its own translation and edition.

| Operator action | Effect |
| --- | --- |
| Choose Send Live for a search result | Display that result's original verse text in the operator view and already-open audience |
| Choose Check preview for a reference or search result | Inspect its verse text, reference, and translation privately; preserve the current verse, audience content, and blanking state |
| Choose Send Live from that preview | Display the exact inspected content in its originating workspace and already-open audience |
| Dismiss the preview | Discard the temporary inspection without changing displayed content |
| Turn book information on | Display its metadata while retaining the current verse; preserve Blank/Closed state |
| Turn book information off | Restore the retained verse, or blank output if none exists; preserve Blank/Closed state |
| Select a history entry | Display its captured wording and translation label directly |
| Choose Send Live for a valid quick reference | Resolve and display that verse directly |
| Use Previous/Next | Display the adjacent available verse in the current verse's translation/edition |
| Use Change translation for the current verse | Resolve the same reference in the chosen translation and replace the displayed wording directly |
| Type or submit a word search; change its mode, scope, or page | Update search state/results; preserve the current verse and audience content |
| Change the search/reference translation selector | Configure future lookups and clear obsolete results; preserve the current verse |
| Switch operator tabs | Change the controlled workspace; preserve audience outputs |

Resolve valid content before changing either surface. Invalid, unknown, ambiguous, or unloaded references receive inline feedback and leave the current verse, information mode, and audience unchanged. Ambiguous references require an explicit candidate choice.

A verse action counts as Projected only after the intended audience window confirms applying that exact action. Acceptance or dispatch alone does not confirm projection, and confirmation does not prove physical display visibility. Rejection before dispatch preserves the current verse, information mode, and audience content. Once delivery may have begun, missing confirmation is an unconfirmed outcome; the verse may already have appeared, so unchanged output cannot be promised.

Blank hides audience content while retaining the current verse and book information mode. Resume shows information when its mode is on, otherwise the retained verse if one exists. Successful Send Live, history recall, current-verse navigation, or displayed-translation changes turn information mode off, end blanking, and show the chosen verse. Check preview and information toggles preserve blanking. With output closed, history recall/navigation/translation changes can update only the operator view; Send Live reports closed output without changing current content. Show closed/blank output status and information mode beside the retained verse so the operator can tell what the audience sees.

Preview is optional and temporary. Capture the original verse text, reference, translation label, edition, and originating workspace on inspection. It does not replace the current verse, create history, or survive restart. Sending it live creates one normal projection/history event using the inspected wording and translation, even if the search selector has since changed. If its source edition has disappeared, identify the captured wording as a Saved copy. Sending requires the originating workspace to be active and its audience open; rejection before dispatch leaves existing output unchanged and retains the candidate for another attempt. Missing confirmation after delivery may have begun is unconfirmed rather than proof that the output stayed unchanged. Tab switches must never redirect a pending preview to a different audience; return to its workspace before sending. Removing its workspace discards it.

The presentation of these choices, keyboard activation, and the preview surface are UI-design decisions. No modal, panel, drawer, layout, or separate preview navigation is prescribed. Keep the behavior consistent between quick reference and search. There is no verse queue, persistent private/live preparation workflow, mandatory preview step, or second navigation pair. Appearance-settings Apply/Cancel remains a separate styling workflow.

## Finding verses

### Quick reference

Quick reference accepts references only, such as a book, chapter, and verse. It supports documented English/Tagalog names and aliases and shows the resolved identity. A valid, unambiguous reference can be sent live directly or checked privately first, with Send Live available after inspection. Both paths use the same resolution and validation rules. The action presentation and keyboard bindings remain UI-design choices. Quick reference does not accept word or phrase searches; word-search scope never limits reference lookup.

For example, `John`, `Jn`, and `Juan` identify the same book in the selected translation edition.

Navigation follows available rows in the selected translation edition, ordered by shared book ID, chapter, and verse. Preserve the edition's native chapter/verse numbers and skip absent coordinates. Reference ranges remain outside this iteration. A captured history verse has adjacent navigation only while its original translation edition is installed.

Change translation looks up the same numbered reference in the target edition. Matching numbers do not guarantee equivalent passage content across versification schemes. An absent reference shows inline unavailability and preserves displayed content; the app does not automatically relocate the passage or substitute another translation.

### Word-search presets

Search one selected installed translation and one Search at scope. Operators select a preset and enter ordinary text; no special query syntax is required. All words is the default.

| Preset | Matching rule |
| --- | --- |
| All words | Every complete entered word must occur in the same verse, in any order |
| Phrase | Complete words must occur consecutively in the entered order; quotes are unnecessary |
| Word starts | Every entered prefix must match a word in the same verse, in any order; type `lov` without an asterisk |
| Contains text | The complete entered string must match one literal contiguous substring, including inside words |

For example, `love God` in All words matches both complete words in either order; Phrase requires them consecutively in that order. Word starts `pananampalataya` matches `pananampalatayang`; Contains text `righteous` matches inside `unrighteous`. These are literal matching rules; stemming and semantic assistance remain deferred.

All modes ignore case and accents and treat straight/curly apostrophes equivalently: `Jose`/`José` and `ako'y`/`ako’y` match equivalently. Phrase matching uses normalized word boundaries rather than identical punctuation. Use consistent Unicode normalization and map match highlights back to original text. Search normalization never rewrites Scripture text. User input does not activate raw FTS operators, SQL wildcards, or regular expressions.

### Search at and results

| Scope | Included books |
| --- | --- |
| Entire Bible, the default | All available books in the selected translation |
| OT | Genesis–Malachi |
| NT | Matthew–Revelation |
| Specific book | The selected book |
| Books of Moses | Genesis–Deuteronomy |
| Gospels | Matthew–John |
| Epistles of Paul | Romans–Philemon |

Hebrews remains searchable through NT and its own book scope. All scopes operate on available imported verses.

Run searches on Enter or Search. Editing the query preserves the submitted results. Changing the search translation clears obsolete results but retains the typed query; another search is required. Ignore outdated responses and never show another workspace's results.

Results show original text, highlighted matches, reference, translation, total count, and an inline query/mode/translation/scope summary. Clearly label broader prefix/substring matches. Use numbered pages without a silent result cap. Best match is the default order; Bible order is available, with a New Testament result jump in that order. Each result supports Send Live and Check preview with the same behavior as quick reference; inspecting a result alone never projects it.

The recommended Best match priority is complete phrase occurrences, then closer occurrences of requested words, then lexical relevance, with ties in Bible order. Ranking retains all qualifying results; exact scoring and substring ranking require evaluation.

When there are no matches, offer deliberate mode/scope changes. Never silently relax or rewrite a query. Spelling correction and meaning-based search are outside this iteration.

## Bible imports and shared maintenance

Accept one documented SQLite format with `versions`, `books`, and `verses` tables. A file may contain one or several translations. The contract uses one supported book-ID convention for the standard 66-book set; database row IDs remain local to their file and are not cross-translation identities. Each edition retains its own positive-integer chapter/verse coordinates and original text. Conforming files need no manual book mapping.

The format's `versions` table contains translation titles/descriptions; `books` identifies each translation's book number/name; `verses` contains book/translation identity, chapter, verse, original text, and sort order. Define exact field, validation, and optional metadata contracts before implementing them.

Validate the file and show proposed contents before accepting it into managed storage. Check supported book IDs, field types, relationships, duplicate coordinates within each translation, and documented resource/storage limits. Reject invalid records without changing the supplied file or valid installed data. The same coordinate in different translations is valid. Lumina builds its own reference/search indexes; users do not need to supply FTS indexes.

WEB is starter content, not the validation authority for other translations' chapter/verse counts. Converters and the app importer must accept supported native coordinates even when absent from WEB, without dropping or renumbering source verses. Lookup, search, navigation, copy/export, and projection use each selected edition's stored coordinates. Suffixed identifiers such as `3a` and merged identifiers such as `3–4` are outside the current integer-coordinate contract and receive clear errors rather than silent conversion.

Partial Bibles are allowed. Show available books, chapters, and verses without inferring completeness from WEB counts. Missing references receive inline feedback at attempted use; no separate missing-reference report is required.

Give installed translations stable identity independent of title and changing text. Skip exact duplicate imports. A matching title alone never overwrites an entry: different data requires an explicit choice to Add a distinct translation or Replace the selected entry.

| Manage Bibles action | Availability and behavior |
| --- | --- |
| Add | Available while audiences are open; installs data into the shared library |
| Replace | Requires confirmation and every audience closed, including inactive tabs; review an updated SQLite import and update the same installed entry |
| Remove | Requires confirmation and every audience closed; removes the selected imported translation |
| Restore a removed entry | Explicitly reimport into its original installed entry; a separate import must not silently assume its identity |

The bundled WEB entry is protected from Replace/Remove. Other WEB editions can be added as separate imports.

Define exact duplicate comparison, atomic replacement/failure handling, and restoration mechanics with the feature design.

After Replace, affected selectors keep the same installed entry and future lookups use updated data. After Remove, affected search/reference selectors switch to WEB for future lookups. Both operations clear obsolete results while retaining typed queries, modes, and scopes.

Captured current verses and history retain their original wording and translation labels. Show an operator-only Saved copy label when the original edition is unavailable. Selecting that saved copy can still display/project it, but adjacent navigation requires the original edition. Library maintenance does not silently convert captured text to WEB or rewrite it from a replacement edition.

Captured book information similarly retains its metadata, attribution, and translation identity during the session and can be resumed as an identified Saved copy. Enabling a new information display requires available metadata from its source edition; maintenance never silently substitutes replacement or WEB metadata.

For example, a workspace holding a Tagalog John 3:16 keeps that captured wording after the imported Bible is replaced. A new search uses the replacement text. If the Bible is removed instead, future lookups default to WEB while the captured Tagalog verse remains recognizable. Other workspaces are affected only where they use the changed Bible.

## History, copy, and export

Each workspace has its own timestamped, newest-first verse history. Record selections/navigation, including repeats, original text, reference, translation label, edition, action, and whether the intended audience confirmed applying it. One verse action produces one record, rather than separate preview/projection records. Typing, submitting searches, paging, scrolling, and checking/dismissing verse previews do not create entries. Sending a preview live creates one normal event.

A Projected filter isolates verse actions the intended open audience confirmed applying. Resume or turning book information off records a projection event only when the audience confirms applying the restored verse to its visible content, without rewriting an earlier closed-output event. Unconfirmed actions are excluded from Projected. Inspecting/showing book information or resuming metadata creates no verse-history entry. Selecting history exits information mode and immediately displays the recorded verse wording in the operator view and open audience.

Copy includes text, reference, and translation. Export the visible history to CSV. Confirm before clearing history. History filtering, clearing, copying, and export stay scoped to the relevant workspace; original wording survives replacement/removal of its Bible.

## Appearance and operator interface

The operator needs access to the current verse, search/history, adjacent verses, one Previous/Next pair, quick reference, workspace tabs, book information and its display toggle, and clear audience status/content mode. Their arrangement, action presentation, and preview/book-information surfaces remain open; this specification does not prescribe a layout or container. Evaluate discoverability, workspace/output-state clarity, and readability through operator walkthroughs.

Customize verse-text font family, size, bold, italic, color, underline, and strikeout. Reference and translation-label styles/sizes remain fixed. Font defaults are shared within each workspace; changing one workspace never changes another audience.

Use editable character-count size bands: each range of verse lengths shares one font-size setting. Show the current verse length and active band. A manual size adjustment changes that workspace's shared band and persists. Keep a whole verse on one slide using sensible defaults and manual size reduction. Initial ranges, sizes, and rendering units require visual evaluation with representative verses and display sizes; per-verse overrides, automatic fitting, and pagination are deferred.

Backgrounds are per translation within each workspace, with a readable fallback. Accept JPEG, PNG, and BMP copied into managed storage. Fill/crop is the default; Fit shows the whole image. An appearance-settings sample supports Apply and Cancel: Apply changes that workspace's confirmed appearance; Cancel discards unconfirmed styling. Its styling sample is distinct from the optional quick-reference/search verse preview. Image decoding and resource limits remain feature engineering work. Follow the agreed [application theme](application-theme.md) for shared palette defaults beneath explicit workspace styling.

## Cursor visibility and shortcuts

Each workspace has an independent **Hide cursor** setting, enabled by default for new workspaces. With it on, the pointer image is hidden over that audience's content; with it off, the pointer is visible there. Movement across audience-window edges, clicks, and normal focus behavior remain available. Outside the audience area, the pointer stays visible.

Save the setting per workspace. Switching tabs, fullscreen, or applications preserves the choice. Closing/reopening an audience and restarting the app preserve it too. Changing one workspace never changes another audience's visibility setting.

The native window and rendered audience must agree on visibility. Native APIs may have focus-dependent visibility behavior; verify that the user-facing result remains scoped to the audience area. Check actual supported displays, including blank output, entering/leaving the audience, focus changes, and audiences using different choices. See [Tauri cursor visibility](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html#method.set_cursor_visible).

While the operator window is focused, F1 opens translation selection, F3 opens search, and F7 opens book information. Preview action bindings remain UI-design decisions.

## Book information projection

Book information contains name, author, writing date, and location from optional attributed import metadata. Opening/reading it is private and does not change audience output. A separate toggle per workspace displays the information in place of the verse while retaining the current verse. Turning it off restores that verse if no verse-changing action has intervened, or blank output if no verse exists. The operator can distinguish the retained verse from the metadata currently presented. The information surface and toggle placement remain UI-design decisions.

With a current verse, use its book, translation, and edition even if the search translation selector differs. Every workspace already has a selected translation; without a current verse, require an explicit book choice from that translation. No additional translation picker is needed. Capture the metadata, book identity/name, source attribution, translation label, and edition when enabling the display. Later search-selector changes and private inspection do not silently replace its content or background.

Project the book name, translation, available supplemental fields, and source attribution using that translation's confirmed workspace background, including its fallback and Fill/Fit behavior. Missing fields show Information unavailable privately and are omitted from audience output. If no supplemental field beyond name and attribution is available, disable the toggle with an explanation. Missing metadata never blocks Bible import or use. A curated bundled dataset is outside this iteration. Metadata typography and arrangement remain design work; verse size bands remain specific to verse text.

Previous/Next still operates on the retained verse in its original installed edition. Successful navigation, new Send Live, history recall, or changing the current verse's translation turns information mode off and shows the chosen verse with its own background. For example, John 3:16 → information on → Next projects John 3:17. Invalid/unavailable actions preserve information mode and output. Without a retained verse, adjacent navigation stays unavailable.

Toggling information preserves Blank/Closed states and never opens an audience. Resume displays the selected mode. Audience closure/reopening retains runtime mode and captured metadata, but reopened output starts blank. Tab switches preserve each workspace independently. Restart resets information mode off and discards captured metadata.

## What survives restart

| State | Restart behavior |
| --- | --- |
| Installed Bible library and managed assets | Retained |
| Workspace identity, name, order, and last active workspace | Restored |
| Each workspace's history, selected translation, confirmed appearance, and Hide cursor preference | Restored |
| Current verse, search results, temporary verse preview, book information mode/captured metadata, and audience output/visibility | Runtime state; information mode starts off after restart |
| Audience windows | Closed; only the operator opens |

Associate saved state with stable workspace identity, not tab number or name. Moving the twentieth workspace to the third position must retain its own state.

## Technical direction and release requirements

Build on the implemented [foundation](codebase-foundation.md) and [architecture](../architecture.md): React/Vite/TanStack Router provides the static frontend; Rust owns accepted application state and workflow decisions; one managed SQLite database holds durable application data. `lumina-core` owns domain rules, `lumina-app` owns use cases and public contracts, `lumina-persistence` owns SQLite operations, and `src-tauri` owns desktop integration. React uses the typed bridge and generated Rust contracts, including code-based public failures. Feature-specific commands, product schemas, and projection delivery/recovery policies remain feature design work.

Use app-owned lexical indexes. SQLite FTS5 is the recommended foundation for complete-word, phrase, and prefix matching, subject to shipped-build support. Evaluate normalized literal lookup and trigram indexing for Contains text, including short-query handling. Unstemmed Unicode matching is the shared English/Tagalog recommendation. Map highlights back to original text. Ranking weights, page size, and measured performance remain engineering work, not additional feature commitments.

Target Windows, macOS, and Linux. Qualification begins with Windows 10 22H2/11, macOS 13.3+, and updated Ubuntu 22.04/Debian 12, evaluating Linux display sessions separately. These are evaluation baselines, not verified compatibility. Publish support only for configurations that pass the full workflow, including cursor visibility.

Downloaded packages, plus any supplied offline dependency bundle, must install and launch without fetching required runtime or Bible assets on the documented baseline. Document prerequisites and include required offline runtimes where needed.

MIT is selected for application code; adding the license file remains release work. Bible text, metadata, and dependencies retain their own terms/notices. Before distribution, record the bundled WEB edition, source, acquisition date, artifact identity, and applicable notices. Application-level Bible encryption is outside scope.

Before publishing each supported build, run a 60-minute packaged-app offline rehearsal with English/Tagalog text and physical extended displays. Cover offline installation/first use, import, search, navigation, direct projection, long verses, restoration, and display recovery. Record hardware, OS/engine/session/architecture, tested counts/limits, cold/warm latency, memory, intended-verse retrieval within the first five results, task time, and false positives. Performance thresholds require measured baselines. Report observed runs, unverified configurations, and limitations separately from static checks.

## Work remaining before release

These tasks complete the design, implementation, and verification of the MVP.

| Area | Remaining work |
| --- | --- |
| Import and metadata contracts | Exact book-ID table, structural/resource validation independent of WEB bounds in both converter and app, optional metadata/provenance fields |
| Storage and persistence | Stable identities, duplicate comparison, atomic replacement/failure behavior, explicit restore, workspace and translation persistence |
| Search | Index availability, normalization/highlighting, literal substring strategy, ranking, paging, and measured retrieval performance |
| Appearance | Initial size profiles, rendering units, image decoding/limits, verse and metadata readability |
| UI review | Walk through first use, import, tabs, direct and preview-first reference/result selection, reversible book information, history recall, one navigation pair, translation changes, sizing, cursor controls, and recovery; assess discoverability, workspace/output-state clarity, and readability |
| Native audiences | Dynamic window ownership, display-loss isolation, independent cursor visibility, failure reporting, and measured capacity |
| Distribution | Offline packages/prerequisites, license and attribution notices, supported-configuration documentation, and release rehearsal |

## Testing decisions

Use the [TDD skill](../../.agents/skills/tdd/SKILL.md) where possible, at pre-agreed public interfaces. Tests verify observable behavior rather than implementation details. Prefer existing interfaces and agree the testing boundaries before implementation.

Cover Bible import, search/reference lookup, workspace state and persistence, projection/history, and appearance/book information through those interfaces. Existing bridge, router, welcome, Rust application, and SQLite initialization tests provide prior art. Follow the [verification guide](../verification.md) and [architecture testing conventions](../architecture.md#testing-and-debugging); [bridge tests](../../src/bridge/client.test.ts) and [persistence integration tests](../../crates/lumina-persistence/tests/initialization.rs) exercise existing public boundaries.

The table below supplies expected behavior for automated tests and packaged operator/audience checks. These are acceptance criteria, not completed verification results. Native windows, physical pointer movement, display behavior, and release qualification still need app checks. Where UI failures cannot reliably be induced, use fixture imports or an observable native boundary without unnecessary production seams.

### Acceptance checks

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
| Packaged build on a proposed supported setup; install offline and perform the 60-minute rehearsal | No required asset download; workflow/recovery observed and actual capacity/limitations recorded |

### Search evaluation

Use English/Tagalog search fixtures covering complete/reordered words, phrases, prefixes, literal substrings, accents, Unicode composition, straight/curly apostrophes, punctuation, and wildcard characters. Include the reference-alias and matching examples above, legitimate no-match cases, and typo/paraphrase negative cases for deferred assistance. Check membership, completeness, ordering, page access, NT jump, normalized matching, broader-match labels, and original-text highlighting. Never silently relax queries or accept stale results after translation changes. Verify reference lookup outside the word-search scope.

Collect representative operator queries with intended verses or independently judged relevant sets, including references, names, remembered words, exact phrases, and fragments. Compare All words with Phrase, Best match with Bible order, and prefix/substring matching against those expected results. Check import/index consistency and measure retrieval quality and performance on supported hardware; use the [release-rehearsal metrics](#technical-direction-and-release-requirements) when recording results.

### Native and packaged checks

Observe physical extended displays, fullscreen, cursor visibility with hiding enabled/disabled, app switching, and disconnection on every release configuration. Exercise operation/creation failures as available without claiming recovery from arbitrary OS exhaustion. Test representative workspace counts; twenty saved workspaces does not require twenty native audiences. Measure actual simultaneous output capacity separately.

Perform the [packaged offline release rehearsal](#technical-direction-and-release-requirements) before publishing each supported build.

## Outside this iteration

- Verse queue, persistent private/live preparation workflow, mandatory preview-before-projection, and separate preview/live navigation. Optional reference/search previews with Send Live are included.
- Dedicated personal reading mode, reference ranges, and simultaneous multi-slot content in one audience.
- Detached operator windows, remote/network/browser/mobile audience receivers, bulk presentation controls, linked navigation, and workspace cloning.
- Spelling/fuzzy correction, semantic search, book-name typo suggestions, Any word mode, mixed query expressions, cross-translation search, cross-verse phrases, and language-specific stemming.
- Automatic text fitting, projection pagination, per-verse sizes, independently formatted reference/translation labels, and a separate font Script selector.
- In-app monitor selection, book sets beyond the supported 66, manual remapping of alternative book-ID conventions, and a curated bundled book-information dataset.
- Suffixed/split verse identifiers, merged verse-range identifiers, and automatic passage-equivalence mapping across versification schemes. Native positive-integer chapter/verse differences are supported.
- Account/cloud requirements for core use and application-level Bible encryption.
- Pointer confinement, audience-area pointer exclusion, click blocking, and a standalone missing-reference report.

[Future enhancements](future-enhancements.md) lists deferred capabilities and reconsideration criteria.

## Supporting material

- [Specification changelog](mvp-changelog.md).
- [Architecture](../architecture.md), [implemented foundation](codebase-foundation.md), and [verification guide](../verification.md).
- [Domain glossary](../../GLOSSARY.md) and [architecture decisions](../adr/).
- Research: [search foundations](../research/bible-search-foundations.md), [desktop qualification](../research/desktop-release-targets.md), and [open-source release](../research/open-source-release.md).
