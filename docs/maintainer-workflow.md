# Maintainer walkthrough

Start here after time away. This joins the foundation's setup, code locations,
change workflow, and acceptance scenarios. Results live separately in
[foundation verification](foundation-verification.md). Approved scenarios and
agent checks do not complete maintainer acceptance.

For beta distribution, start with the approved [release plan](releases/beta-plan.md)
and planned [release runbook](releases/runbook.md). They cover private installer
testing, updater behavior, branch ownership, and the public launch. Release
automation and updater integration remain implementation work.

## 1. Set up a fresh checkout

Install Node 24, [Rustup](https://rustup.rs/), and the native prerequisites:

| Host | Required for desktop compilation and full `pnpm check` |
| --- | --- |
| macOS | Xcode Command Line Tools (`xcode-select --install`), including Clang and the macOS SDK; confirm `xcode-select -p` and `xcrun --find clang` |
| Windows | Microsoft C++ Build Tools with Desktop development with C++, Windows SDK, Rust's MSVC toolchain, and Edge WebView2 |
| Ubuntu 24.04 (CI host) | `build-essential pkg-config libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` via apt |

See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for other
distributions and installation details. Browser-only work needs Node/pnpm;
application/persistence tests need Rust and a C compiler for bundled SQLite,
without Tauri/WebKit. No system SQLite executable or server is required.

```sh
git clone https://github.com/Kertsu/lumina.git
cd lumina
npm install --global pnpm@10.30.1
node --version
pnpm --version
rustup toolchain install --no-self-update
rustc --version
pnpm install --frozen-lockfile
pnpm check
```

Expect Node `v24.x`, pnpm `10.30.1`, and Rust `1.96.0`.
`.node-version`, `package.json#packageManager`, and `rust-toolchain.toml`
declare those versions; Rust's file also installs rustfmt/Clippy. Ensure nested
scripts resolve the same pnpm, especially if multiple installations are on PATH.
pnpm 10 may warn that esbuild's build script is ignored; the verified commands
work with its installed platform binary, without approving that script.

Keep both committed lockfiles: `pnpm-lock.yaml` for frontend dependencies and
root `Cargo.lock` for all four Rust packages. Use frozen/locked commands;
dependency updates are deliberate changes to review and commit. A fresh setup
needs downloads; the application itself uses bundled assets and local storage.

## 2. Run each surface independently

```sh
pnpm dev
# Stop with Ctrl+C, then:
pnpm dev:vite
# Open http://localhost:3000/; stop with Ctrl+C.
pnpm build:vite
pnpm preview:vite
# Open http://localhost:4173/; stop with Ctrl+C.
```

Desktop starts Vite through Tauri's hook; do not start another Vite alongside
it. Port 3000 must be free. Browser mode needs no desktop process or backend.
**Say hello** shows `Hello world from Rust!` and the current epoch on desktop;
browser mode shows `Hello world from the browser fixture!` and epoch `1234`.
`/playground` is available in development and shows Not Found in production.
`dist/` contains the static frontend, fonts, and assets; no server rendering is
part of the package.

## 3. Locate and change the integration

Use the [architecture map](architecture.md) and [glossary](../GLOSSARY.md).
Prepared ADRs remain in `docs/adr/`: [0005](adr/0005-use-static-react-frontend.md)
for static React, [0006](adr/0006-own-application-state-in-rust.md) for state,
[0007](adr/0007-use-one-managed-sqlite-database.md) for storage,
[0008](adr/0008-separate-application-library-from-tauri.md) for crate direction,
and [0010](adr/0010-standardize-code-based-application-errors.md) for failures.

| Follow **Say hello** | Responsibility / likely edit |
| --- | --- |
| `src/app/main.tsx` → `src/app/router.tsx` → `src/routes/index.tsx` | Mount React, construct router, compose the public Welcome capability |
| `src/features/welcome/welcome.tsx` | Interaction state: pending, rendered result, error-code classification; uses shared Button |
| `src/bridge/client.ts` → `bindings.gen.ts` | Select host once; typed `ApplicationClient.greet()`; normalize unknown desktop rejection centrally |
| `src-tauri/src/bindings.rs` → `src-tauri/src/lib.rs::greet` | One command/event registration; typed handler adapting the request to the runtime |
| `src-tauri/src/runtime.rs` → `Application::greet` | One `spawn_blocking` path and serialized application access; Rust computes the greeting |
| `crates/lumina-app/src/lib.rs` → `Storage` | Own application startup/readiness and retain initialized storage; greeting does not query or persist data |
| `crates/lumina-persistence/src/lib.rs` → `migrations.rs` | Implement `Storage` with one bundled SQLite connection, FTS5 probe, atomic migrations |
| `crates/lumina-core/src/lib.rs` | Home for domain types and pure rules; no domain rule is needed by this greeting |

At startup, `src-tauri/src/main.rs` calls `run()` in `lib.rs`. Its setup hook
registers the runtime, resolves the managed database path, and schedules a
closure constructing `SqliteStorage` and `Application::start`. Initialization
and commands acquire the application mutex inside the blocking worker. Setup
returns to the event loop before storage is ready. See
[startup details](../README.md#rust-responsibilities-and-startup) for the data
path, lifetime, readiness failures, and migrations.

Dependency arrows: application → core; persistence → application/core; shell →
application/persistence. Application owns the storage interface. SQLite/Tauri
types stay in their adapters. Rust owns accepted application state and workflow
decisions; React owns drafts, focus, pending display, and open panels. Browser
fixtures supply representative states, without reimplementing application rules
or becoming fallback data after desktop failure.

For a consumed contract change, edit `Greeting` or the public failure definition
in `crates/lumina-app`, adapt the application/handler, then run:

```sh
pnpm bindings:generate
pnpm typecheck
pnpm test src/bridge/client.test.ts
pnpm test src/features/welcome/welcome.test.tsx
pnpm bindings:check
```

Update affected consumers and tests until types/checks pass. Add actual commands
or events to `src-tauri/src/bindings.rs`; runtime and generator share it. There
are no application events yet. Failure codes/data are defined once in
`crates/lumina-app/src/failure.rs`; keep wire codes stable, branch on codes,
retain internal causes, and use messages only for display.

`bindings.gen.ts` is generated, committed output. `src/routeTree.gen.ts` is also
generated, by the router plugin. Edit bridge/client, feature, and shared UI
source directly. To change shared visuals, edit `src/shared/ui/button.tsx` or
theme tokens in `src/styles.css`; [shared UI](shared-ui.md) covers adding a
Radix component with the configured aliases. No binding generation is needed
for a style-only change.

## 4. Check and debug the change

```sh
pnpm typecheck
pnpm test src/features/welcome/welcome.test.tsx
cargo test -p lumina-app --locked
cargo test -p lumina-persistence --test initialization --locked
pnpm check
pnpm build:vite
```

`pnpm check` runs `check:frontend` then `check:rust`; CI runs the same groups
in independent Ubuntu jobs on every PR to `main` and push to `main`, including
Rust-only changes. Checks detect drift without writing bindings or starting
windows. Generation compiles the desktop crate and needs native compile tools.
See [verification](verification.md) for each command and guard limits.

Tests: Rust units beside modules; persistence integrations in the crate's
`tests/`, against real temporary SQLite files; React/router/bridge tests beside
their modules. Application/persistence commands above run without Tauri.
Existing error, client, React, and storage seams cover the foundation; avoid
adding tests for folder names or unimplemented product features.

Read Rust startup/source-chain diagnostics in the launching terminal. Inspect
React and IPC errors in browser developer tools or the development WebView
inspector. The bridge logs `Lumina desktop greet failed` and retains
`diagnostic.cause`; inspect it with a breakpoint in `normalizeFailure`.
An unavailable desktop call remains an error. For storage failures, use the
printed database path and cause; preserve user data rather than deleting it to
make startup pass. For stale bindings, regenerate explicitly and typecheck.
For a busy port, stop the previous dev process.

Use `@/features/<feature>`, `@/bridge/client`, and `@/shared/ui/<component>`
across modules, relative imports within a feature/bridge. Biome guards written
canonical paths, including native imports outside the bridge. Relative
cross-module paths, alternate aliases, computed imports, exports, suppressions,
and Cargo dependency additions still need review; passing checks do not prove
complete module privacy.

## 5. Rehearse M1–M8 and restore

Begin with `git status --short` clean, dependencies installed, and native tools
available. Preserve unrelated work first. Run surface commands sequentially;
stop each with Ctrl+C and quit the native application before switching. Temporary
fixtures/styles/contracts must never be committed. Record host, actions,
diagnostics, and observed result in the [verification record](foundation-verification.md).

| ID | Starting conditions, actions, expected result, restoration |
| --- | --- |
| M1 | Follow fresh setup above; `pnpm check`, then `pnpm dev`. Expect passing checks, welcome in the operator window, printed database path and ready message, no unexplained errors. Click **Say hello**, restart to verify reopening, then stop desktop. No source edit to restore. |
| M2 | Desktop stopped; `pnpm dev:vite`, visit `/` and `/playground`, use Back, and click **Say hello**. Expect browser fixture/epoch `1234`. Temporarily edit visible text in `welcome.tsx`; expect hot reload without native processes. Restore only the text edit, confirm normal welcome, stop Vite. [Fixture details](integration.md#m2-browser-fixture). |
| M3 | Clean Button source. [Shared UI procedure](shared-ui.md#m3-verify-both-surfaces): change default `px-4` to `px-8`, observe wider Button in desktop and browser sequentially; test Tab focus, Enter/Space, and subsequent greeting. Restore `px-4` on each surface, stop it, verify no Button diff. |
| M4 | Clean route; use the [exact temporary failure fixture](integration.md#m4-stable-classification-across-message-changes). Click, change only message wording, click again. Expect **Application starting** unchanged, message changed, identical code/data. Restore route, confirm normal greeting, stop Vite. |
| M5 | Desktop stopped, clean route; use the [exact unavailable-desktop fixture](integration.md#m5-unexpected-desktop-invocation-rejection). Expect **Connection error**, `INVOCATION_FAILED`, inspectable command/cause and console diagnostic; retry stays usable without browser success. Restore route, confirm browser greeting, stop Vite. |
| M6 | Clean Rust/bindings and passing drift check. [Consumed-contract procedure](integration.md#m6-consumed-incompatible-contract): rename greeting `message` to `text` in Rust declaration/initializer. Drift must fail without rewriting output; regenerate without a window, typecheck must identify consumers. Restore Rust and generated output; drift/typecheck must pass. |
| M7 | Clean route and passing checks. [Import procedure](verification.md#m7-prohibited-import-and-restoration): add `import "@tauri-apps/api/core";` to the route. `pnpm check` must report file/line and `noRestrictedImports`. Remove that import; restored check must pass. Other canonical guard probes and bypass limits are in that guide. |
| M8 | Native packaging prerequisites available, source restored, all dev/preview servers stopped. Build and launch the package below. Expect welcome, bundled icon/fonts, and real Rust greeting without localhost. Quit package; no source edit to restore. Record unavailable prerequisites and leave unverified if blocked. |

After all temporary edits, inspect `git diff` (fixtures must be gone), run
`pnpm check` and `pnpm build:vite`. Restoration commands in focused guides
assume those files were clean initially; otherwise undo only the temporary edits.
The maintainer reported M1–M8 passing on 2026-10-22; see the
[acceptance ledger](foundation-verification.md#maintainer-acceptance-ledger).

## 6. Build and launch a local package (M8)

Stop `pnpm dev`, `pnpm dev:vite`, and any preview. Build for the current host,
forwarding `--locked` to Cargo:

```sh
pnpm build -- --locked
```

Tauri first builds `dist/`, then the native release executable and host bundles
under `target/release/bundle/`. This may take several minutes. On macOS the
output is `macos/Lumina.app` and `dmg/Lumina_0.1.0_aarch64.dmg` on arm64.
For an application bundle alone, use `pnpm build --bundles app -- --locked`.
See Tauri's [application bundle](https://v2.tauri.app/distribute/macos-application-bundle/)
and [DMG](https://v2.tauri.app/distribute/dmg/) instructions. Other hosts produce
their configured native installers; use the printed output paths and documented
host prerequisites, recording any additional bundler-tool requirement.

On macOS launch the built bundle directly, keeping startup diagnostics visible:

```sh
./target/release/bundle/macos/Lumina.app/Contents/MacOS/Lumina
```

On Windows launch the installed package's executable; on Linux launch the
built/installed host package. Verify **Say hello** returns Rust data with no
development server, then quit. Record OS/version, architecture, tool versions,
exact build/launch commands, bundle path, and result. Package build/process
startup alone does not establish rendering or interaction success. Local
verification qualifies only that host; release signing/notarization automation
and cross-platform qualification are outside this ticket.
