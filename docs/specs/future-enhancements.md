# Future enhancements

Record scope reductions here as decisions settle. Reconsideration criteria guide future evaluation; scheduling requires a separate scope decision. Current scope lives in [MVP](mvp.md), with the legacy baseline in [desktop feature coverage](desktop-feature-coverage.md).

## Confirmed deferrals

Recorded during the MVP interview and multi-window discussion through October 15, 2026.

| Feature | Current decision | Reason | Reconsider when |
| --- | --- | --- | --- |
| Dedicated reading mode | Deferred beyond MVP | Focus the first release on the operator's projection workflow | Users need a distinct personal reading workflow after projection is reliable |
| Multiple audience windows | Original MVP has one audience; v2 decisions Q63-Q83 are settled: independent persisted tabs, shared Bible library/maintenance rules, individual controls, and no application-imposed count cap | Keep historical scope explicit while specifying independent operation | Review the [cumulative v2 spec](../../.scratch/lumina-mvp/spec-v2.md) and UI; implement and qualify the native workflow at published counts/configurations |
| Detached operator windows | One tabbed operator window accepted for the multi-window extension (Q67) | Keep workspace selection and audience identity in one control surface | Operators need controls simultaneously available on separate local displays |
| Bulk projection controls and linked navigation | Individual audience control in the multi-window extension; Blank All, Resume All, Send All, and linked navigation deferred (Q77) | Preserve independent output targeting | A concrete workflow requires coordinated actions across audiences |
| Dedicated cross-workspace copying/cloning | Fresh workspaces; dedicated copy/clone controls deferred (Q72/Q77). Existing clipboard Copy remains available | Keep workspace creation and preparation ownership straightforward | Operators repeatedly rebuild the same preparation across workspaces |
| Multi-slot presentation | Deferred beyond MVP | Keep presentation to one verse and translation at a time | Users need simultaneous translations or other independently arranged content |
| Reference ranges | Single-verse references and navigation in MVP (Q8) | Keep selection and projection behavior simple | Operators need multi-verse selections; evaluate queue, slide grouping, and navigation together |
| Auto-fit | Defaults and manual size reduction in MVP (Q27) | The maintainer reports the existing sizing workflow has been sufficient | Actual verses or display setups repeatedly require manual correction; evaluate readability and operator control |
| Projection pagination | Complete verse on one slide in MVP (Q27) | Preserve the current workflow of reducing text size | Real content cannot remain readable on one slide; evaluate splitting and navigation |
| In-app monitor picker | OS Extend, manual placement, then fullscreen in MVP (Q29) | Reuse the operator's existing display setup workflow | Manual setup causes repeated friction; verify placement support on each release platform |
| Independent reference/translation-label formatting | Fixed application styles and sizes in MVP (Q26) | Reduce appearance controls; customize verse text | Fixed labels cause readability problems or a concrete presentation requirement needs customization |
| Spelling assistance and fuzzy spelling correction | Deferred beyond MVP, including word and book-name typo suggestions | Maintainer reduced the search scope to explicit text matching | Operator queries repeatedly fail because of typos; evaluate corpus vocabulary, names, suggestion quality, and latency |
| Meaning-based semantic search | Deferred beyond MVP | Maintainer chose to postpone concept/paraphrase retrieval | Operators regularly remember ideas rather than wording; compare English/Tagalog hybrid retrieval with the lexical baseline and measure model resource costs |
| Additional Bible book sets | Standard 66-book set in MVP (Q47) | Use one documented book set and numbering convention | Users need books outside this set; evaluate numbering, ordering, scopes, and references together |
| Separate font Script selector | Omitted from MVP (Q41) | Keep the accepted font appearance controls without the legacy character-set dropdown | A concrete writing-system requirement cannot be addressed through font selection and rendering |
| Curated bundled book-information dataset | Optional metadata supplied with imports in MVP (Q50) | No appropriate attributable dataset is established | A suitable redistributable source for the fields is established and reviewed |
| Per-verse size overrides | Shared character-count size bands in MVP (Q48) | Preserve one manageable global size profile | Operators need individual verse adjustments without changing other verses in the same length range |

## Implementation and UI review

Feature choices are accepted. These items require detailed design, UI review, or verification.

The [finalization interview](mvp-finalization.md) tracks the settled design tree and final UI/shared-understanding review.

| Item | Current status | Next evidence or decision |
| --- | --- | --- |
| Initial size profile | Shared character-count range behavior accepted (Q48); initial ranges/values require evaluation | Evaluate real verse rendering in the prototype and on supported output setups |
| Cursor-restriction UI placement | Manual activation with an initially-off toggle accepted (Q54); fullscreen does not enable it | Place the toggle in the prototype and verify physical pointer behavior on each release platform |
| Translation lifecycle implementation | Q56-Q62 accepted: explicit duplicate/update decisions, maintenance while audience closed, queued references, saved history copies, partial imports, protected starter | Specify stable identity, atomic failure behavior, and explicit restore mechanics |
| Release documentation and notices | MIT selected (Q53); offline installation accepted (Q55) | Document attribution, dependencies, installation, and import contracts; verify actual packaged artifacts |
| Optional book-information contract | Import-supplied attributed metadata accepted (Q50) | Specify optional fields, provenance, and import handling |

## Resolved alternatives

Q23: Separate live/private Previous/Next controls accepted. Shared controls were considered for familiarity with the current application; separate controls preserve a prepared passage while advancing live content. Their placement, size, and prominence remain UI/UX design decisions; each pair must have a clear target.

Search input: All words, Phrase, Word starts, and Contains text accepted, with All words as the default. Android word/phrase/prefix/substring behaviors with user-facing presets replace required query syntax. The previous combination of All words/Phrase/Any word and separate partial-word controls is superseded. Any word remains a future evaluation candidate if operators need alternative-term matching.

Q39: One documented book-number convention accepted for the import contract. Conforming files require no manual book mapping. The earlier proposal of declaring or confirming alternative mappings is narrowed to this single convention; its exact number-to-book table remains an import-specification detail.

Q42: Cursor restriction is included from MVP. Deferral was proposed to reduce display-control scope; the maintainer chose to preserve this capability from the start. The initial recommendation described confinement to the operator's display; the maintainer clarified the goal as avoiding pointer hover over the audience window while allowing normal use of other applications. Its controls and platform constraints still need specification.

Q45: Revised behavior accepted. Cursor restriction remains enabled across application switches, with manual release and release on audience closure or display disconnection. The earlier automatic-disable-on-application-switch recommendation is withdrawn. Q54 settles manual, initially-off activation; control placement and shortcuts remain UI-design details.

Q43: Closing the operator window saves persistent workspace state and closes the audience window. The maintainer clarified that restoring the saved workspace does not restore the audience window: startup opens only the operator. Opening or reopening the audience explicitly still starts blank until projection.

Q44: An explicit Open Audience button opens the audience window blank for placement and fullscreen setup. Projection requires it to be open; searching, queue preparation, and private preview remain available while it is closed.

Q54: Manual cursor activation accepted. A newly opened audience window starts with restriction off; the operator enables it explicitly. The automatic-enable-on-fullscreen proposal was rejected. Entering fullscreen or switching applications does not change the chosen state; manual, audience-closure, and display-disconnection release behavior remains accepted.

Q53: MIT selected for Lumina code to permit broad reuse, including proprietary/commercial forks with retained notices. Bible text, metadata, and dependency notices remain separate.

Q48: Editable global size bands accepted. Manual size changes affect every verse in that character-count range and persist; per-verse overrides are deferred.

Q52: A 60-minute packaged-app offline rehearsal accepted before publishing supported builds. The duration is a chosen sustained-use check, not a guarantee of reliability; actual workflow results and platform qualifications must still be recorded.

Q56-Q62: Translation lifecycle, partial imports, group membership, and protected bundled WEB accepted. Missing references receive inline feedback when someone tries to use an unloaded verse; there is no separate missing-reference report. Queue references follow installed text and become unavailable when their data is absent; history retains original saved copies.

Q67-Q71: The multi-window extension accepts one operator window with independent workspace tabs, including closed-audience preparation workspaces. The initial five-workspace cap was subsequently removed under Q82. Each owns search, selected translation, private/live content, queue, history, and appearance; fonts and size bands are shared only within that workspace. Bible installation is shared across workspaces. Switching tabs preserves other outputs, and projection/navigation shortcuts target the active workspace. These extension rules override the baseline's application-global appearance scope without changing the original single-audience spec.

Q72-Q79: Fresh renameable workspaces, confirmed tab removal, restoration with every audience closed, isolated display-failure handling, all-audiences-closed shared Bible maintenance, individual presentation controls, and tab output identification accepted. Q79 rejects the proposed global cursor-restriction switch: each workspace has its own initially-off toggle, and enabled restrictions compose without one toggle changing another. Q80 settles scoped activation/release; Q81 settles maintenance effects in the [cumulative v2 spec](../../.scratch/lumina-mvp/spec-v2.md).

Q80: Cursor activation/release accepted per workspace: closing/disconnecting one audience resets only its restriction off; reopening starts off. Tab/fullscreen/application switches preserve choices, and app restart starts all restrictions off. Other enabled restrictions remain effective.

Q81: Replacement updates the same installed Bible entry from a reviewed SQLite import, preserving identity/selection. Removal switches affected selections to WEB for future lookups. Clear obsolete results but retain typed queries/modes/scopes. Captured preview/history retain original wording/labels; queued references resolve updated text or become Unavailable. Saved copies can be explicitly projected; adjacent navigation requires the original edition.

Q82-Q83: Remove the application-imposed workspace/audience count cap and retain cross-restart workspace persistence. Practical capacity depends on hardware/OS resources; measured qualification counts are published separately. Fresh-session startup discarding saved workspaces was considered and rejected. All product decisions from this discussion are settled; maintainer/UI review and native qualification remain.

## Removed from scope

Application-level Bible encryption was explicitly removed by the maintainer. Keep this decision recorded separately from features deferred for later evaluation.

## Maintenance

When a decision changes, update this document, the MVP spec, and the coverage matrix together. Preserve the previous rationale and note the new evidence behind reconsideration. Add a manual verification guide when a deferred feature enters an implementation slice.
