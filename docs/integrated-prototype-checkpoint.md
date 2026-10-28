# Integrated prototype handoff

Updated 2026-11-01 on `1st-integrated-prototype`, based on `cdf4c47`.
The backend slices are merged and the composed operator/audience integration is
implemented. This replaces the paused implementation checkpoint. GitHub issues
#27–#50 were read as specifications; no issues, comments, PRs, or remote branches
were changed.

The user authorized UI integration beyond the tickets' backend-only phase.
The second prototype's layout, fonts and components remain the visual reference.
The shared palette now uses cool light surfaces and the approved charcoal dark
mode. Catppuccin was dropped during review.

## Ownership and entry points

| Location | Responsibility |
| --- | --- |
| `crates/lumina-app/src/catalog.rs` | Import, reference, search, metadata contracts |
| `crates/lumina-app/src/workflow.rs` | Accepted workspace/output/history/appearance transitions |
| `crates/lumina-app/src/workflow_catalog.rs` | Source-bound navigation, preview, translation and metadata operations |
| `crates/lumina-persistence/src/` | Managed SQLite, append-only migrations, library/indexes, durable captures/assets |
| `src-tauri/src/commands.rs` | IPC adaptation and trusted verse resolution |
| `src-tauri/src/native.rs` | Native window ownership, output delivery and cached startup payload |
| `src-tauri/src/bindings.rs` | Shared command/event registration and TypeScript generation |
| `src/bridge/client.ts` | Typed host adapter, validated failures and browser fixtures |
| `src/features/lumina/use-integrated-desk.ts` | Accepted-state rendering and local interaction drafts |
| `src/features/lumina/audience-receiver.tsx` | Audience revision application and exact acknowledgment |
| `src/features/lumina/projection-desk.tsx` | Composed operator desk, controlled through `DeskController` |

Rust owns accepted settings, selection, previews, output intent and history.
React owns drafts, open panels, focus, and presentation caches. Browser mode
renders fixed representative application data; native workflow actions return
an explicit unavailable result instead of simulating Rust transitions.

Workspace IDs isolate operator contexts. Translation and edition IDs bind text
and captures to their original source. Audience ownership adds session and
instance IDs; output revisions and action IDs correlate delivery/acknowledgment.
Frontends send coordinates, source IDs, or captured candidate/action IDs;
installed verse text is resolved in Rust.

## Public integration surface

Names below are native command names. The generated TypeScript API uses camelCase.
`src/bridge/bindings.gen.ts` defines the complete request/result/failure shapes;
regenerate it with `pnpm bindings:generate`, then run `pnpm typecheck`.

| Capability | Commands |
| --- | --- |
| Startup and accepted state | `get_application_state`, `greet`, `library_revision` |
| Workspaces | `add_workspace`, `rename_workspace`, `activate_workspace`, `reorder_workspaces`, `remove_workspace` |
| Lookup and browsing | `resolve_reference`, `resolve_reference_input`, `list_books`, `chapter_verses`, `navigation_state` |
| Search | `search_verses` with explicit scope/mode/order/page/library revision/request ID |
| Selection and preview | `select_verse`, `preview_verse`, `dismiss_preview`, `send_preview`, `navigate_verse` |
| Translation | `select_translation`, `change_current_translation` |
| Audience | `open_audience`, `audience_state`, `acknowledge_audience`, `blank_audience`, `resume_audience`, `close_audience` |
| Native preferences | `set_hide_cursor`, `set_audience_fullscreen`, `set_audience_always_on_top` |
| Application preference | `set_application_theme` (System/Light/Dark, shared by both windows) |
| History | `read_history`, `recall_history`, `copy_history`, `export_history`, `save_history`, `clear_history` |
| Import/deletion | `pick_bible_import`, `review_import`, `commit_import`, `cancel_import`, `delete_translation` |
| Appearance and metadata | `appearance_state`, `apply_appearance`, `book_information`, `set_information_mode` |
| Managed images | `import_background`, `import_background_data`, `builtin_background`, `read_asset_uri` |

The generated `applicationChanged` event prompts an accepted-state refresh;
`audienceUpdated` carries an `AudienceOutput` for its registered native audience.
The receiver subscribes before asking for cached initial output. Only a
registered audience window can acknowledge its own session/action/revision.
The operator never supplies trusted receiver identity.

Desktop bridge calls return `ClientResult<T>`: either `{status: "ok", data}` or
`{status: "error", error}`. The error includes a stable `errorCode`, display
message, and code-specific data. Branch on codes, never on message wording.
Families include unavailable/invalid references, stale search/library/choice,
import review and deletion gates, workflow/native operation failures, rejected
assets/appearance, and storage errors. `PROJECTION_STORAGE_UNCERTAIN` identifies
the workspace/action when output or its confirmation could not be durably
recorded. Internal source diagnostics stay separate from public display messages.

A reference request through `deskClient.resolveReferenceInput` is:

```ts
{
    workspaceId,
    translationId: null,
    input: "John 3:16",
    choice: null,
    choiceToken: null,
}
```

An accepted result contains `status: "resolved"` and the original resolved
verse, or `status: "ambiguous"` with explicit candidates and a choice token.
A preview request uses `VerseTarget` (workspace/translation/edition/coordinate),
then Send Live uses its returned candidate ID. Opening an audience is an
explicit operator action; previewing never opens it implicitly.

A receiver acknowledgment contains `{sessionId, actionId, revision}`. Successful
command delivery alone does not prove rendering: only the intended receiver's
exact acknowledgment marks the same history record Projected. Missing
confirmation becomes unconfirmed after five seconds, without automatic resend
or rollback. Old acknowledgments cannot replace newer content.

If writing an acknowledgment's history outcome fails, the snapshot's runtime
`projectionFailures` retains its owner, acknowledgment and typed failure. The
operator displays that failure separately from the unconfirmed outcome. The
receiver neither treats an error result as confirmation nor retries implicitly.

Workspace organization, translation selectors, Hide cursor preferences,
application theme, history captures, appearance and managed image bytes are
durable. Current
content, previews, captured book-information mode, audience windows/owners and
delivery state are runtime-only. Restart starts audiences closed and current
content empty; it never resumes live projection implicitly.

## Verification evidence

Latest verification (`pnpm check:frontend` and `pnpm check:rust`):

- Frontend lint/typecheck, 123 tests and static build (2026-11-01).
- Rust formatting, generated binding drift and Clippy with warnings denied
  (2026-11-01).
- 54 Rust tests: 4 desktop runtime/quit policy, 5 application, 15 catalog, 5 initialization,
  8 library, 15 workflow and 2 settings tests. Persistence tests use real temporary
  SQLite; workflow tests use controlled native I/O and supplied times.

Coverage joins seed/restart/migrations, immutable multi-edition import,
reference ambiguity, literal Unicode search/highlights/paging, source deletion
and Saved copies, managed assets, preview/history, exact/stale acknowledgments,
timeouts, native rejection, storage uncertainty and workspace isolation.
The strip regression suite exercises both layouts, stable visible thumbnails,
smooth offscreen reveal, reduced motion and late chapter data before paint.

The 2026-11-01 default palette separates live,
success and gold roles. An isolated Chromium review covered both modes,
120 Button observations, 16 switch states, four destructive-menu states and
six System/manual combinations. See the
[current palette evidence](specs/application-theme.md#current-palette-verification)
for measured contrast and qualification limits.

Palette hierarchy refinement adds shared opaque selection surfaces, neutral
passive chrome and consistent stage/tab status colors. A bounded Chromium pass
sampled 60 foreground/background pairs, 16 layouts and eight audience-state
comparisons in both modes. Existing tests now check tab/stage agreement for
all seven audience-state cases. Native Lumina remained closed.

The light-only refinement replaces cream/beige neutrals and gold hover fills
with cool grays and pale blue. All 35 dark palette values and sampled dark
component colors match the preceding version in manual and System-dark modes.
The review sampled 160 contrast pairs and 16 layouts; light text measured at
least 4.78:1. See the same palette evidence for exact roles and limits.

Search matches now use solid paired colors and semibold text. The three
supplied Tagalog examples retained all nine match ranges and their original
wording at desktop/narrow widths; highlight text measured 8.78:1 in light mode
and 9.61:1 in dark mode.

Quit protection adds 23 frontend cases for first/second presses, observed hold
input, release-before-exit, cancellation, missing keyup, browser behavior and
audience routing. Three bridge cases cover generated native commands and
browser rejection; two Rust cases cover shared prompt arbitration and explicit
confirmation. An offscreen native WebKit probe confirmed Cmd+Q keydown/keyup
delivery after removing the native quit accelerator. Native desktop dialogs
and Windows execution still require the walkthrough below; Lumina was not
launched for this change.

The guarded entry points are Cmd/Ctrl+Q, operator Close and application-menu
Quit. The pinned macOS runtime does not expose a cancellable Dock Quit event;
that path remains outside this prototype's guard.

Twelve divider tests cover both resize directions, collapse at the closed
divider position, width restoration, keyboard bounds, selection clearing,
pointer ownership and cleanup on release, cancellation, blur, external collapse
and unmount. An
isolated interactive Chromium fixture exercised both sides in light/dark:
native mouse drags kept text unselected, collapsed at the closed handle
position with different grab offsets, restored the starting width and allowed
ordinary text selection afterward.
Blur and unmount also released the resize lock without browser errors. Lumina
was not launched.

The frontend suite covers reference size bands, boundary editing without focus
loss, thumbnail keyboard navigation, dismissible feedback and native-menu
dispatch with the browser fallback. Audience-name tests cover opening, live
renaming and reopening, workspace isolation, unchanged output/history, storage
rejection and accepted names retained after a native title failure.

Workspace tabs use compact state icons and accessible state text. Their close
buttons use the existing confirmation without activating an inactive tab; the
last workspace remains open. Tests cover each audience state, including pending
and unconfirmed output. Thirty isolated Chromium layouts (1, 3 and 20 tabs;
360–1920px; light/dark) verified inset focus on the rounded tab surface, a
visible bottom border, an 8px add-button gap, aligned controls and no horizontal
page overflow. The checks reproduce the former outside focus ring, covered
border and 18px gap before the CSS corrections. Active and hovered tabs share
one rounded inset surface, with a stronger active fill; idle tabs stay
transparent. Keyboard focus uses that same surface. Light/dark static checks
cover these three states. Lumina was not launched.

Audience titles use `Lumina · <operator tab name>`. The application supplies the
accepted name; the native adapter formats and updates the caption. A failed
native title update reports the failure after saving the tab name; renaming
again or reopening applies the saved name. Native title-bar and popup appearance
remain manual qualifications; Lumina was not launched for this follow-up.

An isolated offscreen WebKit check reproduced five center lines versus six
thumbnail lines with `text-wrap: pretty`. Normal wrapping preserved identical
line breaks across 252 renderings: three verses, 14 font sizes (24–72px) and six
widths (146–1280px). The check rendered the actual `VerseSlide` and stylesheet
with the bundled Cormorant Garamond font. The corrected stylesheet passed without
a test-only override; frontend checks (76 tests) and the static build passed
again. Lumina was not launched for this rendering check.

`pnpm build:vite` and a development `.app` bundle build were also exercised during
integration. These are build evidence, not physical display qualification.
The static build passed again after the final review corrections.
Earlier isolated native checks observed real WEB startup, private preview,
closed-audience send rejection with retained preview, and a newly opened black
audience. They did not establish real audience apply/ACK under all conditions.
No new application launch was performed during the final commit review.

## Standards

Three review findings were corrected: native source errors reach diagnostics
before public mapping, Rust persists the shared application theme, and palette
values have one customization source. The dependency build policy is explicit.
The targeted standards recheck reported no remaining findings.

## Spec

Seven review findings were corrected: OT/NT scopes, current projection identity,
deleted-edition result invalidation, submitted-query paging, acknowledgment
storage errors, Saved-copy translation labels, and metadata identity/credit.
Follow-up checks covered rejected searches retaining valid paging and cosmetic
revisions using a neutral status instead of awaiting confirmation forever.
Receiver tests also cover active-image loading, missing-image fallback, and a
blank output superseding image work. The targeted spec recheck reported no
remaining findings.

Review totals: Standards 3 resolved/0 open; Spec 7 resolved/0 open. Native and
physical qualifications below remain separate from code-review findings.

## Remaining native and performance qualification

Use an isolated application profile/database and local fixtures. Keep each
workspace and native audience identifiable; inspect the accepted snapshot and
native diagnostics after each action.

| Starting condition / action | Expected result to qualify |
| --- | --- |
| Fresh offline profile; launch and restart | One bundled WEB edition, one closed workspace; no duplicate seed on restart |
| Closed audience; inspect and Send Live | Private preview remains; send is rejected and does not open output |
| Open audience; send a known verse | Black initial output; intended receiver displays original text, then exact action becomes Projected |
| Hide/occlude receiver or interrupt delivery | Awaiting confirmation becomes unconfirmed after five seconds; no automatic resend/rollback |
| Two workspaces with distinct verses; close/reopen one | Other output survives; obsolete instance/revision callbacks cannot confirm the replacement |
| Blank/Resume and book-information return | Retained original captures; confirmation-only history follows the documented rule |
| Import, review, cancel/repeat; delete after closing audiences | No source-file mutation; fresh IDs on reimport; original history/previews/assets remain Saved copies |
| Appearance/image changes and restart | Correct shared size bands, original grapheme counts and retained managed image bytes |
| Open, rename and reopen tabs with distinct names | Each audience caption follows its own tab name, including live renames |
| Right-click a workspace tab or use Shift+F10 | Native popup targets that workspace; disabled move/close actions stay unavailable |
| Cmd+Q/Ctrl+Q in operator, including a focused input | First press shows themed hint; hold or two presses arm quit; Q release exits; Escape/blur cancels |
| Operator close, application-menu Quit; Windows Alt+F4 | Native Quit/Cancel dialog; repeated requests share one dialog; Cancel preserves all windows |
| Audience close and audience quit shortcut | Close affects only that audience; quit shortcut opens operator-side confirmation without a projected hint |
| Move audience to an extended monitor, disconnect it | Only the affected native audience closes; verify real OS monitor identity behavior |
| Cursor/fullscreen/always-on-top on supported hosts | Native and rendered cursor agree; real fullscreen/window ordering behave as requested |

Real rendering/acknowledgment, clipboard/export gestures, multi-monitor behavior,
cursor agreement, OS packaging and release readiness still require the native
walkthrough on each supported configuration. Controlled acknowledgments do not
prove pixels reached a physical display.

Import review parsing runs outside the serialized application lock. Publication
and index construction remain transactional under that lock; responsiveness
while projecting during a large import is not yet qualified. Search uses the
normalized correctness path; count-only scan/trigram measurements and their
limits are in [catalog backend notes](catalog-backend.md). Do not infer
million-row, packaged latency or live-import performance from unit tests.
