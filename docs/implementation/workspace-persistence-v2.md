# Workspace collection persistence

The stable identity is a UUID, independent of name and tab position. The version 2
collection stores the ordered entries and active identity. Each entry retains the
existing preparation payload: selected translation, queue, captured history, and
confirmed appearance. Preview, search results, live state, windows, and restriction
choices are runtime-only.

Native SQLite stores `workspace_entries` rows with ID, name, position, and payload,
and one `workspace_collection` metadata row. All entries, order, deletions, and active
identity commit in one transaction. A failed save rolls back every row. Backgrounds
are copied to app-managed content-addressed files and serialized as references per
entry, then hydrated for rendering on load. Missing/corrupt images fall back to color.
There is no workspace-count limit or aggregate snapshot byte limit. The existing
32 MiB safeguard applies to one preparation record after image bytes are removed.
Storage capacity and process resources remain hardware/OS limits.

On first load without v2 metadata, the legacy singleton becomes Audience 1 with a
new UUID. This migration commits the collection transactionally before returning it;
subsequent loads read the saved identity. The old singleton is retained as a recovery
copy. Invalid legacy JSON or collection identities fail visibly instead of replacing
the data with defaults. Fresh profiles start with WEB and default appearance.

Browser fallback uses IndexedDB entry and metadata stores with the same transactional
save and migration behavior; its old localStorage key is retained. Storage quota,
blocked database upgrades, or denied storage produce errors. Browser fallback does
not establish desktop/offline release support.

All native storage commands require the exact `main` window label. Replace/Remove
check every keyed audience window while holding the shared maintenance lock, which
is also used by audience creation; Add remains available during presentation.

Manual guide: `docs/manual-verification/5-persist-independent-operator-workspaces.md`
in the designated integration worktree (local/ignored).
