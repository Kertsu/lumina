# Foundation verification — 2026-10-22

Work: [#17](https://github.com/Kertsu/lumina/issues/17), following parent
[#11](https://github.com/Kertsu/lumina/issues/11).
Procedure: [maintainer walkthrough](maintainer-workflow.md).
Maintainer M1–M8 acceptance remains pending; the observations below are agent
evidence. Approval of scenarios and passing automated checks do not establish
maintainer runtime acceptance.

## Reproducible starting point

- Latest `main` pulled before work: `92cf62904ed28e68b19bbbbb90197b808c63814b`.
  Prerequisites #15 and #16 were closed.
- macOS 27.0.1 (26A434), arm64 / `aarch64-apple-darwin`.
- Node `v24.11.1`; pnpm `10.30.1`; Rust `1.96.0 (ac68faa20 2026-05-25)`;
  Cargo `1.96.0 (30a34c682 2026-05-25)`; rustfmt and Clippy installed.
- Xcode Command Line Tools at `/Library/Developer/CommandLineTools`;
  Apple Clang `21.0.0 (clang-2100.3.34.2)`, macOS SDK `27.0`, resolved through
  `xcrun --find clang` and `xcrun --show-sdk-version`.
- Equivalent fresh checkout: `git archive HEAD` extracted into the initially
  empty `/private/tmp/lumina-issue-17.a49yCU`, before documentation edits. No
  existing `node_modules`, `target`, `dist`, `.env`, or database copied.
  Dependency download caches were reusable; installation and compilation ran
  anew. No application-data reset was performed.
- The host's pnpm 11 launcher selected a different pnpm in subprocesses and
  failed installation with `ERR_PNPM_IGNORED_BUILDS`. Staging the declared pnpm
  10.30.1 and putting its bin directory first on PATH fixed the environment.
  Clean `pnpm install --frozen-lockfile` then passed; its ignored esbuild script
  warning required no approval or project policy change.

To repeat the clean-source setup from a committed revision on macOS/Linux:

```sh
task_checkout=$(mktemp -d)
git archive HEAD | tar -x -C "$task_checkout"
cd "$task_checkout"
pnpm install --frozen-lockfile
pnpm check
pnpm build:vite
```

Use a normal clone for the M4–M7 `git restore` instructions. An archive has no
Git metadata; during this run each temporary edit was restored from saved
original bytes instead. Keep the clean directory until package inspection is
finished, then remove only that disposable directory if no longer needed.

## Automated tests

| Command | Result |
| --- | --- |
| `pnpm test src/bridge/client.test.ts` | Passed, 16 tests: generated native call, browser fixture, typed code/data, known failures, unknown rejections, diagnostic causes, no fixture fallback |
| `pnpm test src/features/welcome/welcome.test.tsx` | Passed, 4 tests: pending/focusability, fixed browser result, classification across wording, usable UI after unavailable IPC |
| `cargo test -p lumina-app --locked` | Passed, 5 tests plus doctests: startup, retained causes, greeting, public failure serialization |
| `cargo test -p lumina-persistence --test initialization --locked` | Passed, 5 tests using real temporary SQLite files: initialization, bundled FTS5, reopen, newer schema rejection, filesystem/database causes |
| `pnpm check` (full suite, after restoration) | Passed: 23 frontend tests across 3 files, 10 Rust tests, all workspace test/doctest targets; native shell/core currently have no test cases |

No new production UI or tests were needed for this documentation/verification
slice; the existing public seams supply its meaningful coverage.

## Non-test static and build checks

- `pnpm typecheck` and `pnpm build:vite`: passed from the clean dependency tree.
  Build output includes static HTML/JS/CSS, bundled fonts, and the public icon.
- `cargo check -p lumina-app -p lumina-persistence --locked` and native-free
  Clippy with `--all-targets --locked -- -D warnings`: passed. Their dependency
  trees contain no Tauri; persistence uses `rusqlite` with `bundled`.
- `pnpm bindings:generate` twice: identical committed bytes, SHA-256
  `ff2a324411f8e5fe75a1f6e2f38607762e4ed32f8fdc5d7ab828aafea7a2ec94`.
  The headless binary opened no desktop application. Drift/typecheck passed.
- M6 diagnostic probe: renamed consumed Rust `Greeting.message` to `text` and
  its initializer. Drift failed with `Stale Rust bindings` without rewriting
  the committed TypeScript. Regeneration then caused TypeScript errors in
  `src/bridge/client.ts` and `src/features/welcome/welcome.tsx`. Original Rust
  and bindings were restored byte-for-byte; drift/typecheck passed again.
- M7 diagnostic probe: direct `@tauri-apps/api/core` import in the route failed
  Biome with the file/line, `noRestrictedImports`, and the bridge instruction.
  Original route restored byte-for-byte; targeted lint passed.
- Manifest / `cargo tree --depth 1 --locked` inspection matched application →
  core, persistence → application/core, shell → application/persistence. All
  packages inherit workspace lints. Canonical Biome guards match the documented
  paths; relative imports, alternate aliases, and manifest additions still need
  review. No exhaustive graph enforcement is claimed.
- `.github/workflows/checks.yml` inspection: unfiltered push/PR triggers for
  `main`, two independent jobs using `check:frontend` / `check:rust`, declared
  tool versions, frozen pnpm / locked Cargo. Hosted Ubuntu CI was not run here.

## Agent runtime observations

These are separate from automated tests and maintainer acceptance.

- Standalone `pnpm dev:vite`: welcome/icon rendered in the in-app browser at
  `http://localhost:3000/`. **Say hello** displayed the browser fixture and epoch
  `1234`; `/playground` rendered, and Back returned to welcome. A temporary
  visible-text edit appeared through hot reload; original source restored.
- M4's documented route fixture displayed **Application starting** for both
  `Storage is starting` and `Please try again shortly`, retaining code/data.
  Reload was used after changing route composition.
- M5's documented unavailable-desktop fixture displayed **Connection error**;
  repeated clicks stayed usable without fixture success. Vite relayed
  `Lumina desktop greet failed` with the original missing-IPC TypeError/stack.
  The route was restored; standalone Vite was stopped.
- `pnpm dev`: Tauri started its own Vite, compiled/launched the native debug
  executable, printed the managed database path, and reached `managed database
  ready`. Native development-window interaction was not observed in this probe;
  the unbundled executable was unavailable in the native UI automation inventory.
  Ctrl+C stopped the command before packaging.
- `pnpm preview:vite`: the production frontend at `http://localhost:4173/`
  rendered welcome/icon and the browser greeting; `/playground` showed
  **Not Found**. Preview was stopped before package launch.

## Native package and final shared verification

- `pnpm build -- --locked`: exit 0 on the macOS arm64 host above. Tauri ran
  `pnpm build:vite`, compiled the optimized native executable, and finished
  both bundles:
  - `/private/tmp/lumina-issue-17.a49yCU/target/release/bundle/macos/Lumina.app`
  - `/private/tmp/lumina-issue-17.a49yCU/target/release/bundle/dmg/Lumina_0.1.0_aarch64.dmg`
- The DMG is approximately 6.4 MiB; SHA-256
  `dddba110e75e0369e4ee15933b02c47293b33b0582069e4acf2298b9f3540258`.
  This identifies this run's artifact, not a reproducible-binary guarantee.
- After stopping development/preview, TCP probes confirmed no listeners on
  `127.0.0.1:3000` and `127.0.0.1:4173`. Launched
  `./target/release/bundle/macos/Lumina.app/Contents/MacOS/Lumina` from the clean
  checkout. Startup reached `managed database ready`. Native UI observation
  showed welcome/icon, bundled styling, and **Say hello** at `tauri://localhost`.
  Clicking it displayed **Hello world from Rust!** and epoch `1792645741179`.
  The package quit cleanly. The `.app` was launched directly; DMG installation
  was not exercised. No unmet prerequisite blocked this host's build/launch.
- Final `pnpm check`: exit 0, with the test totals above and non-test Biome
  lint/format/import checks, TypeScript, rustfmt, binding drift, and full-workspace
  Clippy (`--all-targets --locked -- -D warnings`) all passing. Checks themselves
  did not start application windows or servers.
- Compared tracked file bytes against the working checkout after fixture
  restoration/build/check: source, generated contracts/router, and both
  lockfiles matched. Only the intended documentation changes remain in the
  implementation branch. Relative documentation link targets and
  `git diff --check` were also checked.

The available host's package build and agent launch are verified. This is not
Windows/Linux qualification, a distribution/signing review, or maintainer M8
acceptance.

## Maintainer acceptance ledger

| Scenario | Maintainer status | Required report |
| --- | --- | --- |
| M1 | Pending | Fresh setup, full checks, operator window, startup/reopen diagnostics |
| M2 | Pending | Browser fixture, navigation, visible edit/hot reload without native processes |
| M3 | Pending | Shared Radix edit on both surfaces, visible focus, Enter/Space, restoration |
| M4 | Pending | Same code/data and label across changed message wording |
| M5 | Pending | Failed IPC remains inspectable; usable UI, no browser-success fallback |
| M6 | Pending | Drift failure, headless generation, affected consumers, restored passing checks |
| M7 | Pending | Prohibited import diagnostic and restored passing checks |
| M8 | Pending | Host/build/package path, launch and Rust greeting with dev server stopped, or exact unmet prerequisite |

When the maintainer reports a result, record their date/host, commands/actions,
observed outcome, and any remaining limitation in this ledger. Do not replace
pending status with agent observations. Windows/Linux packaging, signing,
notarization, distribution, and cross-platform qualification were not verified.
