# Establish Lumina's maintainable Rust and React foundation

Status: approved foundation implemented. Agent verification is recorded in
[foundation verification](../foundation-verification.md); the maintainer reported
M1–M8 passing on 2026-10-22. Approval of scenarios alone does not complete acceptance.

Implementation issue: [#11](https://github.com/Kertsu/lumina/issues/11).

## Problem Statement

Lumina's maintainer wants to understand, debug, and change both stacks personally without relying on coding agents. The current project is an exploratory Tauri and React scaffold: application responsibilities are not separated, the frontend carries unnecessary server-framework machinery, native contracts are not generated, and CI checks only frontend formatting and types.

Implementing product features on this foundation would make code placement, dependency ownership, cross-stack changes, and verification inconsistent. The maintainer needs an understandable codebase structure and a small, dependable developer workflow before feature work begins.

## Solution

Establish the agreed Rust and React foundation with explicit responsibilities, predictable module locations, typed integration, and one verification workflow. A maintainer should be able to locate a change, trace a call across the stacks, edit the relevant module, regenerate any affected contracts, and verify the result using documented commands.

Deliver a working minimal desktop and browser-development scaffold, the agreed crate and frontend organization, Radix-backed shadcn/ui integration, code-based application errors, bundled SQLite infrastructure, and human-facing development guidance. Preserve existing approved requirements while keeping detailed feature design outside this work.

## User Stories

1. As the maintainer, I want a short responsibility map for both stacks, so that I can find the right code without asking an agent.
2. As the maintainer, I want domain types and rules separated from desktop and database dependencies, so that I can understand and change domain code independently.
3. As the maintainer, I want application use cases and authoritative application state to have one clear owner, so that orchestration is not duplicated across React and Rust.
4. As the maintainer, I want SQLite details isolated in persistence, so that database changes have a predictable home.
5. As the maintainer, I want IPC and native window integration isolated in the desktop shell, so that framework details stay out of application code.
6. As the maintainer, I want explicit startup wiring, so that I can see how application interfaces receive their implementations.
7. As the maintainer, I want small public module interfaces, so that ordinary changes do not require understanding unrelated implementation details.
8. As the maintainer, I want related frontend UI, hooks, and tests grouped by capability, so that a change stays easy to navigate.
9. As the maintainer, I want routes and screen composition kept distinct from capability implementations, so that navigation code remains easy to follow.
10. As the maintainer, I want one typed frontend access point for Rust, so that native integration is not scattered through UI code.
11. As the maintainer, I want reusable UI primitives independent of application rules, so that visual changes do not affect native or domain behavior.
12. As the maintainer, I want Radix-backed shadcn/ui source to be editable project code, so that I can customize shared UI directly.
13. As the maintainer, I want frontend interaction state distinguished from Rust-owned application state, so that each kind of change has an obvious owner.
14. As the maintainer, I want browser development through the same frontend interface, so that I can work on UI without starting the desktop runtime.
15. As the maintainer, I want browser fixtures limited to representative UI states, so that I do not maintain a second application implementation.
16. As the maintainer, I want Rust-owned command, event, and error contracts generated into TypeScript, so that cross-stack types remain synchronized.
17. As the maintainer, I want explicit binding regeneration and a drift check, so that stale generated code is caught before a change is merged.
18. As the maintainer, I want generated contracts distinguished from editable UI source, so that I know which files to modify directly.
19. As the maintainer, I want every public application failure to carry a stable required error code, so that UI logic does not depend on message wording.
20. As the maintainer, I want error data typed for its code, so that callers can use metadata without unsafe casts or an untyped payload convention.
21. As the maintainer, I want internal error causes retained and unexpected IPC failures handled centrally, so that debugging remains useful without leaking implementation details throughout the UI.
22. As the maintainer, I want bundled SQLite and application-owned database access, so that behavior does not depend on the developer machine's SQLite installation.
23. As the maintainer, I want database operations and migrations owned by persistence, so that SQL and storage maintenance stay together.
24. As the maintainer, I want one documented execution boundary for blocking database work, so that desktop responsiveness does not depend on each command inventing its own arrangement.
25. As the maintainer, I want lightweight dependency guardrails, so that obvious architectural mistakes are caught without another tooling subsystem.
26. As the maintainer, I want the limits of those guardrails documented, so that I know what still needs review.
27. As the maintainer, I want one routine check command shared with CI, so that local verification matches the merge checks.
28. As the maintainer, I want individual checks available, so that I can iterate quickly on one stack or module.
29. As the maintainer, I want application and persistence tests runnable independently of Tauri, so that native setup is unnecessary for those changes.
30. As the maintainer, I want persistence integration tests against real temporary SQLite databases, so that SQL and bundled capabilities are verified directly.
31. As the maintainer, I want React tests beside their modules, so that relevant verification is easy to discover while editing UI.
32. As the maintainer, I want declared tool versions, committed lockfiles, and documented native prerequisites, so that a fresh setup is reproducible.
33. As the maintainer, I want a static packaged frontend that starts without a development server, so that the simplified frontend remains suitable for Tauri distribution.
34. As the maintainer, I want CI to cover Rust-only and cross-stack changes, so that native changes do not bypass verification.
35. As the maintainer, I want a concise run/build/check and debugging guide, so that I can maintain the code after time away from the project.

## Implementation Decisions

### Scope and code organization

- Implement the engineering foundation described here; keep the existing minimal application usable throughout the restructuring.
- Use plain structs/functions, explicit dependencies, and capability-sized integration interfaces. Add modules as actual responsibilities require them, keeping the initial structure small.
- Keep the current approved domain vocabulary and architectural constraints. Do not convert prior unanswered feature-level interview suggestions into requirements.

### Rust crates and dependency direction

- Use a Cargo workspace containing three libraries and the existing desktop shell.
- `lumina-core` owns domain types, invariants, and pure rules. It stays independent of application orchestration, SQLite, and Tauri.
- `lumina-app` owns use cases, authoritative application state, public application failures, and storage/native interfaces. It depends on `lumina-core` and stays independent of concrete SQLite and Tauri implementations.
- `lumina-persistence` owns SQLite operations, transactions, and migration implementation. It implements storage interfaces owned by `lumina-app` and uses domain types from `lumina-core`.
- The desktop shell owns startup wiring, typed IPC, native adapters, and desktop runtime integration. It constructs and connects application and persistence/native implementations.
- Dependency direction is application to domain, persistence to application/domain, and desktop shell to application/persistence. Application code does not depend on the concrete persistence adapter.
- Keep one explicit composition root. Avoid a mandatory controller/handler/service/repository/mapper chain or a generic dependency-injection framework.

### Frontend organization and UI

- Replace the exploratory TanStack Start and Nitro integration with a static React, Vite, and TanStack Router frontend.
- Retain the existing useful router, styles, assets, and developer tooling as they are adapted to the agreed foundation.
- Organize frontend modules around startup/composition, route entry points, capability implementations, typed native integration, and reusable UI.
- Keep related capability UI, local interaction hooks, and tests together. Expose small public interfaces and keep consumers out of module internals.
- React owns interaction state and renders accepted Rust application state; it does not duplicate authoritative application transitions.
- Route native calls and subscriptions through the typed frontend bridge. Shared UI stays independent of capability rules and native access.
- Use Radix-backed shadcn/ui. Keep its editable source in the shared UI module, configure generator aliases to the chosen organization, and retain capability-specific compositions with their capability.
- Supply browser fixtures through the same frontend interface for UI development. They provide representative states rather than reproducing application rules. Desktop transport failure must remain distinguishable from successful browser-fixture operation.

### Typed integration and standardized errors

- Use `tauri-specta` for Rust-owned command, event, and error contracts, with compatible released versions pinned during setup.
- Commit generated TypeScript with the bridge and treat it as generated output. Reuse the application's command/event registration for deterministic generation without launching a desktop window.
- Provide explicit regeneration and generated-contract drift commands. Detect stale output in CI and typecheck consumers.
- Own one public application failure contract in `lumina-app`. Its required stable `errorCode` identifies the failure, `message` is human-readable display text, and any `data` is typed for that particular code.
- Define code variants and payloads together and generate the TypeScript representation from that Rust definition. Maintain one code catalog rather than separate Rust and frontend lists.
- Preserve code values when internal symbols or message wording change. UI branches use codes, never parsed message text.
- Keep appropriate internal typed errors and diagnostic causes. Translate them deliberately at integration seams; serialize the public contract through the desktop adapter and handle unexpected invocation/transport failures centrally in the frontend bridge.
- Preserve useful diagnostic context without blind casts of unknown rejections into known application failures. The public contract carries no HTTP status.

### Persistence and blocking work

- Use one application-managed SQLite database for installed Bible content/indexes and persistent application data, respecting the already agreed storage ownership.
- Use `rusqlite` with bundled SQLite inside `lumina-persistence`; keep connection and row types out of application/domain interfaces.
- Keep synchronous storage operations behind one identifiable desktop-runtime integration path that runs blocking work away from the native UI thread. Make connection/task ownership explicit without introducing a job framework.
- Own SQL and migration implementation in persistence. Establish the migration integration needed by the foundation; leave product schemas and data algorithms to their features.
- Verify FTS5 through the actual bundled dependency/build path, not a system SQLite executable.

### Dependency guardrails, checks, and documentation

- Prefer Cargo declarations, Rust visibility, and existing Biome import restrictions for a small useful set of dependency checks.
- Confine direct native imports to the bridge and use a documented canonical cross-module import convention for frontend rules.
- Document that simple import restrictions match written paths and do not prove complete resolved module privacy. Keep manifest changes and uncovered cases reviewable instead of adding comprehensive custom graph analysis.
- Correct Rust lint inheritance so declared workspace/package policies are actually applied. Preserve compatible existing frontend lint and formatting conventions.
- Provide `pnpm check` for frontend lint/typechecking/tests, Rust formatting/Clippy/tests, and generated-contract drift. CI runs the same verification and covers Rust-only changes.
- Preserve individual formatter, linter, typecheck, and test commands; provide `pnpm bindings:generate` and `pnpm bindings:check` alongside desktop/browser development and packaged-build commands.
- Preserve declared Node/pnpm versions and both lockfiles, pin the Rust toolchain, and document native build prerequisites.
- Keep Rust unit tests beside modules, Rust integration tests with their crate, React tests beside their capability, and native integration checks with the desktop shell. Application/persistence verification runs independently of Tauri; persistence integration uses real temporary databases.
- Provide a concise human-facing guide covering responsibilities, dependency directions, startup and integration entry points, generated versus editable code, commands, test locations, and normal diagnostics.

## Verification Decisions

The maintainer approved these acceptance scenarios and planned checks. Their
current evidence and reporting status live in the
[verification record](../foundation-verification.md); the scenarios below are
requirements, not completed verification results.

### Maintainer manual scenarios

| ID | Starting condition | Action | Expected observable result |
| --- | --- | --- | --- |
| M1 | A checkout with the documented prerequisites and dependencies | Follow the setup guide, run `pnpm check`, then `pnpm dev` | Checks finish successfully and the native operator window renders the minimal foundation UI; startup diagnostics contain no unexplained errors |
| M2 | No desktop process is running | Run `pnpm dev:vite`, open the documented browser entry, and edit visible frontend text | The same frontend interface renders representative fixture state without native globals; navigation and hot reload work without a separate backend |
| M3 | The foundation UI uses an installed shared Radix-backed component | Temporarily edit a visible style in its editable source, observe desktop/browser, then restore the edit | Both surfaces reflect the source change; ordinary keyboard/focus interaction remains usable where the installed primitive is interactive; no dependency patch or generated-file edit is needed |
| M4 | A development/test fixture supplies a defined public failure | Exercise the same frontend handling twice with identical error code/data but different message wording | Code-based classification stays the same and only display wording changes; verify code/data type discrimination separately through automated checks |
| M5 | A development/test fixture makes a desktop invocation reject unexpectedly | Exercise the bridge call with unavailable or failed IPC | The bridge exposes an inspectable code-based failure, the foundation UI remains usable, and ordinary diagnostics retain useful context; it does not silently present successful browser-fixture data |
| M6 | Generated contracts match the Rust declarations | Temporarily make an incompatible change to an exported contract consumed by the foundation, run `pnpm bindings:check`, regenerate, and typecheck; restore both Rust and generated output afterward | The drift check fails with a clear stale-output diagnostic; generation opens no desktop window; regeneration updates types and typechecking identifies affected callers |
| M7 | The documented import guards are enabled | Temporarily add a prohibited direct native import outside the bridge using the supported import convention; run the check and then restore the edit | A diagnostic identifies the offending location and rule; checks pass again after restoration; the guide accurately states unsupported relative-path/alternate-alias cases |
| M8 | The available native host has its documented packaging/build prerequisites; this is a conditional host check | Build a local package and launch it with the development server stopped | The packaged static foundation UI launches successfully; record the host/build/result without claiming other platform configurations were verified |

Use existing minimal views and development/test fixtures for these checks. Document reproducible fixture activation, invocation, and restoration steps for M4/M5, using the existing development harness or temporary source edits. Do not add a production failure panel, product workflow, or redundant UI component solely to demonstrate verification. If the available host cannot perform M8, report the unmet prerequisite and leave that manual result pending.

### Agent-run checks

- Run frontend lint, formatting checks, TypeScript checking, Rust formatting, Clippy, and the shared verification command.
- Regenerate contracts deterministically and check for drift without opening the desktop application; confirm regeneration and ordinary verification have clear, separate roles.
- Build the static frontend. Build the native package when the available host has the documented packaging prerequisites; otherwise record the unmet prerequisite and leave that host check unverified.
- Inspect Cargo dependency output/manifests and implemented frontend rules against the approved dependency direction. Report the actual coverage of enforcement instead of claiming exhaustive architectural proof.
- Confirm application and persistence checks can run independently of Tauri and that normal verification does not launch application windows.
- Follow the development guide and trace the minimal foundation integration through the frontend bridge, desktop handler, application, and the relevant domain/storage interface.
- Run meaningful automated tests for the foundation interfaces: public error serialization and code/data discrimination, bridge normalization of unexpected failures, and persistence initialization/migration integration plus bundled FTS5 availability where introduced.
- Use real temporary SQLite databases for persistence integration. Use the existing React testing tools for meaningful integration/interaction coverage introduced by the scaffold. Avoid folder-name tests, implementation-mirroring tests, coverage quotas, and tests for unimplemented product features.
- Report automated tests, non-test static/build checks, and manual observations separately. Manual verification remains pending until the maintainer reports its result.

### Completion criteria

- The agreed workspace/frontend organization is implemented and dependency ownership is reflected in real code and configuration.
- Desktop and browser development entry points work through their intended adapters, the static frontend builds, and the documented native package command is implemented. Record the conditional native package build/launch result or the host limitation that leaves it unverified.
- Rust-owned contracts and the required-code error standard are usable through the minimal integration and generated frontend types.
- The shared check command and CI cover both stacks and generated-contract drift, with individual checks still runnable.
- The maintainer can follow the guide to locate, trace, change, regenerate, and verify the foundation without an agent.
- Report the result of each agent check and the pending/reported state of M1-M8. Pending manual observations are not completed acceptance evidence.

## Out of Scope

- Implementing Bible import, reference lookup, search, projection, operator workspace/history behavior, appearance workflows, or other MVP product features.
- Defining detailed product schemas, duplicate-import fingerprints, search ranking, import publication algorithms, delivery acknowledgments, state synchronization protocols, timeouts, retries, or overlapping-action policies.
- Changing existing approved MVP requirements or treating earlier unanswered feature-policy recommendations as accepted decisions.
- Mobile/remote audience support, annotations, reading plans, hosted services, or additional product capabilities suggested by external research.
- Enterprise-style abstraction frameworks, generic repositories, command buses, a durable job framework, or a custom comprehensive dependency-analysis subsystem.
- A new visual design, production diagnostics interface, or exhaustive UI component installation.
- Cross-platform release qualification, physical multi-display rehearsal, signing/distribution automation, or performance benchmark commitments.

## Further Notes

This is an engineering foundation specification. Its user stories describe maintainer outcomes rather than end-user product features. The primary outcome is a codebase the maintainer can understand and change personally over time.

At approval, the project was an exploratory scaffold. The Rust workspace,
persistence driver, shared code-based error contract, generated bridge, shared
verification command, and static frontend are now implemented. CI runs the
frontend and Rust/contracts verification groups. Product features remain outside
this foundation. The maintainer reported M1–M8 passing; attribution and scope
are recorded in the verification ledger.

The architecture guide and associated ADRs prepared during the design session must accompany the implementation so a fresh checkout has the rationale and responsibility map. Keep this issue self-contained; it does not depend on unpublished chat transcripts or external AI-share pages. Preserve existing local documentation changes when beginning implementation.

Specific feature interfaces, failure-code catalogs, storage schemas, and protocol mechanics follow their respective feature designs. They are not prerequisites for completing this foundation.
