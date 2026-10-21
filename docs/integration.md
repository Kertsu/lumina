# Typed application integration

## Trace a call

1. `Welcome` in `src/features/welcome/welcome.tsx` owns button/pending/result
   interaction state. **Say hello** calls `ApplicationClient.greet()`.
2. `src/bridge/client.ts` chooses the desktop adapter when Tauri's `isTauri()`
   reports a native host, otherwise the browser-fixture adapter. Tests or a
   temporary development composition can explicitly select either factory.
   Selection happens before invocation; a failed desktop call stays a failure.
3. The desktop adapter calls `commands.greet()` from `bindings.gen.ts`.
   Only the bridge imports native APIs or generated command wrappers.
4. `greet` in `src-tauri/src/lib.rs` calls `DesktopRuntime.call`, whose blocking
   worker accesses the initialized application and managed SQLite connection.
5. `Application::greet` in `crates/lumina-app/src/lib.rs` constructs `Greeting`
   using the supplied host time. Rust owns the operation; this scaffold does
   not add a product workflow or store greeting history.
6. The desktop adapter returns a `ClientResult<Greeting>`. React renders the
   generated `message` and `epochMs` fields, or classifies failure by code/data.

The browser adapter returns fixed representative state through exactly the same
`ApplicationClient`. It does not initialize storage, implement Rust rules, or
simulate state transitions. Its distinct greeting identifies fixture operation.

## Contracts and diagnostics

`crates/lumina-app/src/failure.rs` is the sole public failure definition/code
catalog. Explicit Serde renames stabilize wire codes independently of Rust
variant names. The generated discriminated union associates each code with its
payload. Messages are display text; there are no HTTP status fields.

Runtime startup failures become `APPLICATION_UNAVAILABLE` with typed `state`
(`starting` or `failed`). Clock, poisoned-lock, and blocking-worker failures
become `INTERNAL_ERROR`. The shell reports the internal error and source chain
before exposing display-safe public text. Storage startup also reports its
original filesystem/SQLite causes in the terminal running `pnpm dev`.

The frontend bridge validates unknown rejection shapes, including per-code
payloads. Unrecognized values become the Rust-defined `INVOCATION_FAILED` with
the command in typed data. Its result retains the original rejection in
`diagnostic.cause`; the developer console logs the command and original value.
Known failures retain their code/data/message and diagnostics. Inspect the
terminal for Rust causes and the browser/WebView console for IPC causes.
No message parsing or unknown-to-application-failure cast is used.

## Regenerate and check

```sh
pnpm bindings:generate
pnpm typecheck
pnpm bindings:check
```

Versions are pinned to `tauri-specta =2.0.0-rc.25`, `specta =2.0.0-rc.25`, and
`specta-typescript =0.0.12`; `Cargo.lock` pins transitive dependencies. These
released prereleases are compatible according to the
[upstream setup](https://github.com/specta-rs/tauri-specta/blob/v2.0.0-rc.25/src/lib.rs).

`src-tauri/src/bindings.rs` owns one registration used by both `run()` and the
headless `bindings` binary. Generation compiles the desktop crate, requiring
native build prerequisites, but never constructs an application, opens a
window, initializes SQLite, or starts Vite. It runs only through the explicit
commands; ordinary startup does not rewrite contracts.

`scripts/bindings.mjs` exports to a fresh temporary directory. The pinned Biome
formatter normalizes the export. Generate copies
those deterministic bytes to `src/bridge/bindings.gen.ts`; check compares them,
reports missing/stale output, exits nonzero, and leaves committed files alone.
Temporary output is removed in either mode. Generated source is excluded from
Biome, like the generated router tree. Keep handwritten bridge code editable.

There are no application events yet. The shared registration explicitly has an
empty event set and mounts it at startup. When an actual event is designed,
derive its Rust Specta/Event types, register it there, regenerate, and keep
subscriptions inside the bridge. This foundation defines no product event or
synchronization protocol.

## M2: browser fixture

Stop the desktop process. Run `pnpm dev:vite`, open `http://localhost:3000/`,
and click **Say hello**. Expect **Hello world from the browser fixture!** and
**Current epoch: 1234**. Stop Vite with Ctrl+C. For desktop, run `pnpm dev` and
click the same button; expect the Rust greeting and current epoch. If clicked
before startup, retry once storage is ready.

## M4: stable classification across message changes

Begin with a clean `src/routes/index.tsx`, preserving any unrelated edits.
Temporarily replace its contents with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { createBrowserClient } from "@/bridge/client";
import { Welcome } from "@/features/welcome/welcome";

const fixture = createBrowserClient({
    status: "error",
    error: {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Storage is starting",
        data: {
            state: "starting",
        },
    },
});

export const Route = createFileRoute("/")({
    component: () => <Welcome client={fixture} />,
});
```

Run `pnpm dev:vite`, open `/`, click **Say hello**, and observe **Application
starting** plus the display message. Change only `message` to **Please try
again shortly**, reload, and click again. Classification remains **Application
starting** with identical code/data; only wording changes. This same temporary
composition can be used with `pnpm dev` after stopping browser Vite.

Restore with `git restore -- src/routes/index.tsx`, then reload and click to
confirm the normal greeting. Stop Vite. Do not commit the temporary fixture.
The colocated welcome tests exercise both wordings; bridge tests/typechecking
also verify generated code/data discrimination.

## M5: unexpected desktop invocation rejection

Begin with a clean `src/routes/index.tsx`. Keep the desktop process stopped.
Temporarily replace that route with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { createDesktopClient } from "@/bridge/client";
import { Welcome } from "@/features/welcome/welcome";

const unavailableDesktop = createDesktopClient();

export const Route = createFileRoute("/")({
    component: () => <Welcome client={unavailableDesktop} />,
});
```

Run `pnpm dev:vite`, open `/`, and click **Say hello**. The real generated
invocation has no desktop IPC and rejects. Expect **Connection error**, an
`INVOCATION_FAILED` result in `normalizeFailure` (set a devtools breakpoint to
inspect `error.data.command` and `diagnostic.cause`), and **Lumina desktop greet
failed** with the original exception in the console. The button becomes usable
again; clicking it again remains a failure, with no successful browser greeting.
Bridge tests also exercise Error, string, null, and malformed-public rejections.

Restore with `git restore -- src/routes/index.tsx`, reload, and click again to
confirm the normal browser fixture. Stop Vite. Do not commit the temporary edit.

## M6: consumed incompatible contract

Begin with clean Rust/generated files and passing `pnpm bindings:check`.

1. In `crates/lumina-app/src/lib.rs`, rename `Greeting.message` to `text` and
   rename the corresponding initializer field in `Application::greet`. Leave
   React, browser fixtures, and tests untouched.
2. Run `pnpm bindings:check`. Expect the stale-output diagnostic and nonzero
   exit; the committed TypeScript must remain unchanged.
3. Run `pnpm bindings:generate`. No desktop window should open.
4. Run `pnpm typecheck`. Expect errors at consumers still using `message`,
   including the welcome view and browser fixture. Rust unit tests still refer
   to the old field too; this is a deliberately incomplete contract edit.
5. Restore both declarations and generated output:
   `git restore -- crates/lumina-app/src/lib.rs src/bridge/bindings.gen.ts`.
6. Run `pnpm bindings:check` and `pnpm typecheck` again; both must pass.

These restoration commands assume this implementation has been committed and
these files were clean at the start. Preserve any existing local work first.

## Automated checks and observation status

```sh
pnpm test src/bridge/client.test.ts
pnpm test src/features/welcome/welcome.test.tsx
pnpm typecheck
cargo test -p lumina-app --locked
```

Application tests remain native-free. Bridge tests use Tauri's IPC test boundary;
React tests use the actual client with representative fixtures or unavailable
IPC. Full-suite commands remain in the README. M2/M4/M5/M6 runtime observations
remain pending until the maintainer runs and reports them; automated checks do
not establish native window or browser observations.
