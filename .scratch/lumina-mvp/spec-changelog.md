# Lumina specification changelog

This file records requirement changes and their rationale. The current [specification](spec.md) and [MVP plan](../../docs/specs/mvp.md) contain only the resulting requirements. Historical entries are not implementation instructions.

## 2026-10-18 — Reversible book information projection

- Added a per-workspace toggle that temporarily projects attributed book information while retaining the current verse. Turning it off restores that verse, or blank output when none exists.
- Kept Previous/Next available against the retained verse. Successful verse navigation, Send Live, history recall, and current-verse translation changes exit information mode; failed actions preserve it.
- Bound metadata and background to the retained verse's book and translation edition. Without a current verse, operators choose a book from their already-selected translation; no additional translation picker is needed.
- Preserved Blank/Closed states during toggles. Resume displays the selected mode; audience reopening starts blank with runtime mode retained, while restart resets information mode off.
- Kept history verse-only. Metadata display creates no verse entry; restoring a verse records its actual projection. Missing audience fields are omitted, with private explanations and a disabled toggle when no supplemental metadata exists.
- Kept the information container and typography open to UI design. A modal in the prototype did not establish the missing projection behavior. Extended the plan, glossary, and manual acceptance tables consistently.

## 2026-10-18 — Native verse coordinates clarified

- Separated shared 66-book identities from each edition's native chapter/verse numbering. Imports preserve source coordinates and text; bundled WEB does not define bounds or completeness for other translations.
- Required converters and native import validation to enforce the same structural/resource contract. Lookup, indexes/results, ordering, navigation, copy/export, and projection use the selected edition's stored coordinates.
- Kept positive-integer chapter/verse coordinates in scope. Additional book-ID conventions, split/suffixed labels, and merged verse identifiers need explicit representation before support is claimed.
- Clarified that Change translation looks up the same numbered coordinate. Missing coordinates leave output unchanged; automatic equivalent-passage mapping remains deferred.
- Added the native-coordinate architecture decision and manual acceptance cases for successful variant numbering, invalid imports, and unavailable references during translation changes.
- Trigger: conversion rejected BCV `145016025` (Romans 16:25) because the embedded WEB table ended chapter 16 at verse 24. The converter's coordinate rejection was reproduced in isolation; the prototype importer also derives its bounds from bundled WEB. No congregation CSV text was inspected or added to this repository, and this documentation update does not claim the implementation is fixed.
- Publisher evidence: [WEB's Romans 16 footnote](https://ebible.org/engwebp/ROM16.htm) locates the passage at Romans 14:24–26; [KJV Romans 16](https://ebible.org/eng-kjv/ROM16.htm) includes verses 25–27. This is a numbering/placement difference, not evidence that the source coordinate is invalid.
- Bundled WEB and the selected application license remain unchanged.

## 2026-10-18 — Audience always-on-top clarified

- Optional always-on-top applies to each audience window where supported by the operating system.
- The active workspace controls its associated audience independently; other audiences retain their settings.
- Corrected the documentation's mistaken operator-window target and added manual checks for audience stacking and isolation.

## 2026-10-18 — Cursor visibility finalized

- Removed cursor restriction: no pointer confinement, audience-window exclusion, or composed pointer filters are required.
- Adopted a per-audience **Hide cursor** preference, enabled for new workspaces by default. Each workspace retains its own choice across audience closure/reopening and application restart.
- Hiding affects visibility over that audience only. Movement across edges, clicks, and normal focus behavior remain available; the pointer must be visible outside the audience area.
- Tab, fullscreen, and application switches preserve the choice. Changing/closing one audience does not change another audience's preference.
- Native and rendered cursor settings must agree. The prototype had independent hiding at the native window, audience container, and slide. Source inspection was not a fresh runtime verification. Tauri's documented macOS focus behavior requires checking that the pointer reappears outside the audience.
- Reason: the maintainer's goal is avoiding visible pointer distraction. Restricting pointer movement adds behavior and platform integration beyond that goal.
- Removed decision history, question IDs, superseded alternatives, and revision-specific wording from the active plan/spec. Moved historical notes here; the future-enhancements document now contains only deferred scope and reconsideration criteria.

## 2026-10-18 — Optional preview for references and search

- Added **Send Live** and **Check preview** choices to quick reference and search results, using one shared preview behavior.
- Preview privately shows captured verse text, reference, and translation without changing current output, blanking state, or history. Dismissal has no display effect; Send Live projects the inspected content and records one event.
- Kept preview temporary and workspace-bound. Sending requires its originating workspace active and audience open; switching tabs cannot retarget it.
- Left the preview surface, control placement, activation defaults, and keyboard bindings to UI design. A modal was suggested as an example, not selected as a requirement.
- Retained one current-verse navigation pair and no queue. This adds an optional inspection path without reinstating persistent independent private/live browsing.

## 2026-10-18 — Documentation consolidation

- Combined MVP scope and finalization into `docs/specs/mvp.md`, organized by workflow and feature.
- Combined the original and v2 contracts into `.scratch/lumina-mvp/spec.md`, grouping repeated stories and acceptance checks by capability.
- Deleted the duplicate finalization/versioned spec files and updated incoming links.
- Preserved the shared Bible lifecycle, original history wording, independent audiences, workspace persistence, UI review, and manual release qualification requirements.

## 2026-10-17 — Direct projection and queue removal

- Removed the verse queue and its persistence/lifecycle requirements.
- Replaced independent private/live verse states and navigation pairs with one current verse and one navigation pair.
- Removed the mandatory staging/Send Live step; result/reference actions projected directly. The optional preview path was subsequently added on October 18.
- Retained appearance-settings Apply/Cancel as a distinct styling workflow.

## Earlier multi-audience planning

- Chose one operator window with independent audience workspace tabs instead of synchronized references.
- Shared the installed Bible library while keeping search, selected translation, current content, history, and appearance workspace-specific.
- Removed the proposed two/five output limits; capacity is measured on actual hardware rather than enforced by a fixed product cap.
- Retained persistent workspace identity, names/order, settings/history, and last active workspace; audiences reopen only by explicit action.
- Required every audience closed for shared Replace/Remove; retained captured wording while future lookups use installed data or WEB fallback.
- Initially chose independent cursor-restriction controls. Those controls and their lifecycle rules are superseded by the October 18 visibility preference.

## Earlier MVP planning

Established local/account-free operation, bundled WEB, SQLite imports, English/Tagalog matching presets and scopes, original-text history, appearance controls, and packaged offline verification. Deferred typo/semantic assistance and other enhancements listed in [future enhancements](../../docs/specs/future-enhancements.md).

### Imported interview notes

These notes preserve the earlier discussions, including statements that are now superseded. In particular, cursor-restriction requirements below no longer apply. The current specification governs.

Multiple audience windows: included in the current plan. The original single-audience deferral is superseded by independent persisted tabs, shared Bible maintenance, and no application-imposed count cap. Tested simultaneous output counts remain release evidence, not a product limit.

Q23 (revised October 17–18): Separate live/private navigation originally preserved preparation while advancing output. The current plan retains one current-verse navigation pair and no queue. Quick reference/search now offer direct Send Live or Check preview followed by explicit Send Live. The temporary preview has shared behavior without prescribing a modal or other container; this does not restore persistent private/live preparation or a second navigation pair.

Search input: All words, Phrase, Word starts, and Contains text accepted, with All words as the default. Android word/phrase/prefix/substring behaviors with user-facing presets replace required query syntax. The previous combination of All words/Phrase/Any word and separate partial-word controls is superseded. Any word remains a future evaluation candidate if operators need alternative-term matching.

Q39: One documented book-number convention accepted for the import contract. Conforming files require no manual book mapping. The earlier proposal of declaring or confirming alternative mappings is narrowed to this single convention; its exact number-to-book table remains an import-specification detail.

Q42: Cursor restriction is included from MVP. Deferral was proposed to reduce display-control scope; the maintainer chose to preserve this capability from the start. The initial recommendation described confinement to the operator's display; the maintainer clarified the goal as avoiding pointer hover over the audience window while allowing normal use of other applications. Its controls and platform constraints still need specification.

Q45: Revised behavior accepted. Cursor restriction remains enabled across application switches, with manual release and release on audience closure or display disconnection. The earlier automatic-disable-on-application-switch recommendation is withdrawn. Q54 settles manual, initially-off activation; control placement and shortcuts remain UI-design details.

Q43: Closing the operator window saves persistent workspace state and closes the audience window. The maintainer clarified that restoring the saved workspace does not restore the audience window: startup opens only the operator. Opening or reopening the audience explicitly still starts blank until projection.

Q44: An explicit Open Audience button opens the audience window blank for placement and fullscreen setup. Projection requires it to be open; searching and verse selection remain available while it is closed. Opening/reopening stays blank; Resume or deliberate verse selection displays the retained current verse.

Q54: Manual cursor activation accepted. A newly opened audience window starts with restriction off; the operator enables it explicitly. The automatic-enable-on-fullscreen proposal was rejected. Entering fullscreen or switching applications does not change the chosen state; manual, audience-closure, and display-disconnection release behavior remains accepted.

Q53: MIT selected for Lumina code to permit broad reuse, including proprietary/commercial forks with retained notices. Bible text, metadata, and dependency notices remain separate.

Q48: Editable size bands accepted. The original application-global profile became workspace-scoped in v2. Manual size changes affect every verse in that workspace's character-count range and persist; per-verse overrides are deferred.

Q52: A 60-minute packaged-app offline rehearsal accepted before publishing supported builds. The duration is a chosen sustained-use check, not a guarantee of reliability; actual workflow results and platform qualifications must still be recorded.

Q56-Q62: Translation lifecycle, partial imports, group membership, and protected bundled WEB accepted. Missing references receive inline feedback when someone tries to use an unloaded verse; there is no separate missing-reference report. Queue behavior was removed October 17; current verses/history retain captured wording while new searches use installed text.

Q67-Q71: The multi-window extension accepts one operator window with independent workspace tabs, including closed-audience preparation workspaces. The initial five-workspace cap was subsequently removed under Q82. Each owns search, selected translation, current verse/output visibility, history, and appearance; fonts and size bands are shared only within that workspace. Bible installation is shared across workspaces. Switching tabs preserves other outputs, and projection/navigation shortcuts target the active workspace. These rules supersede the original single-audience/application-global appearance baseline, whose earlier versions remain in Git history.

Q72-Q79: Fresh renameable workspaces, confirmed tab removal, restoration with every audience closed, isolated display-failure handling, all-audiences-closed shared Bible maintenance, individual presentation controls, and tab output identification accepted. Q79 rejects the proposed global cursor-restriction switch: each workspace has its own initially-off toggle, and enabled restrictions compose without one toggle changing another. Q80 settles scoped activation/release; Q81 settles maintenance effects in the [implementation contract](spec.md).

Q80: Cursor activation/release accepted per workspace: closing/disconnecting one audience resets only its restriction off; reopening starts off. Tab/fullscreen/application switches preserve choices, and app restart starts all restrictions off. Other enabled restrictions remain effective.

Q81: Replacement updates the same installed Bible entry from a reviewed SQLite import, preserving identity/selection. Removal switches affected selections to WEB for future lookups. Clear obsolete results but retain typed queries/modes/scopes. Captured current verses/history retain original wording/labels; queue requirements were removed October 17. Saved copies can be explicitly projected; adjacent navigation requires the original edition.

Q82-Q83: Remove the application-imposed workspace/audience count cap and retain cross-restart workspace persistence. Practical capacity depends on hardware/OS resources; measured qualification counts are published separately. Fresh-session startup discarding saved workspaces was considered and rejected. All product decisions from this discussion are settled; maintainer/UI review and native qualification remain.

### Background evidence

The [cursor-confinement research](../../docs/research/cursor-confinement.md) and initial prototype observations describe the earlier restriction work. The desktop PDF/Notion pages establish a functional comparison baseline; the separate Android report informed matching presets. They do not establish unobserved search algorithms or current native compatibility.
