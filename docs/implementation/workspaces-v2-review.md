# Workspace v2 review and qualification

Spec: `.scratch/lumina-mvp/spec-v2.md`. Baseline: `93785ec`. Independent
standards/spec source reviews inspected `9220eb3`; follow-up verified `527be79`.
Integration PR: https://github.com/Kertsu/lumina/pull/9. Parent: #4; persistence
#5, audience #6, operator #7, integration/qualification #8.

## Standards

No hard documented-standard violations. One possible Duplicated Code judgment:
native event subscriptions repeated the listener-before-snapshot race handling.
Fixed with a typed private workspace subscription helper. Independent follow-up
found no remaining hard violations or meaningful baseline smells.

## Spec

Two actionable source defects found and corrected:

- Workspace-specific display recovery messages were emitted but never shown.
  Each controller now subscribes to its own recovery feedback.
- Failed output destruction during detected display loss could retain its
  cursor restriction. Recovery now invalidates that output and releases only
  its restriction even if the OS refuses hide/destroy; reopening retires the
  remaining window before creating a blank generation.

Publication also serializes with native lifecycle operations and checks output
generation before caching. Stable macOS display IDs distinguish surviving
monitor rearrangement from loss. Follow-up source review confirmed the fixes;
these are not physical display-failure observations.

## Observed packaged workflow

The macOS debug package migrated the prototype's 2 queued verses and 46 history
entries into one UUID workspace with every output closed. A local recovery copy
of the old singleton was retained. Distinct Hall/Room tabs preserved independent
queries, results, selected Bibles, previews, queues, history and appearance.
Two real native audience windows showed different translations/text; tab
switching and Cmd+Enter targeted only the controlled output. Closing one did
not close the other. An inactive audience blocked Replace/Remove; duplicate Add
remained usable and preserved unrelated results/output.

Replacing the selected manual Tagalog fixture retained captured wording as a
Saved copy with adjacent navigation disabled. Explicit Send Live projected the
old wording/label; selecting its queued reference resolved updated wording.
Room's applied bold/70px band left Hall's bold/76px band unchanged and restored
after restart. Fixture text is synthetic and labeled accordingly.

Twenty saved workspaces were created in the UI. The twentieth received John
11:35 preparation and moved to position three. Cancelling removal preserved it.
Restart restored all 20 names/order, last active identity, queues/history and
applied appearance, with every audience closed and runtime previews/results
empty. This verifies 20 saved workspaces, not 20 simultaneous audiences.

Typecheck, Biome, rustfmt, Clippy with warnings denied, Vite production build,
and macOS debug .app packaging passed. No automated test files added/modified.
Detailed observed runs/screenshots and check instructions remain local in this
worktree's ignored `docs/manual-verification/`, as the maintainer directed.

## Outstanding acceptance

macOS has a composed global pointer-event filter behind explicit individual
toggles and Accessibility permission. Activation/status and independent release
were observed. The maintainer's physical check found a defect: the audience
rectangle stayed forbidden when another application covered it. The affected
audience was closed and its restriction released immediately. Visible-region
filtering and stationary-pointer recovery were added in `5227696`/`583c069`.
The follow-up physical run improved covering-app use but exposed a second
failure: foregrounding the audience with the pointer near its center traps or
hides it until another app is selected. The output was closed again and its
restriction confirmed off. This is still a failed native acceptance check;
targeted position/correction tracing is underway before further changes.
Windows/Linux exclusion is explicitly unimplemented. Keep #6 and the parent
acceptance work open; no supported-release/platform claim follows from this PR.

Physical extended-display disconnection, mixed scaling/fullscreen recovery,
native failure injection, confirmed removal, remaining maintenance failure
paths, baseline platform installation, and the accepted 60-minute packaged
offline rehearsal remain qualification work. Final UI/default appearance review,
performance/retrieval measurements, distribution licensing/notices and signing
remain release gates. The package ran without a development server; network
access was not disabled for these checks.
