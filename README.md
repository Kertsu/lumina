# Lumina

Bible passage selection and projection during gatherings. The current welcome
scaffold runs as a static React, Vite, and TanStack Router frontend in either
Tauri's operator window or a browser.

Returning to the project? Follow the [maintainer walkthrough](docs/maintainer-workflow.md)
for fresh setup, a cross-stack change, M1–M8, local packaging, and recorded
verification evidence. The responsibility maps and focused guides below remain
the reference for each area.

## Setup

- Node.js 24 (`.node-version`).
- pnpm 10.30.1 (`package.json`'s `packageManager`).
- For desktop development/builds: Rust and the platform's
  [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On macOS,
  install Xcode Command Line Tools; Windows needs Microsoft C++ Build Tools
  and WebView2; Linux needs the distribution's WebKitGTK and build packages.
- Rust 1.96.0, including rustfmt and Clippy, is pinned in `rust-toolchain.toml`.
  Install Rustup first, then install the declared toolchain from the repo root.

```sh
npm install --global pnpm@10.30.1
node --version
pnpm --version
rustup toolchain install --no-self-update
pnpm install --frozen-lockfile
```

Expect Node `v24.x` and pnpm `10.30.1`, including inside script subprocesses.
Preserve `pnpm-lock.yaml` and the root `Cargo.lock`; there is no desktop-only
lockfile. Cargo checks use `--locked`. The walkthrough lists native setup for
each host; full verification needs native compile tools even without a window.

## Run and build

| Command | Result |
| --- | --- |
| `pnpm dev` | Start Vite and open the native operator window |
| `pnpm dev:vite` | Serve the same frontend at `http://localhost:3000` |
| `pnpm build:vite` | Build static HTML, JavaScript, CSS, fonts, and assets into `dist/` |
| `pnpm preview:vite` | Preview the static build at `http://localhost:4173` |
| `pnpm build` | Build the desktop package using `dist/` |

Stop a development command with Ctrl+C before switching between desktop and
browser development: both use port 3000, and a busy port causes startup to fail.
Tauri's development/build hooks run the corresponding Vite commands. The
[Tauri Vite guide](https://v2.tauri.app/start/frontend/vite/) describes this
integration, including the `TAURI_DEV_HOST` host/HMR settings.

Open `/` for the welcome screen or `/playground` for the development-only
component sandbox. `/playground` renders Not Found in a production build.
Click **Say hello** on `/` to call the selected application client. Desktop uses
the Rust operation; a browser uses a fixed representative fixture. There is no
server-rendering process.

## Frontend responsibilities

| Location | Owns |
| --- | --- |
| `index.html` | Document metadata and the application mount element |
| `src/app/main.tsx` | Global styles, React mounting, and router composition |
| `src/app/router.tsx` | Router construction, options, and registered route types |
| `src/routes/` | Route entry points, nesting, and the playground environment gate |
| `src/features/welcome/welcome.tsx` | Welcome UI and greeting interaction through the typed client |
| `src/bridge/client.ts` | One typed client, desktop normalization, browser fixtures, host selection |
| `src/bridge/bindings.gen.ts` | Committed Rust-generated contracts; regenerate rather than edit |
| `src/shared/ui/` | Editable shadcn/ui primitives and their styling helper |
| `components.json` | Explicit Radix style and shared UI generator aliases |
| `src/routeTree.gen.ts` | Generated route tree; Vite regenerates it when routes change |
| `src/styles.css`, `public/` | Shared styling, bundled fonts, and static assets |
| `vite.config.ts`, `src-tauri/tauri.conf.json` | Frontend tooling and desktop entry/output wiring |

Use `@/` imports across frontend modules, including `@/features/welcome` for
the feature's public entry point. Keep related capability UI, interaction
hooks, and tests together under `src/features/`. Routes compose capabilities;
they do not own product workflows. Add real modules as responsibilities arise.

Direct native calls/subscriptions stay in `src/bridge/`. Features consume
`ApplicationClient` from `@/bridge/client`; they never import native APIs or
generated command wrappers. Shared UI under `src/shared/ui/` stays independent
of features, application rules, and the native bridge. React owns pending/result display state;
accepted application state and greeting computation belong to Rust. See the agreed
[architecture](docs/architecture.md) and [domain glossary](GLOSSARY.md).

## Rust responsibilities and startup

| Location | Owns | Local dependencies |
| --- | --- | --- |
| `crates/lumina-core` | Domain types and pure rules; no rules needed yet | None |
| `crates/lumina-app` | Application ownership, startup use case, storage interface | Core |
| `crates/lumina-persistence` | Bundled SQLite connection, configuration, migrations | Application, core |
| `src-tauri` | Composition root, IPC, desktop runtime and native adapters | Application, persistence |

Trace startup from `src-tauri/src/main.rs` to `run()` in `src-tauri/src/lib.rs`.
Its setup hook resolves the application data directory, registers
`DesktopRuntime`, and schedules initialization before returning to the native
event loop. The worker closure opens `SqliteStorage` and calls
`Application::start`, which initializes storage through the application-owned
`Storage` interface. The application retains its initialized storage.

`src-tauri/src/runtime.rs` contains the sole `spawn_blocking` boundary. Both
startup and the existing `greet` command use it. One mutex serializes access to
the application and its single SQLite connection; the mutex is acquired inside
the blocking task, never on the native UI thread. The connection may move
between worker threads but is never accessed concurrently. There is no worker
queue or background-job framework. Shutdown drops application ownership and
closes the connection when outstanding tasks release it. A command racing
startup either waits on the worker's lock or reports that storage is starting.
Storage failure leaves the operator window running and native calls unavailable.

The database is `lumina.sqlite3` under Tauri's application data directory for
`com.kurtddanielbigtas.lumina`. Typical locations:

- macOS: `~/Library/Application Support/com.kurtddanielbigtas.lumina/`
- Windows: `%APPDATA%\com.kurtddanielbigtas.lumina\`
- Linux: `$XDG_DATA_HOME/com.kurtddanielbigtas.lumina/`, defaulting to
  `~/.local/share/com.kurtddanielbigtas.lumina/`

The terminal prints the actual path before initialization and a ready message
after success. Failure diagnostics print the operation and retained source
chain. Native setup/event-loop failures return a failing process exit code;
storage failures preserve a typed startup cause in the managed runtime. The
`greet` command logs retained causes before translating runtime failures into
the generated public failure contract.

Persistence creates missing directories, opens the managed file with bundled
SQLite, enables foreign keys, and sets a five-second busy timeout. Initialization
probes FTS5 using a temporary virtual table, then applies migrations atomically
in an immediate transaction. `PRAGMA user_version` tracks the schema; version 1
reserves the foundation and adds no product tables. Reopening is idempotent;
newer schemas are rejected without downgrading. Name SQL files using the
[migration convention](CONTRIBUTING.md#database-migrations) and register their
sequential versions in `crates/lumina-persistence/src/migrations.rs` with
feature work. SQLite connections, rows, and SQL stay inside persistence.

The root `Cargo.lock` covers all four packages; the former desktop lockfile
has moved there. Root Cargo commands default to the three native-free libraries.
All packages explicitly inherit workspace lint policies and are unpublished.
`clippy.toml` names the existing incompatible upstream dependency duplicates
required by Tauri/build tooling and SQLite/test dependencies. Other duplicate
crates still fail Clippy; inspect `cargo tree -p Lumina -d --target all` when
updating dependencies and remove exceptions when their ranges converge.

```sh
# Native-free checks: no Tauri build or desktop window.
cargo check -p lumina-app -p lumina-persistence --locked
cargo test -p lumina-app -p lumina-persistence --locked
cargo test -p lumina-persistence --test initialization --locked
cargo clippy -p lumina-app -p lumina-persistence --all-targets --locked -- -D warnings

# Full Rust checks: desktop compilation needs native prerequisites, opens no window.
cargo fmt --all -- --check
cargo check --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
```

Application unit tests live alongside startup and public failure serialization. Persistence integration tests
use real disposable SQLite files to cover creation, reopening, migration
version handling, bundled FTS5, and diagnostic causes. They use the same
bundled dependency and initialization path as desktop startup.

For the storage runtime check, run `pnpm dev`, inspect the printed path and
ready message, and confirm the operator window responds. Close and restart:
the same database should reopen without unexplained errors. Use disposable data
when investigating failures. Maintainer runtime observations remain pending.

## Typed calls and failures

See the [integration guide](docs/integration.md) for the React → bridge → desktop
→ application path, generated contracts, diagnostic causes, exact M2/M4/M5/M6
fixture activation/restoration steps, and pending runtime observations.

```sh
pnpm bindings:generate
pnpm typecheck
pnpm bindings:check
```

## Shared UI

The welcome screen's **Say hello** action uses the editable Radix-backed
shadcn `Button` in `src/shared/ui/button.tsx` on both surfaces. Change its
classes directly; use `src/styles.css` for shared light/dark theme tokens.
Bundled Inter and JetBrains Mono fonts remain shared too.

See the [shared UI guide](docs/shared-ui.md) for adding components, dependency
selection, customization, editable versus generated ownership, and the M3
desktop/browser verification steps. Maintainer M3 observations remain pending.

## Verify and debug

```sh
pnpm check
# Separate static build check:
pnpm build:vite
```

`pnpm check` runs frontend lint/format checks, TypeScript, Rust formatting,
contract drift, Clippy, React tests, and Rust tests. It runs `pnpm check:frontend`
then `pnpm check:rust`; CI runs these same groups in parallel jobs for every
PR targeting `main` and every push to `main`, including Rust-only changes.
It checks without rewriting source or launching application windows;
full verification needs the native compile prerequisites above.

See [verification](docs/verification.md) for individual commands, enforced
import paths and their limits, Rust dependency/lint inspection, diagnostics,
and M7 violation/restoration steps. Regenerate changed contracts explicitly
with `pnpm bindings:generate`; ordinary verification only detects drift.

Router rendering/navigation tests live beside the router in
`src/app/router.test.tsx`; run just those with
`pnpm test src/app/router.test.tsx`. They use the real route tree with memory
history, covering welcome rendering, navigation, and the playground gate.
Native window startup and hot reload require runtime checks.

For a startup/navigation/hot-reload check:

1. Run `pnpm dev`. Confirm the operator window shows the welcome screen; stop it.
2. Run `pnpm dev:vite`. Open `/` and `/playground` in the browser. Use browser
   Back to return to welcome. Edit visible text in `welcome.tsx`, confirm it
   updates without restarting, then restore the edit.
3. Run `pnpm build:vite` and `pnpm preview:vite`. Confirm welcome and its icon
   render and `/playground` shows Not Found; stop the preview.

Read startup/build diagnostics in the terminal and React/router errors in
browser developer tools (or the operator window's WebView inspector). Vite
retains the existing TanStack development plugin, React Fast Refresh,
Tailwind integration, and TypeScript path aliases.

Maintainer M1–M8 observations remain pending until reported. See the
[walkthrough evidence](docs/foundation-verification.md) for automated tests,
static/build checks, and the available host's package build/launch result.
