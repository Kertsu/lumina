# Independent workspace integration contract

Spec: `.scratch/lumina-mvp/spec-v2.md`. Integration baseline: `93785ec`.
Continue on `1st-prototype-Kurtd-Daniel-Bigtas`.

## Shared boundaries

Keep `Workspace` as the persistent preparation payload. Add `WorkspaceEntry`
with `id: string`, `name: string`, `state: Workspace`, and `WorkspaceCollection`
with `version: 2`, `activeWorkspaceId: string`, `workspaces: WorkspaceEntry[]`.
Array order is tab order; identity is an opaque UUID, never position/name.

Storage exports `loadWorkspaces(): Promise<WorkspaceCollection>` and
`saveWorkspaces(collection: WorkspaceCollection): Promise<void>`. Native commands
are `load_workspaces` and `save_workspaces`, with the latter argument named
`collection`. Preserve/migrate the legacy singleton into Audience 1 exactly once;
retain old data until a successful transactional v2 save. New workspace state
uses WEB, empty queue/history, default appearance. No count cap or aggregate
snapshot byte limit; bound individual records if needed. Managed backgrounds
must work for every entry without embedding image bytes in saved JSON.

Audience exports take `workspaceId: string` as their first argument:
`openAudience`, `closeAudience`, `publishAudience`, `setAudienceFullscreen`,
`setCursorRestriction`, `watchAudience`. Existing other arguments follow it.
`setOperatorOnTop` stays global. `receiveAudience` obtains identity from the
audience URL (`workspaceId` parameter). Native commands use `workspaceId` invoke
arguments and unique `audience-<workspaceId>` labels. Only `main` may mutate.
Event payloads must identify their workspace; browser channels/popups likewise.
Audience titles identify workspace IDs; workspace names never enter the slide.

The operator shell owns shared library and persisted collection. Keep workspace
controllers mounted by stable ID while switching tabs so runtime search,
preview/live and pending async responses remain bound to their initiating
workspace. Only active controller handles keyboard actions. One close handler
saves all workspaces and closes all audiences. Removal awaits output closure
before deleting state, keeps at least one workspace, and requires confirmation.
Already prepared selections are captured text, including after maintenance;
queue selection resolves current installed text. Shared-library changes clear
obsolete results, retain query/mode/scope, and fall back to WEB only for future
lookups after removal.

## Task graph and ownership

1. Persistence (ready): types.ts, workspace.ts, storage.ts, storage.rs; durable
   collection/migration and all-audience maintenance guard. Add both command
   registrations to lib.rs, coordinating its small shared edit with audience.
2. Audience (ready): audience.ts, Audience.tsx, audience.rs; keyed native/browser
   transport, blank recovery, individual failure/display isolation, restriction
   feasibility/implementation. Keep application-top semantics unchanged.
3. Operator (ready against interfaces above): Operator.tsx, new operator shell,
   route and styles; tab lifecycle, independent controllers, shared library,
   maintenance UI and saved-copy rules, inactive keyboard safety.
4. Integration/review (blocked by 1–3): merge, static/package/manual checks,
   independent standards/spec review, fixes, ticket resolution and cleanup.

Repository manual verification policy overrides automated-test requirements.
No test files added/modified. Guides stay in this worktree by prior maintainer
instruction. Native/display/cursor/offline claims require direct observed runs;
document any unavailable qualification instead of claiming completion.
