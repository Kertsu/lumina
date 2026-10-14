# MVP finalization interview

Status: Q41 and Q46-Q62 settled; Q54 uses manual activation and rejects automatic fullscreen activation. Q60 handles missing references inline at attempted use, without a separate report. UI review and final shared-understanding confirmation remain. Accepted scope lives in [MVP](mvp.md); application implementation has not begun.

## Design tree

| Branch | Ready decisions | Decisions that follow |
| --- | --- | --- |
| Translation lifecycle | Q46/Q56-Q59/Q62 accepted | Stable identity, atomic replacement, and restore implementation details |
| Bible coverage | Q47/Q60/Q61 accepted | Exact number-to-book table and validation contract; partial imports and group definitions settled |
| Appearance | Q41/Q48/Q49 accepted | Initial size values, image constraints, and visual evaluation at different output sizes |
| Book information | Q50 accepted: optional import-supplied attributed metadata | Optional metadata contract, provenance and redistribution notices |
| Compatibility and release | Q51/Q52/Q55 accepted | Actual verified OS/engine/session matrix and measured performance on reference hardware |
| Application license | Q53 accepted: MIT | License file, contribution/release notices, and dependency-license review remain |
| Cursor activation | Q54 accepted: manual activation only | Prototype control placement and platform feasibility checks against accepted behavior |
| UI review | Existing inspiration and independent live/private navigation accepted | Updated prototype and operator walkthrough after the ready decisions settle; final shared-understanding confirmation |

Fact-dependent choices below use the [release-license findings](../research/open-source-release.md), [desktop qualification research](../research/desktop-release-targets.md), and [cursor research](../research/cursor-confinement.md). These sources do not establish runtime compatibility.

## Round decisions

| Question | Status and decision |
| --- | --- |
| Q41 — Font controls | Accepted: verse-text family, size, bold/italic, color, underline, and strikeout. Omit the separate Windows Script selector; reference/translation-label styles remain fixed. |
| Q46 — Translation management | Accepted: Manage Translations with Add, Replace, and Remove; confirmation for replacement/removal. Lifecycle rules are settled in Q56-Q62 below. |
| Q47 — Book coverage and WEB edition | Accepted: standard 66-book set and the publisher's WEB Protestant edition. Other book sets are deferred. |
| Q48 — Text-size policy | Accepted: editable global character-count ranges (size bands), showing current verse length and active range. Manual reduction updates the shared range and persists; per-verse overrides deferred. Exact initial ranges/values need visual evaluation. |
| Q49 — Backgrounds | Accepted: JPEG, PNG, BMP copied into managed storage; Fill/crop default and Fit available; private preview with Apply/Cancel. |
| Q50 — Book-information metadata | Accepted: optional attributed metadata supplied with imports; no curated bundled dataset until an appropriate source is established. Missing metadata shows Information unavailable. |
| Q51 — Qualification baselines | Accepted: start evaluation with Windows 10 22H2/11, macOS 13.3+, updated Ubuntu 22.04/Debian 12; Linux display sessions evaluated separately. Publish support only for configurations passing the full workflow, including cursor restriction. Actual compatibility remains unverified. |
| Q52 — Release rehearsal | Accepted: 60-minute packaged-app offline rehearsal before publishing a supported build, using English/Tagalog text and physical extended displays. Exercise search/navigation/projection, workspace restoration, disconnection recovery, representative queries, and long verses. Actual checks/results remain prospective. |
| Q53 — Application license | Accepted: MIT for Lumina code, including commercial/proprietary forks with retained notices. Adding the license file remains release work; Bible/metadata terms and dependency notices remain separate. |
| Q54 — Cursor activation | Accepted revision: manual activation only, with an initially-off toggle. Entering fullscreen does not enable restriction. Application switches preserve the chosen state; manual/closure/disconnection release behavior remains accepted. |
| Q55 — Offline installation | Accepted: downloaded release packages plus any supplied offline dependency bundle install/launch without fetching runtime or Bible assets on the documented supported OS baseline. Document OS prerequisites and include required offline runtimes. |

## Lifecycle decisions

| Question | Accepted decision |
| --- | --- |
| Q56 — Duplicate imports | Skip exact duplicates; matching titles alone never trigger replacement. Different data with the same title requires an explicit choice to add a distinct translation or replace the selected installed entry. |
| Q57 — Changes during projection | Require the audience window to be closed for Replace/Remove. Add remains available while presenting. This trades live maintenance flexibility for simpler projection continuity. |
| Q58 — Queued references | Preserve queued references across replacement/removal. Replacement resolves them against updated text; missing references or removed translations become unavailable and cannot be sent live from the queue. Restore through an explicit import into that translation entry; never silently substitute another Bible. |
| Q59 — History copies | Preserve originally recorded text and translation labels across updates/removal. Allow preview, copy, and explicit re-projection of a saved copy; label it in the operator UI. Adjacent navigation requires the original Bible edition to remain installed. |
| Q60 — Partial imports | Allow partial Bibles within the supported 66-book set, showing available coverage. Preserve canonical numbers; handle absent references inline when the operator tries to use one, preserving audience content. No separate missing-reference report. Navigation follows available verses in Bible order. |
| Q61 — Search groups | Define Books of Moses as Genesis-Deuteronomy, Gospels as Matthew-John, and Epistles of Paul as Romans-Philemon. Hebrews remains accessible through NT and specific-book scopes. These are explicit product filter definitions. |
| Q62 — Bundled starter | Keep the bundled WEB entry always available; user-facing Replace/Remove apply to imported translations. Other WEB editions can be added as separate imports. |

These product choices are accepted. The next review uses an updated prototype to choose control placement and confirm shared understanding. No additional feature-choice frontier is currently identified; feasibility and implementation details remain tracked below.

## Engineering work after product decisions

- Write the exact SQLite import/metadata contracts and validation rules; imported database row IDs remain local.
- Design stable installed-translation identity and derived search indexes around the chosen lifecycle behavior.
- Specify ranking weights, normalization/highlighting, paging, and performance checks; group membership is settled.
- Choose initial size profiles and image decoding/limits, then evaluate actual verse rendering.
- Prove cursor restriction across application switches through native integration and physical display checks; a successful cursor-grab API return is insufficient evidence.
- Record actual tested packages, operating systems, engines, display protocols, architectures, and reference hardware.
- Refresh the supplied-inspiration prototype, then review first use, import, reference projection, word-search preview/Send Live, translation change, independent navigation, appearance changes, and audience recovery.

These are prospective tasks. No prototype refresh, application implementation, installation check, or release rehearsal is claimed here.

## Evidence

- [Publisher's WEB Protestant edition](https://ebible.org/engwebp/) supplies 66 books. Its exact release artifact still needs a recorded source/date/hash.
- [MIT license text](https://opensource.org/license/mit) permits redistribution and sublicensing with retained copyright/permission notices; it does not require publishing fork source.
- [WEB notice](https://ebible.org/eng-web/copyright.htm) declares public-domain text and asks that changed text not retain the World English Bible name. Credit is proposed provenance rather than an invented mandatory attribution formula.
- The supplied desktop PDF shows font controls, adjustable character-length bands, and a JPG/BMP image filter. It does not establish shipped size defaults, units, handling beyond 999 characters, or metadata provenance. Its documented controls remain the comparison baseline in [desktop feature coverage](desktop-feature-coverage.md).

Prospective manual checks live locally in the main checkout's manual-verification directory under repository policy.
