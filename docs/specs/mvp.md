# MVP

Feature choices below are accepted. UI review and final shared-understanding confirmation remain; application implementation has not begun.

## Accepted scope

- Open-source desktop application with the [MIT license](https://opensource.org/license/mit) selected for its code; adding the license file remains release work. Bible text and metadata retain their separate applicable terms.
- Windows, macOS, and Linux release targets; verify each platform before release.
- Qualification starts with Windows 10 22H2/11, macOS 13.3+, and updated Ubuntu 22.04/Debian 12. Evaluate Linux display sessions separately; publish support only for configurations passing the full accepted workflow, including cursor restriction. These are qualification baselines, not verified compatibility.
- One operator window controlling one audience window.
- Dedicated reading mode, multiple audience windows, and multi-slot presentation deferred.
- Bible import, search, navigation, and projection work offline without an account.
- Downloaded release packages, including any supplied offline dependency bundle, install and launch without fetching runtime or Bible assets on the documented supported OS baseline. Document OS prerequisites and include required offline runtimes where needed.
- One bundled, ready-to-use translation and UI import of additional translations.
- The publisher's World English Bible Protestant edition as the bundled starter translation; support the standard 66-book set in MVP. Other book sets are deferred.
- Keep the bundled WEB entry always available. User-facing Replace/Remove apply to imported translations; additional WEB editions can be imported separately.
- One documented SQLite import format based on the supplied verses/versions/books schema; Lumina validates imports and generates search indexes.
- The import contract defines one supported book-number convention identifying books across translations. Files following it require no manual book mapping; database row IDs remain local to the file.
- SQLite import supports one or several translations per file. Validate and show the proposed import before copying accepted data into Lumina-managed storage; preserve the supplied file.
- Manage Translations provides Add, Replace, and Remove. Replacement and removal require explicit confirmation and a closed audience window; Add remains available while presenting.
- Skip exact duplicate imports. Matching titles alone never trigger replacement; different data sharing a title requires explicitly adding a distinct translation or replacing the selected installed entry.
- Partial imports within the supported 66-book set are allowed. Show available coverage and preserve canonical numbering. Handle absent references inline when the operator attempts lookup/navigation/projection; preserve audience content. No separate missing-reference report is required.
- Guaranteed English and Tagalog Bible search, including localized book names and abbreviations.
- English interface.
- No application-level Bible encryption.
- An ordered verse queue for preparation. Selecting a queued verse updates the private preview; Send Live projects it.
- Queue entries can be added, removed, and reordered, including repeated verses. Each entry retains its translation.
- Queue entries retain their references across translation replacement/removal. Replacement resolves updated text; missing verses or removed translations become Unavailable and cannot be projected from the queue. Explicit reimport into that translation entry restores available references; never silently substitute another translation.
- Verse history recording previewed and projected verses, with a Sent Live filter for projection history.
- History is a timestamped, newest-first record of preview and projection actions, including repeat visits. Typing searches and scrolling results do not create entries.
- Selecting a history entry privately previews its recorded verse and translation. Export the visible history to CSV; clearing history requires confirmation.
- History preserves original verse wording and translation labels across replacement/removal. Saved copies can be previewed, copied, exported, and explicitly re-projected, labeled Saved copy in the operator UI when needed. Previous/Next requires the original Bible edition to remain installed.
- Copy includes verse text, reference, and translation.
- Restore the queue, history, selected translation, and appearance settings across restarts.
- Application startup opens only the operator window, including after a restart. Closing the operator window saves the persistent workspace and closes the audience window.
- An explicit Open Audience button opens the audience window blank for placement and fullscreen setup (Q44). Projection requires that window to be open; preparation remains available while it is closed.
- Font selection, text-size controls, and background images with a readable default.
- Customize verse-text family, size, bold/italic, color, underline, and strikeout; the reference and translation label use fixed application styles and sizes. Independent label-formatting controls and the separate legacy Script selector are deferred.
- Use sensible character-count size defaults with manual size reduction, keeping each verse on one audience slide. Auto-fit and projection pagination are deferred.
- Use editable global character-count size bands, showing current verse length and active band. Manual size changes update that shared band and persist across restarts. Per-verse size overrides are deferred; initial ranges and sizes require visual evaluation (Q48).
- Remember a background per translation, falling back to the readable default; font defaults are global.
- Backgrounds accept JPEG, PNG, and BMP, copied into managed storage. Fill/crop is the default, with Fit available to show the entire image.
- Preview appearance changes privately; Apply updates audience appearance and Cancel discards unconfirmed changes.
- Opening or reopening the audience window starts blank until an explicit projection action.
- Audience-window closure or projector disconnection preserves the queue, history, and private preview. Recover with blank audience output; resume through an explicit projection action.
- Use the operating system's extended desktop, manually move the audience window to the connected display, then enter fullscreen. An in-app monitor picker is deferred.
- Audience controls include Blank/Resume and a hidden cursor. Operator always-on-top is optional where supported by the operating system.
- Cursor restriction is included in MVP (Q42): prevent the pointer from hovering over the audience window while allowing normal use of other applications. Use a manual toggle, initially off; opening the audience or entering fullscreen does not enable it automatically (Q54). Switching applications preserves the chosen state; manual release is available, and audience closure or display disconnection releases it (revised Q45). UI placement and platform-specific support still need specification and verification.
- F1 opens the translation list, F3 opens search, F7 opens book information, and Ctrl/Cmd+Enter sends the private preview live while the operator window is focused.
- Preserve the existing desktop application's user-facing capabilities where feasible; identify omissions explicitly.
- Direct quick-reference entry projects on Enter when valid and unambiguous; invalid or ambiguous input preserves audience content.
- The bottom-bar input accepts verse references only; word and phrase search uses the separate Search panel.
- Word search exposes Bible-version selection and Search at scope controls. Changing them preserves audience content; the search scope does not restrict quick-reference lookup.
- Use the Android app's observed word, phrase, prefix, and substring behavior as the search foundation, with named presets that build queries internally from ordinary input; users need not enter query syntax.
- Search presets are All words, Phrase, Word starts, and Contains text, with All words as the default.
- With multiple words, Word starts requires every entered prefix in the same verse, in any order. Contains text matches the entire entered string as one contiguous literal substring under the accepted normalization policy.
- Word search ignores capitalization and accents and treats straight/curly apostrophes equivalently; display, copy, and projection preserve original text.
- Search runs on Enter or Search; editing the query does not refresh results on every keystroke.
- Search at provides one selected scope: Entire Bible (default), OT, NT, a specific book, Books of Moses, Gospels, or Epistles of Paul.
- Scope definitions: OT is Genesis-Malachi; NT is Matthew-Revelation; Books of Moses is Genesis-Deuteronomy; Gospels is Matthew-John; Epistles of Paul is Romans-Philemon. Hebrews remains available in NT and specific-book scopes.
- Best match is the default result order, with Bible order available.
- Spelling assistance, fuzzy spelling correction, and meaning-based semantic search are deferred beyond MVP, including book-name typo suggestions. Supported reference aliases remain in scope.
- Word-search result selection shows a private preview while preserving audience content; an explicit Send Live action or keyboard shortcut projects it.
- Search results retain highlighted matches, result count, an inline query/translation/scope summary, numbered pagination, and the New Testament result jump.
- Ordinary translation selection changes search/preparation without changing audience content.
- A Change translation action beside the live reference loads that same reference in the chosen translation into the private preview; Send Live replaces the audience content. An unavailable reference shows inline feedback and preserves audience content.
- Single-verse Previous/Next navigation; reference ranges deferred beyond MVP.
- Navigation follows available verses in Bible order, preserving imported canonical numbers and skipping absent coordinates. Saved history copies without their original installed edition have no adjacent navigation.
- Separate live and private-preview Previous/Next controls. Live navigation advances the audience verse in its translation while preserving the private preview; private navigation advances the preview in its translation while preserving audience content.
- Navigation controls must clearly identify their live or private-preview target. Their placement, size, and visual prominence remain UI/UX design decisions.
- F7 book information: name, author, date, and writing location from optional, source-attributed metadata supplied with Bible imports. Show Information unavailable for absent metadata; absence does not block Bible import or use. A curated bundled metadata dataset is deferred until an appropriate source is established.
- UI prototypes should closely follow the supplied inspiration: dominant live preview, right-side search/history panel, adjacent-verse strip, and bottom queue.
- Before publishing a supported build, run a 60-minute packaged-app offline rehearsal with English/Tagalog text and physical extended displays. Exercise search, navigation, projection, long-verse readability, workspace restoration, and display-disconnection recovery; record measured performance (Q52). Actual verification remains prospective.

## Desktop search parity

The supplied desktop PDF documents four modes: Single Word/Phrase - Exact, Single Word/Phrase - With Similar, Multiple Words/Phrase - Exact, and Multiple Words/Phrase - With Similar. These remain a comparison baseline; the accepted Android-inspired presets replace the legacy selectors. The explicit spelling/semantic deferrals take precedence over legacy search parity.

The PDF explicitly leaves the internal matching method unspecified. It does not establish typo tolerance, semantic matching, or equivalence to the separately inspected Android application.

## Implementation and UI review

The settled decision tree and remaining UI review are tracked in the [finalization interview](mvp-finalization.md). The items below are specification, feasibility, and verification work rather than unapproved feature choices.

- The actually verified OS/engine/architecture/display-session matrix and any platform-specific limitations; qualification candidates are accepted (Q51).
- Cursor-restriction control placement, shortcuts, and platform constraints documented in the [cursor research](../research/cursor-confinement.md); manual activation and revised Q45 release behavior are accepted.
- Detailed SQLite import contract, including the exact book-number table and validation rules; one supported numbering convention is accepted (Q39).
- Stable installed-translation identity, exact duplicate comparison, atomic replacement/failure handling, and restore mechanics implementing accepted lifecycle rules (Q56-Q62).
- Dependency notices and open-source release documentation, translation attribution, and import instructions; MIT is selected (Q53).
- Search ranking weights, paging, and implementation details; matching rules and group membership are accepted in the [search design](search-proposal.md).
- Initial size-band ranges/values, image decoding/limits, and remaining presentation details; shared range behavior (Q48) and JPEG/PNG/BMP with Fill/Fit (Q49) are accepted.
- The optional book-information import format and provenance fields; import-supplied metadata is accepted (Q50). Remaining parity details are listed in [desktop feature coverage](desktop-feature-coverage.md).
- Remaining recovery details and measured release results; audience recovery to blank (Q40) and the offline rehearsal criterion (Q52) are accepted.
- UI walkthrough against the accepted workflow and supplied inspiration, including the size controls and manual cursor toggle.

## Deferred scope

Maintain decisions, reasons, and reconsideration criteria in [future enhancements](future-enhancements.md). Pending decisions remain distinct from confirmed deferrals.

## References

- [Original application state](https://app.notion.com/p/Current-Application-State-365cf9bacf44808bac50eea7890a71b5)
- [Original Lumina draft](https://app.notion.com/p/Lumina-draft-365cf9bacf4480519cd9d635d421f0f0)
- [UI inspiration](https://app.notion.com/p/Design-Specification-MVP-draft-365cf9bacf4480c6b72de384e0c05740)
- [Mobile search report and evidence](https://drive.google.com/drive/folders/1tjGGZiPq3BiF6ifTOvMaOZ-HF8vXSzc5)
- Maintainer-supplied desktop PDF: digi-bible-documentation.docx.pdf, 27 pages. This documents a different target from the mobile search report.

These are background documents. This spec records the decisions made in the MVP interview.
