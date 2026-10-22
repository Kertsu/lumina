# Shared verification

For fresh setup and the complete M1–M8 rehearsal, start with the
[maintainer walkthrough](maintainer-workflow.md). The final
[foundation verification record](foundation-verification.md) separates tests,
static/build checks, agent observations, and pending maintainer acceptance.
The slice-specific agent record below remains historical evidence for #16.

Run `pnpm install --frozen-lockfile`, then `pnpm check`. It runs the frontend
group followed by the Rust/contracts group, stopping at the first failure.
`.github/workflows/checks.yml` runs the same groups in two independent,
parallel jobs on every push to `main` and every PR targeting `main`:

| GitHub job | Shared local/CI command | Scope |
| --- | --- | --- |
| Frontend | `pnpm check:frontend` | Biome lint/format/import guards, TypeScript, React/router/bridge tests |
| Rust and contracts | `pnpm check:rust` | Rust formatting, binding drift, Clippy, Rust tests/doctests |

There are no path exclusions or job dependencies. Rust-only and cross-stack
changes receive both checks; failure in one job does not skip the other.
Frontend needs only Node/pnpm. Rust/contracts also needs the pinned Rust
toolchain and native compile prerequisites because binding generation compiles
the desktop crate. Keeping contracts with Rust avoids a separate job compiling
the same crate. Workflow-level concurrency cancels older runs on the same ref
without making the two jobs cancel each other.

CI uses Ubuntu 24.04, Node from `.node-version`, pnpm from `packageManager`,
and Rust with Clippy/rustfmt from `rust-toolchain.toml`. `rustup toolchain
install --no-self-update` installs the active toolchain and its declared
components, without relying on implicit installation. See the
[Rustup guidance](https://blog.rust-lang.org/inside-rust/2026/07/03/rustup-update-1.30/).
Frontend installation uses `pnpm-lock.yaml`; Cargo compilation
uses `Cargo.lock` with `--locked`.

Both pnpm setup steps set `NPM_CONFIG_AUDIT=false` only while installing the
action's helper. The action runs `npm ci` for that helper; this avoids its
additional audit request during bootstrap. Project installation and the seven
verification commands are unchanged.

After installing the Rust toolchain, CI restores Cargo downloads and compiled
dependency artifacts with the pinned `Swatinem/rust-cache` action. Its default
keys include compiler, manifest, lockfile, and Rust environment inputs.
Workspace code is rebuilt; cached dependencies never skip verification.
The first successful run populates the cache. PR caches are reused within
that PR; caches created by pushes to `main` can seed subsequent PRs. Toolchain
and dependency changes can require fresh compilation. Cache storage uses the
repository's existing GitHub Actions cache allowance.

The workflow installs `build-essential`, `pkg-config`, `libwebkit2gtk-4.1-dev`,
`libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev`
for the desktop crate's native compilation. See the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for other hosts.
Neither full verification nor headless contract generation starts Vite,
constructs an application, or opens an application window. Checks leave source
and generated contracts unchanged; build caches and disposable test databases
are expected.

## Commands and diagnostics

`pnpm check:frontend` runs the first three commands below in order;
`pnpm check:rust` runs the remaining four. Each group stops at its first
failure. `pnpm check` runs both groups sequentially for local verification.

| Command | Purpose and normal failure location |
| --- | --- |
| `pnpm lint:ci` | Biome formatting, lint, and import organization; file/line/rule in terminal |
| `pnpm typecheck` | TypeScript consumers; file/line/type error in terminal |
| `pnpm test` | All React/router/bridge tests; test file, name, and assertion in terminal |
| `pnpm rust:fmt` | Rust formatting without writes; file diff in terminal |
| `pnpm bindings:check` | Compare temporary generated contracts to committed output; stale-output message in terminal |
| `pnpm rust:clippy` | All workspace targets, locked dependencies, warnings denied; Rust file/line/lint in terminal |
| `pnpm rust:test` | All workspace Rust tests and doctests; crate/test name and assertion in terminal |

Individual commands remain available. Examples:

```sh
pnpm check:frontend
pnpm check:rust
pnpm lint src/routes/index.tsx
pnpm typecheck
pnpm test src/features/welcome/welcome.test.tsx
cargo check -p lumina-app -p lumina-persistence --locked
cargo test -p lumina-app --locked
cargo test -p lumina-persistence --test initialization --locked
cargo clippy -p lumina-app -p lumina-persistence --all-targets --locked -- -D warnings
```

The crate-specific commands above build no Tauri dependency. Persistence
integration tests observe `SqliteStorage` through its public interface using
real temporary SQLite files, including bundled FTS5 and migration behavior.
Keep tests at the existing application, persistence, bridge, and React seams.

Repairs are explicit: `pnpm fix` writes frontend formatting/lint fixes;
`cargo fmt --all` writes Rust formatting. For changed Rust contracts, run
`pnpm bindings:generate`, then `pnpm typecheck` and `pnpm bindings:check`.
`pnpm build:vite` separately checks the static production build.

## Canonical imports and actual guards

Use `@/` across frontend modules; use relative imports inside a feature or
inside the bridge. Public entry points are:

| Consumer import | Public surface |
| --- | --- |
| `@/features/welcome` | `src/features/welcome/index.ts` exports `Welcome` |
| `@/bridge/client` | Typed client, adapter factories, application result/types |
| `@/shared/ui/button` | Editable shared Button component |
| `@/shared/ui/utils` | Shared styling helper |

Add a small `index.ts` when a new feature needs a public interface. Other
modules consume that entry point; colocated tests may import their own module
relatively. Shared UI files are individually public; no shared barrel is needed.

`biome.json` enables `lint/style/noRestrictedImports` as an error:

- Outside `src/bridge/`, reject `@tauri-apps/**`, including core APIs, events,
  mocks, and plugins. Use the typed client instead.
- Outside the bridge, reject `@/bridge` and `@/bridge/**` except the exact
  `@/bridge/client` public path. Generated wrappers stay inside the bridge.
- Outside the bridge, reject deep `@/features/*/**` imports. Routes and other
  features use the public feature entry point.
- In `src/shared/ui/`, also reject all canonical bridge, feature, app, and
  route imports. Shared primitives stay independent of application composition.

These are restrictions on **written import paths**, using Biome's existing
[import restriction rule](https://biomejs.dev/linter/rules/no-restricted-imports/).
They do not resolve a complete dependency graph or prove module privacy.
Relative cross-module paths, alternate aliases, computed imports, new public
exports, bridge dependencies, and crate-manifest additions still need review.
Generated binding/router files remain excluded from Biome. Review exclusions
and rule suppressions too; this is a small guard set, not a security boundary.

## Rust dependency and lint inspection

Every workspace package contains `[lints] workspace = true`. Clippy receives
the workspace's `unsafe_code = "forbid"`, denied Clippy groups, and specific
lint policies; `pnpm rust:clippy` additionally denies all warnings.
`clippy.toml` limits duplicate-version exceptions to documented upstream crates.

Inspect dependencies when changing manifests:

```sh
cargo metadata --no-deps --format-version 1 --locked
cargo tree -p lumina-app -p lumina-persistence --depth 1 --locked
cargo tree -p Lumina --depth 1 --locked
```

The current local edges are application → core, persistence → application/core,
and shell → application/persistence. Application has no SQLite or Tauri
dependency. `failure`, `migrations`, `bindings`, and `runtime` modules remain
private or crate-visible; public interfaces expose their intended types.
Rust visibility rejects external access to private items, and Cargo requires
declared dependencies and rejects dependency cycles. Neither prevents every
forbidden new manifest edge. Review dependency additions against
[ADR-0008](adr/0008-separate-application-library-from-tauri.md); do not infer
architecture enforcement from a passing Clippy run alone.

## M7: prohibited import and restoration

Start with passing `pnpm check` and a clean `src/routes/index.tsx`. Preserve
unrelated work before using restoration commands.

1. Temporarily add `import "@tauri-apps/api/core";` to that route.
2. Run `pnpm check`. Expect failure in Biome with the offending file/line,
   `lint/style/noRestrictedImports`, and the instruction to use `@/bridge/client`.
3. Remove only that temporary import (or `git restore -- src/routes/index.tsx`
   if the file was clean). Run `pnpm check` again; it must pass.
4. To probe other supported guards, temporarily import
   `@/bridge/bindings.gen` or `@/features/welcome/welcome` in the route, or
   `@/bridge/client` / `@/features/welcome` in a shared UI file. Run
   `pnpm lint <file>`, expect the same rule and a boundary-specific diagnostic,
   then restore each temporary edit.

For consumed-contract drift through the same command, follow
[M6](integration.md#m6-consumed-incompatible-contract), using `pnpm check`
at step 2. Drift runs before Rust tests so it reports the stale generated
contract before incomplete contract edits reach their test consumers.
Checking must leave committed bindings unchanged; regeneration is separate.

## Agent verification: 2026-10-22

On macOS arm64, `pnpm check` passed: 23 frontend tests, 10 Rust tests,
doctests, lint/format checks, TypeScript, contract drift, and workspace Clippy.
Hashes of tracked source files were unchanged afterward. The static production
build and native-free application/persistence Clippy and persistence tests passed.

All 15 temporary import probes behaved as expected: 11 prohibited paths failed
with file/line/rule diagnostics; four public/bridge imports passed. A native
import in the real route failed through `pnpm check`. Renaming the consumed
Rust `Greeting.message` field failed through the same command with the stale
binding diagnostic, without rewriting committed bindings. Explicit regeneration
then exposed TypeScript consumer errors. All fixture edits were restored;
bindings, types, and the full shared command passed afterward.

Manifests and `cargo tree` matched the documented local dependency direction.
A temporary unsafe function in core failed under inherited `-F unsafe-code`,
then was restored. Workflow YAML and unfiltered push/PR triggers were inspected.

The full command passed again after splitting CI into frontend and
Rust/contracts jobs. Workflow inspection confirmed independent jobs, run-level
concurrency, unchanged prerequisites/triggers, and the same seven checks shared
with local verification.

Maintainer M7 and other runtime acceptance remain pending until reported.
Hosted Ubuntu CI and native/package launch were not run in this local check.
