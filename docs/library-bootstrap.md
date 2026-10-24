# Offline library bootstrap and canonical lookup

Implements [#27](https://github.com/Kertsu/lumina/issues/27) on the accepted
foundation `5a76a3b7db1e5a673b2907c86c5144454f5fd50d`. Product reference UI,
alias parsing, imports, selection/settings editing and audience receivers remain
their subsequent backend/UI tasks.

## Ownership and behavior

- `lumina-core`: workspace/translation/edition identities and native coordinate
  validation. Canonical book numbers are 1–66; chapter and verse are positive
  signed 32-bit integers, without WEB-derived limits.
- `lumina-app`: startup snapshot, workspace-scoped private reference lookup,
  and stable code-specific public failures. Lookup neither selects a current
  verse nor creates history, changes information mode or opens an audience.
- `lumina-persistence`: read-only embedded WEB, indexed real SQLite lookup,
  stable generated identities, durable settings and atomic bootstrap. One
  immediate transaction covers migrations, the entire seed, default workspace,
  active selection and state loading; only its committed result is published.
- `src-tauri`: both public operations use the existing blocking runtime and
  serialized application connection. One registration generates TypeScript;
  errors retain diagnostic causes before public mapping.

Schema version 2 appends library and workspace tables. Existing version 1 stays
unchanged. A fresh profile gets **Audience 1**, WEB selected, Hide cursor on,
no current verse, information mode off and a closed audience. Relaunch restores
durable identities, workspace order/names, active workspace, selected translation
and Hide cursor. Runtime content and audience ownership are reconstructed empty.
Other appearance/history settings are added by their owning feature tasks.

The [seed record](../crates/lumina-persistence/seed/README.md) documents the exact
publisher acquisition and extraction. Native packages include `notices/LICENSE`,
`notices/WEB-NOTICE.html` and `notices/WEB-provenance.json`. App MIT terms and
publisher Bible notices remain separate. No runtime network fetch is used.

## Commands and failures

| Rust command / bridge method | Contract |
| --- | --- |
| `get_application_state` / `getApplicationState()` | Returns the ready library/workspaces snapshot; startup failures use `APPLICATION_UNAVAILABLE` with `starting`/`failed` |
| `resolve_reference` / `resolveReference(request)` | `{ workspaceId, coordinate: { bookNumber, chapter, verse } }`; resolves that workspace's selected edition, including an inactive workspace |

Success returns `{ workspaceId, verse }` with original text, canonical/native
coordinate, imported book name, translation title, translation ID and edition ID.
Requests are canonical typed coordinates; English/Tagalog input parsing is
separate work. Invalid JSON/argument shapes are transport failures; well-typed
invalid coordinates receive the application validation code below.

| Stable error code | Typed data |
| --- | --- |
| `WORKSPACE_NOT_FOUND` | `workspaceId` |
| `INVALID_REFERENCE` | Original `coordinate` and invalid `field` (`bookNumber`, `chapter`, `verse`) |
| `TRANSLATION_UNAVAILABLE` | `translationId` |
| `REFERENCE_UNAVAILABLE` | `translationId` and original `coordinate` |
| `STORAGE_FAILURE` | Display-safe message; original storage cause stays in terminal diagnostics |

No rejection changes accepted state or substitutes another coordinate/edition.
Frontend callers use `ApplicationClient` and `ClientResult`; unknown native
rejections become `INVOCATION_FAILED`. Browser methods return fixed fixtures,
without implementing lookup rules or persistence. The welcome scaffold only
needed its existing error classification extended for the generated union.

## Inspect the running native app

Run `pnpm dev`, open the operator WebView inspector (macOS: Option-Command-I),
select **Console**, and run this async expression. The async wrapper also works
in WebKit consoles without top-level await support.

```js
(async () => {
    const { client } = await import("/src/bridge/client.ts");
    const ready = await client.getApplicationState();
    console.log(ready);
    if (ready.status !== "ok") return;
    const request = {
        workspaceId: ready.data.activeWorkspaceId,
        coordinate: {
            bookNumber: 43,
            chapter: 3,
            verse: 16,
        },
    };
    console.log(await client.resolveReference(request));
    console.log(await client.resolveReference({
        ...request,
        coordinate: {
            bookNumber: 43,
            chapter: 0,
            verse: 16,
        },
    }));
    console.log(await client.getApplicationState());
})();
```

Expect one WEB translation, 66 books, 31,098 verse rows, one default workspace,
a closed audience and no current verse. John 3:16 begins “For God so loved the
world” and uses “only born Son”. Chapter 0 yields `INVALID_REFERENCE`; Romans
16:25 yields `REFERENCE_UNAVAILABLE` in this edition, whose corresponding text
is at Romans 14:24–26. Neither lookup changes the state snapshot.

Record the three identity strings. Close and relaunch; query again. Identities,
selection/settings and row counts remain the same; runtime content stays empty
and audiences closed. Inspect Rust/SQLite causes in the launch terminal.

For an isolated macOS debug/static check, merge a temporary Tauri configuration
with a unique identifier, such as `com.kurtddanielbigtas.lumina.issue27check`,
and `app.withGlobalTauri: true`. Build and bundle using that configuration:

```sh
pnpm tauri build --debug --no-bundle --config /absolute/path/to/test-config.json
pnpm tauri bundle --debug --bundles app --config /absolute/path/to/test-config.json --ci
```

This keeps the normal profile separate and enables the public
`window.__TAURI__.core.invoke` console API in that test bundle. Replace the
bridge calls above with `invoke("get_application_state")` and
`invoke("resolve_reference", { request })`; raw native rejections need `catch`.
Do not commit the test configuration or enable global API access in production.

## Verification evidence — 2026-10-24

| Category | Observed result |
| --- | --- |
| Automated | `pnpm check` passed: 33 frontend tests, 20 Rust tests; includes real temporary SQLite startup, restart, selection/settings persistence, workspace isolation, original whitespace/Unicode, maximum native coordinates, invalid/absent references, migration/seed/default rollback and storage causes |
| Static/contracts | Rust formatting, Clippy, TypeScript, Biome and generated-contract drift passed through `pnpm check` |
| Reproduction | `python3 scripts/prepare-web.py --check` reproduced every schema/data value from the retained official USFM archive; artifact and signed-manifest member hashes checked |
| Build/package | Static Vite build and macOS native debug build/app bundle passed; all three notice resources present |
| Native startup | Isolated profile reached `managed database ready` with macOS sandbox denying network; repeated launches reopened successfully |
| Native IPC | macOS 27.0.1 WebKit DevTools: WEB/default snapshot, John 3:16 original wording, `INVALID_REFERENCE`, `REFERENCE_UNAVAILABLE`, and unchanged snapshot observed through actual native commands |
| Native relaunch | Automated restart coverage passes; final DevTools inspection is pending because computer control reported the Mac locked |
| Receiver/physical/release | Deferred: no audience receiver/UI exists here; no physical-display, cross-platform or release qualification claimed |

The command-line network-denied process was not discoverable through computer
control. The native IPC observation used Finder to register/launch the debug
bundle. These are separate observations; a fully combined offline DevTools run
is not yet recorded.
