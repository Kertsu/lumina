# Lumina specification changelog

This file records requirement changes and their rationale. The canonical [MVP specification](mvp.md) contains the resulting requirements. Historical entries are not implementation instructions.

## 2026-10-23 — One canonical feature baseline

- Merged the MVP plan and scratch implementation specification into `docs/specs/mvp.md`, preserving agreed behavior, detailed acceptance cases, evaluation guidance, the restart matrix, and the remaining-work table.
- Retired `.scratch/lumina-mvp/spec.md` and moved this changelog beside the canonical specification. Updated incoming links; older entries retain their historical document names.
- Reconciled foundation ownership and existing test guidance with the implemented architecture. Feature-specific contracts and UI decisions remain open; product scope is unchanged.

## 2026-10-21 — Audience-confirmed projection

- Define Projected as confirmation from the intended audience that it applied the exact verse action. Command acceptance and dispatch alone do not establish projection; software confirmation does not prove physical display visibility.
- Distinguish pre-dispatch rejection, which preserves previous state/output, from unconfirmed delivery after sending may have begun. Content may already have appeared when confirmation is missing, so the former blanket failure guarantee was too strong.
- Align the glossary, MVP plan, implementation specification, and acceptance cases. Defer detailed timeout, retry, and overlapping-action policies to projection feature design.

## 2026-10-21 — Lumina documentation consolidation

- Retired the product-comparison matrix and duplicate search proposal. The MVP plan and implementation specification define Lumina's requirements and acceptance behavior.
- Consolidated reference/matching examples, explicit ranking priorities, broader-match labels, and search evaluation guidance into the current plan and specification.
- Replaced interview question markers with named decisions and direct specification references. Preserved Lumina's requirement history and technical sources.
- Replaced external design-reference dependencies with operator walkthrough criteria. Aligned release qualification with cursor hiding and marked confinement research as deferred.

## 2026-10-21 — Restore the standard TDD workflow

- Removed the custom verification policy and its agent override, restoring the installed Matt Pocock skills' TDD workflow at agreed public interfaces.
- Testing Decisions now points directly to the TDD skill and identifies behavior to cover and available test setup. Acceptance and evaluation sections refer to those decisions.
- Retained physical-display checks, supported-platform qualification, and the 60-minute packaged offline release rehearsal.

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
- Consolidated successive implementation specifications into `.scratch/lumina-mvp/spec.md`, grouping repeated stories and acceptance checks by capability.
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

Established local/account-free operation, bundled WEB, SQLite imports, English/Tagalog matching presets and scopes, original-text history, appearance controls, and packaged offline verification. Deferred typo/semantic assistance and other enhancements listed in [future enhancements](future-enhancements.md).

### Foundational decisions

- **Search presets:** All words, Phrase, Word starts, and Contains text became the named matching modes, with All words as the default. They replaced an earlier design combining All words/Phrase/Any word with separate partial-word controls. Any word remains deferred.
- **Import identity:** Chose one documented book-number convention for conforming imports, replacing a proposal to accept alternative mappings. The exact number-to-book table remains import-contract work.
- **Audience lifecycle:** Startup opens only the operator. Open Audience explicitly opens blank output for setup. Closing the operator saves persistent workspace state and closes all audiences; reopening an audience does not immediately resume projection.
- **Licensing and metadata:** Selected MIT for Lumina code, with Bible text, metadata, and dependency terms kept separate. Optional attributed import metadata supports book information; a curated bundled dataset remains deferred.
- **Appearance:** An early application-global size-band design became workspace-scoped as independent audiences were introduced. Per-verse overrides remain deferred.
- **Offline qualification:** Accepted a 60-minute packaged-app rehearsal before each supported release, with measured results and platform limitations recorded separately from the chosen duration.
- **Library maintenance:** Replacement preserves installed-entry identity; removal switches future lookups to WEB. Captured current content/history retain original wording, while adjacent navigation requires the original edition. Maintenance clears obsolete results but retains typed queries, modes, and scopes.
- **Workspace capacity:** Rejected both a fixed workspace count cap and discarding saved workspaces on restart. Practical audience capacity is measured separately on supported hardware.

### Superseded cursor restriction design

Early Lumina designs explored an initially-off restriction control per audience, explicit activation/release, and composition across multiple audiences. Tab, fullscreen, and application switches preserved the selected controls; audience closure, display disconnection, and restart released restrictions. A global restriction switch and automatic fullscreen activation were rejected. This design was replaced by persistent per-workspace cursor hiding on October 18.

Native feasibility findings remain in the deferred [cursor restriction research](../research/cursor-confinement.md). They do not define current MVP behavior or prove platform support.
