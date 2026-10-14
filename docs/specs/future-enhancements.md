# Future enhancements

Record scope reductions here as decisions settle. Reconsideration criteria guide future evaluation; scheduling requires a separate scope decision. Current scope lives in [MVP](mvp.md), with the legacy baseline in [desktop feature coverage](desktop-feature-coverage.md).

## Confirmed deferrals

Recorded during the MVP interview through October 14, 2026.

| Feature | Current decision | Reason | Reconsider when |
| --- | --- | --- | --- |
| Dedicated reading mode | Deferred beyond MVP | Focus the first release on the operator's projection workflow | Users need a distinct personal reading workflow after projection is reliable |
| Multiple audience windows | One audience window in MVP | Keep output setup and control manageable | A concrete service workflow needs independently controlled displays |
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

## Removed from scope

Application-level Bible encryption was explicitly removed by the maintainer. Keep this decision recorded separately from features deferred for later evaluation.

## Maintenance

When a decision changes, update this document, the MVP spec, and the coverage matrix together. Preserve the previous rationale and note the new evidence behind reconsideration. Add a manual verification guide when a deferred feature enters an implementation slice.
