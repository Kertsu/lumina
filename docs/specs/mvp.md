# Lumina MVP plan

This plan defines Lumina's MVP workflow and scope. The [implementation specification](../../.scratch/lumina-mvp/spec.md) contains the detailed behavior rules and acceptance checks. Requirement history is maintained separately in the [specification changelog](../../.scratch/lumina-mvp/spec-changelog.md).

## Purpose and scope

Lumina is an open-source desktop Bible application for operators presenting Scripture during gatherings. Import, search, navigation, and projection work offline without an account. The interface is English; Bible search and reference entry support English and Tagalog, including supported localized book names and abbreviations.

Use Tauri for the desktop application and React for the interface. Verify each supported native configuration through the packaged application workflow.

The application ships with the publisher's World English Bible Protestant edition, covering the standard 66 books. Operators can import additional translations through the UI. Bible text remains in its original wording and punctuation for display, copy, export, and projection.

## Operator workspaces and audiences

One operator window contains tabs. Each tab represents an independent workspace associated with at most one local audience window. Audiences can show different verses, book information, translations, and appearances. The installed Bible library is shared; search state, current verse, book information mode, history, and appearance belong to each workspace.

Start with one workspace. Operators explicitly add more, with default names such as Audience 2 that they can rename. New workspaces have WEB selected, default appearance, empty search/history, no current verse, book information mode off, Hide cursor enabled, and a closed audience. Keep at least one workspace. Removing a tab requires confirmation, closes its audience, and deletes only that workspace's saved state.

There is no application-imposed workspace or audience count cap. Practical capacity depends on hardware and operating-system resources; publish actual tested counts separately. Provide usable tab overflow and report window-creation failures in the affected workspace without deliberately disrupting existing outputs.

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
| Choose Send Live for a search result | Display that result's original verse text in the operator view and open audience |
| Choose Check preview for a reference or search result | Inspect its verse text, reference, and translation privately; preserve the current verse, audience content, and blanking state |
| Choose Send Live from that preview | Display the exact inspected content in its originating workspace and open audience |
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

Preview is optional and temporary. It does not replace the current verse, create history, or survive restart. Sending it live creates one normal projection/history event using the inspected wording and translation, even if the search selector has since changed. If its source edition has disappeared, identify the captured wording as a Saved copy. Sending requires the originating workspace to be active and its audience open; rejection before dispatch leaves existing output unchanged and retains the candidate for another attempt. Missing confirmation after delivery may have begun is unconfirmed rather than proof that the output stayed unchanged. Tab switches must never redirect a pending preview to a different audience; return to its workspace before sending. Removing its workspace discards it.

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

All modes ignore case and accents and treat straight/curly apostrophes equivalently: `Jose`/`José` and `ako'y`/`ako’y` match equivalently. Phrase matching uses normalized word boundaries rather than identical punctuation. Search normalization never rewrites Scripture text. User input does not activate raw FTS operators, SQL wildcards, or regular expressions.

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

After Replace, affected selectors keep the same installed entry and future lookups use updated data. After Remove, affected search/reference selectors switch to WEB for future lookups. Both operations clear obsolete results while retaining typed queries, modes, and scopes.

Captured current verses and history retain their original wording and translation labels. Show an operator-only Saved copy label when the original edition is unavailable. Selecting that saved copy can still display/project it, but adjacent navigation requires the original edition. Library maintenance does not silently convert captured text to WEB or rewrite it from a replacement edition.

Captured book information similarly retains its metadata, attribution, and translation identity during the session and can be resumed as an identified Saved copy. Enabling a new information display requires available metadata from its source edition; maintenance never silently substitutes replacement or WEB metadata.

For example, a workspace holding a Tagalog John 3:16 keeps that captured wording after the imported Bible is replaced. A new search uses the replacement text. If the Bible is removed instead, future lookups default to WEB while the captured Tagalog verse remains recognizable. Other workspaces are affected only where they use the changed Bible.

## History, copy, and export

Each workspace has its own timestamped, newest-first verse history. Record selections/navigation, including repeats, original text, reference, translation label, edition, action, and whether the intended audience confirmed applying it. One verse action produces one record, rather than separate preview/projection records. Typing, submitting searches, paging, scrolling, and checking/dismissing verse previews do not create entries. Sending a preview live creates one normal event.

A Projected filter isolates verse actions the intended open audience confirmed applying. Resume or turning book information off records a projection event only when the audience confirms applying the restored verse to its visible content, without rewriting an earlier closed-output event. Unconfirmed actions are excluded from Projected. Inspecting/showing book information or resuming metadata creates no verse-history entry. Selecting history exits information mode and immediately displays the recorded verse wording in the operator view and open audience.

Copy includes text, reference, and translation. Export the visible history to CSV. Confirm before clearing history. History filtering, clearing, copying, and export stay scoped to the relevant workspace; original wording survives replacement/removal of its Bible.

## Appearance and operator interface

The operator needs access to the current verse, search/history, adjacent verses, one Previous/Next pair, quick reference, workspace tabs, book information and its display toggle, and clear audience status/content mode. Their arrangement, action presentation, and preview/book-information surfaces remain open; this plan does not prescribe a layout or container. Evaluate discoverability, workspace/output-state clarity, and readability through operator walkthroughs.

Customize verse-text font family, size, bold, italic, color, underline, and strikeout. Reference and translation-label styles/sizes remain fixed. Font defaults are shared within each workspace; changing one workspace never changes another audience.

Use editable character-count size bands: each range of verse lengths shares one font-size setting. Show the current verse length and active band. A manual size adjustment changes that workspace's shared band and persists. Keep a whole verse on one slide using sensible defaults and manual size reduction. Initial ranges and sizes require visual evaluation; per-verse overrides, automatic fitting, and pagination are deferred.

Backgrounds are per translation within each workspace, with a readable fallback. Accept JPEG, PNG, and BMP copied into managed storage. Fill/crop is the default; Fit shows the whole image. An appearance-settings sample supports Apply and Cancel: Apply changes that workspace's appearance; Cancel discards unconfirmed styling. Its styling sample is distinct from the optional quick-reference/search verse preview.

## Cursor visibility and shortcuts

Each workspace has an independent **Hide cursor** setting, enabled by default for new workspaces. With it on, the pointer image is hidden over that audience's content; with it off, the pointer is visible there. Movement across audience-window edges, clicks, and normal focus behavior remain available. Outside the audience area, the pointer stays visible.

Save the setting per workspace. Switching tabs, fullscreen, or applications preserves the choice. Closing/reopening an audience and restarting the app preserve it too. Changing one workspace never changes another audience's visibility setting.

The native window and rendered audience must agree on visibility. Verify both settings on actual supported displays, including blank output, entering/leaving the audience, focus changes, and audiences using different choices.

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

Keep local Bible storage/reference/search, workspace state, native audience controls, and persistence as clear responsibilities using the native bridge where needed.

Use app-owned lexical indexes. SQLite FTS5 is the recommended foundation for complete-word, phrase, and prefix matching, subject to shipped-build support. Evaluate normalized literal lookup and trigram indexing for Contains text, including short-query handling. Unstemmed Unicode matching is the shared English/Tagalog recommendation. Map highlights back to original text. Ranking weights, page size, and measured performance remain engineering work, not additional feature commitments.

Target Windows, macOS, and Linux. Qualification begins with Windows 10 22H2/11, macOS 13.3+, and updated Ubuntu 22.04/Debian 12, evaluating Linux display sessions separately. These are evaluation baselines, not verified compatibility. Publish support only for configurations that pass the full workflow, including cursor visibility.

Downloaded packages, plus any supplied offline dependency bundle, must install and launch without fetching required runtime or Bible assets on the documented baseline. Document prerequisites and include required offline runtimes where needed.

MIT is selected for application code; adding the license file remains release work. Bible text, metadata, and dependencies retain their own terms/notices. Before distribution, record the bundled WEB edition, source, acquisition date, artifact identity, and applicable notices. Application-level Bible encryption is outside scope.

Before publishing each supported build, run a 60-minute packaged-app offline rehearsal with English/Tagalog text and physical extended displays. Cover installation, search, direct projection, long verses, restoration, and display recovery. Record hardware, OS, engine, architecture, display session, tested audience counts, latency, memory, retrieval quality, and operator task time. Set performance targets from measured baselines.

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

### Acceptance checks

Follow the [implementation specification's testing decisions](../../.scratch/lumina-mvp/spec.md#testing-decisions). Use the cases below to guide tests at agreed public interfaces and packaged-app checks. Physical-display behavior and packaged release qualification still require checks on the supported configurations. These are acceptance criteria, not completed verification results.

| Starting condition and action | Expected visible result |
| --- | --- |
| Audience showing John 3:16; choose direct Send Live for a reference/result, recall history, navigate, or change displayed translation | Operator verse and that audience change together; direct projection does not require prior preview |
| John 3:16 live; Check preview for another reference/result, then dismiss or Send Live | Inspection/dismissal preserves current content and blanking; Send Live displays exactly the inspected text/reference/translation once |
| Preview in workspace A; switch tabs, change search translation, or remove A | Preview never targets B or silently changes wording; removing A discards its preview |
| Verse displayed; edit/submit a search, change filters/pages/search translation, or switch tabs | Current audience content remains unchanged |
| Verse displayed; submit an invalid, ambiguous, or unloaded reference, or request an unavailable translation reference | Inline feedback; both verse surfaces remain unchanged until a valid selection |
| Audience closed; Check preview, attempt Send Live, then explicitly open output | Preview works; sending reports closed output without opening it; explicit open stays blank until a deliberate display action |
| Verse update accepted or dispatched, but application is not confirmed | Outcome remains unconfirmed and excluded from Projected; do not assert that previous audience content remained unchanged |
| Intended audience confirms applying the exact verse action | Mark the matching action Projected, retaining one history record per action |
| Audience blank; navigate to another available verse | New verse appears directly and blanking ends |
| John 3:16 live with book metadata; inspect information, toggle on, then off | Inspection preserves output; on shows attributed metadata with its translation background; off restores John 3:16 and records actual verse projection; metadata creates no verse entry |
| Information on; navigate, Send Live, recall history, change current-verse translation, or try an invalid/unavailable action | Valid actions turn mode off and show chosen verse; Next from John 3:16 shows John 3:17; pre-dispatch rejections preserve existing mode/output |
| Current verse in A, search selector B; enable information and edit search settings | Information and background remain tied to the verse's book and edition A |
| No current verse; choose a book in the selected translation with metadata, toggle on, then off | Information can be presented without a verse; navigation unavailable; off returns blank |
| Partial metadata, then none; toggle while audience is blank/closed | Audience omits missing fields; no supplemental metadata disables toggle with explanation; toggles preserve Blank/Closed and never open output; Resume uses chosen mode |
| Information on in A; switch tabs, close/reopen, Replace/Remove its source with all audiences closed, then restart | Other workspaces unchanged; reopening starts blank with runtime mode retained; captured metadata can resume as Saved copy; restart resets mode off |
| Two audiences with different verses/appearance; operate one workspace or disconnect its display | Only the intended/affected workspace changes; the other audience continues |
| Two windowed audiences on a supported OS; enable always-on-top for A, overlap it with an ordinary window, then disable it | A stays above ordinary windows while enabled and returns to normal stacking when disabled; B's setting is unchanged |
| New audience; enable/disable Hide cursor and move across its edges | New workspaces default on; pointer visibility follows the setting over content and returns outside; movement/clicks remain available |
| A hides its cursor and B shows it; toggle A, switch apps/fullscreen, close/reopen, and restart | B is unchanged; each saved choice survives and works on blank output as well as Scripture |
| Multiple saved workspaces, including a representative 20-workspace case; reorder and restart | Stable identity restores correct history/settings, only operator opens, audiences closed, saved Hide cursor settings retained |
| Captured imported verse/history; Replace/Remove, including attempts with an inactive audience still open | Maintenance blocked until all audiences close; captured text retained; future lookups reflect replacement or WEB fallback; unavailable adjacent navigation blocked |
| Import editions with Romans 16:24–27 and Romans 14:24–26 respectively; search, inspect, project, copy/export, and navigate those rows | Both supported imports succeed with original coordinates/text preserved; the first edition navigates beyond 16:24 without a WEB-bounds gate |
| Display Romans 16:25, then change to an edition without that coordinate | Inline unavailability and unchanged current output; no automatic relocation to 14:24 or substitution |
| Import duplicate/nonpositive/noninteger coordinates, suffixed/range identifiers, or data exceeding declared limits | Clear failure with source/installed data preserved; identical coordinates across different translations are accepted |
| Appearance sample open; Cancel, then Apply a band/background change | Cancel preserves confirmed styling; Apply affects only that workspace; fonts/bands/backgrounds persist as specified |
| Packaged build on a proposed supported setup; install offline and perform the 60-minute rehearsal | No required asset download; workflow/recovery observed and actual capacity/limitations recorded |

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

- [Implementation specification](../../.scratch/lumina-mvp/spec.md) and [specification changelog](../../.scratch/lumina-mvp/spec-changelog.md).
- [Domain glossary](../../GLOSSARY.md) and [architecture decisions](../adr/).
- Research: [search foundations](../research/bible-search-foundations.md), [desktop qualification](../research/desktop-release-targets.md), and [open-source release](../research/open-source-release.md).
