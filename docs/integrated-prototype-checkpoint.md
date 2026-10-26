# Integrated prototype checkpoint

Paused at user request, 2026-10-26. Implementation is incomplete. No GitHub issue or PR was changed.

## Resume

Continue on `1st-integrated-prototype`. Read this file and `.scratch/integration-context/coordination.md`; saved issue bodies and interface notes are in that ignored local folder. Re-read live implementation sources before relying on planned API notes.

The user requested all open issues #27–#50, using `/Users/kurtddanielbigtas/Desktop/upskill/lumina/.agents/skills/implement-spec/SKILL.md`, without tracker mutations or a PR. Preserve the exact look/styling/components of `2nd-prototype-Kurtd-Daniel-Bigtas`; enforce component composition. UI breakdown examples: `/Users/kurtddanielbigtas/Desktop/lumina-task-breakdowns`.

## Saved work

- Integration branch `1st-integrated-prototype`: baseline cdf4c47; reused existing WEB bootstrap via commits 8146cc6, c73c761, a83c27e, bc04fa8. New desktop `native.rs` and `commands.rs`, native registration/lifecycle/timer wiring are a checkpoint and cannot compile until backend branches are merged and signatures aligned.
- `33-library-search-Kurtd-Daniel-Bigtas`, worktree `/private/tmp/lumina-library`: imports, reference aliases/ambiguity, original-coordinate navigation queries, four search modes/paging/highlights, metadata. Owns `catalog.rs` in app and persistence catalog/imports/references/search; migration version 3.
- `28-workspace-projection-Kurtd-Daniel-Bigtas`, worktree `/private/tmp/lumina-workflows`: native audience protocol, exact ACK/history/deadlines, previews, durable workspaces, typography/bands/assets, information-mode work. Owns workflow contracts and workspace persistence; migration version 4. Further features/tests still in progress.
- `prototype-ui-composition-Kurtd-Daniel-Bigtas`, worktree `/private/tmp/lumina-ui`: second-prototype views/styles/assets/fonts, split into compositional desk parts, controlled `DeskController`/`DeskAction` interface. No frontend application engine or direct native imports. Route and real backend adapter still need integration.

All three workers were interrupted for pause. Their changes are checkpoint commits on their own branches. Their worktrees may be recreated from those branches if temporary folders disappear. Nothing from these three implementation branches has been merged yet.

## Outstanding integration

1. Continue each implementation slice and meaningful ticket-boundary tests; review acceptance criteria against actual code, not agent summaries.
2. Merge library and workflow branches carefully: app lib.rs/failure.rs, persistence lib.rs/migrations and Cargo.lock overlap. Keep both capabilities. Regenerate Cargo.lock after merging manifests. Root added rfd 0.17.2 and tokio time.
3. Root native adapter caches `AudienceOutput` for receiver startup; real caller identity comes from registered Tauri window label. Match actual workflow APIs, especially return values/errors. `restore_workflows()` must run after `Application::start()` before publishing ready.
4. Complete desktop wrappers for metadata mode, assets, and library revision. Current wrappers were drafted against planned APIs; fix `add_workspace` return (actual Workspace), map pure ApplicationFailure errors, and handle `expire_projections()->Result<bool>`.
5. Dispatch refreshed audience output with a fresh revision when appearance or cursor changes. A late cosmetic payload must not revert newer output; avoid creating verse history for appearance changes. This was requested from workflow worker but may remain undone.
6. Add `src/features/lumina/use-integrated-desk.ts` (reserved for root), accepted-state/view mapping, typed bridge capability wrappers/events, audience receiver (reserved `audience-receiver.tsx`), routes and generated contracts. Never send frontend-supplied verse text: resolve source IDs/coordinate in Rust or use saved preview/history IDs.
7. Map history recalls using `Verse.historyActionId`; metadata and captures survive source deletion. Handle reference ambiguity via explicit controller.referenceChoice options and choice token. Original backend highlights are UTF-8 byte offsets; convert to JS UTF-16 before rendering.
8. Import review staging runs outside global app lock (`lumina_persistence::stage_import`, then `application.register_import`). Publication/indexing still runs under a transaction; evaluate responsiveness and do not claim measured latency without evidence.
9. Preserve UI appearance defaults visually; confirmed backend overrides remain optional. Manage mountains/forest builtins through real assets upon Apply; workflow was adding `import_background_bytes(Vec<u8>)`. Managed assets are SQLite blobs; root can return base64 data URIs.
10. Run generated binding check, frontend/Rust checks, static build and relevant native walkthrough; apply code-review skill, fix findings, then complete #50 handoff/coverage report. No issue closing, comments, push or PR.

## Verification so far

Root observed: `cargo test -p lumina-app -p lumina-persistence --locked` passes for reused baseline (5 app + 5 initialization + 8 library tests). Root installed pinned frontend dependencies. No final integrated check has run.

Worker reports (not independently reverified): library initial real SQLite search/repeated import/immutable review/fresh-ID tests pass; workflow controlled send/timeout and 20-workspace restart/reorder tests pass; ported controlled UI typechecks. Worker checks were still underway at pause.

Root `cargo check -p Lumina --offline` currently fails because new command/native types live on unmerged backend branches. This is an expected incomplete integration, not a passing build. Physical display/cursor/release behavior remains unverified.
