# Lumina

Bible passage selection and projection during gatherings. The current welcome
scaffold runs as a static React, Vite, and TanStack Router frontend in either
Tauri's operator window or a browser.

## Setup

- Node.js 24 (`.node-version`).
- pnpm 10.30.1 (`package.json`'s `packageManager`).
- For desktop development/builds: Rust and the platform's
  [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On macOS,
  install Xcode Command Line Tools; Windows needs Microsoft C++ Build Tools
  and WebView2; Linux needs the distribution's WebKitGTK and build packages.

```sh
pnpm install --frozen-lockfile
```

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
There is no server-rendering process or native-command consumer in this slice.

## Frontend responsibilities

| Location | Owns |
| --- | --- |
| `index.html` | Document metadata and the application mount element |
| `src/app/main.tsx` | Global styles, React mounting, and router composition |
| `src/app/router.tsx` | Router construction, options, and registered route types |
| `src/routes/` | Route entry points, nesting, and the playground environment gate |
| `src/features/welcome/welcome.tsx` | Welcome UI, consumed through its exported `Welcome` component |
| `src/routeTree.gen.ts` | Generated route tree; Vite regenerates it when routes change |
| `src/styles.css`, `public/` | Shared styling, bundled fonts, and static assets |
| `vite.config.ts`, `src-tauri/tauri.conf.json` | Frontend tooling and desktop entry/output wiring |

Use `@/` imports across frontend modules. Keep related capability UI, interaction
hooks, and tests together under `src/features/`. Routes compose capabilities;
they do not own product workflows. Add real modules as responsibilities arise.

Typed native integration/browser fixtures under `src/bridge/` and editable
shared UI under `src/shared/ui/` belong to dependent foundation tickets. Their
directories are not created until implemented. React owns interaction state;
accepted application state belongs to Rust. See the agreed
[architecture](docs/architecture.md) and [domain glossary](GLOSSARY.md).

## Verify and debug

```sh
pnpm typecheck
pnpm lint:ci
pnpm test
pnpm build:vite
```

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

Maintainer runtime observations remain pending until reported. Final
host-specific package build/launch verification belongs to the foundation
walkthrough ticket; a static build alone does not establish that result.
