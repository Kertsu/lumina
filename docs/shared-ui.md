# Shared UI

`src/shared/ui/button.tsx` is editable project source adapted from shadcn's
[Radix Button](https://ui.shadcn.com/docs/components/radix/button). Welcome
uses it for **Say hello** on desktop and browser, preserving its outline
appearance, spacing, layout, and bundled fonts.

## Configuration and ownership

- `components.json` selects `radix-nova` explicitly. `aliases.ui` and
  `aliases.components` point to `@/shared/ui`; `aliases.utils` points to
  `@/shared/ui/utils`. Existing TypeScript `@/*` paths and Vite's TypeScript
  path resolution resolve these locations under `src/`.
- Tailwind v4 uses `src/styles.css` with no Tailwind configuration file.
  `@theme inline` maps semantic utilities to light/dark CSS variables.
  Dark colors follow `prefers-color-scheme`; fonts remain bundled.
- Enabled buttons use a pointer cursor through `@layer base` in
  `src/styles.css`, matching shadcn's `init --pointer` option.
- Button needs only `@radix-ui/react-slot`, `class-variance-authority`, `clsx`,
  and `tailwind-merge`. Local `cn` merges caller class overrides. No aggregate
  Radix, icon, or animation package is installed. `iconLibrary` configures
  future generation; it installs no icons.
- Shared UI stays independent of native integration and application rules.
  Keep capability compositions in their `src/features/` capability.

## Add a component

Preview one component with the pinned CLI and configured Radix style:

```sh
pnpm dlx shadcn@4.22.1 add separator --dry-run
pnpm dlx shadcn@4.22.1 add separator --view
```

The preview resolves aliases and shows source/dependencies without writing.
Direct installation uses `pnpm dlx shadcn@4.22.1 add separator`; review its
dependency changes before committing. Current registry source may import the
aggregate `radix-ui` and `cn` packages. For the minimal approach used by Button,
copy the previewed source to `src/shared/ui/separator.tsx` instead, then run:

```sh
pnpm add @radix-ui/react-separator
```

Use `import * as SeparatorPrimitive from "@radix-ui/react-separator"` for its
primitive and import `cn` from `@/shared/ui/utils`. Install only other packages
the chosen source actually needs. Consult the
[component docs](https://ui.shadcn.com/docs/components/radix/separator) for its
prerequisites and theme tokens. A pinned CLI does not freeze remote registry
contents; inspect previews again after updates.

Consume components through `@/shared/ui/<component>`. Preserve multiline object
literals; export only React components from component files, moving any needed
noncomponent exports to helpers. Verify and commit source plus the lockfile:

```sh
pnpm fix src/shared/ui
pnpm typecheck
pnpm test src/features/welcome/welcome.test.tsx
pnpm lint:ci
pnpm build:vite
```

## Customize source

Edit Button classes/variants directly or pass a local `className` override.
Change shared colors and Tailwind mappings in `src/styles.css`. Keep behavior
in the capability, as Welcome does for pending state and greeting results.
Inspect diffs before permitting a CLI overwrite of customized source.

shadcn source is maintained by the project. In contrast,
`src/bridge/bindings.gen.ts` is read-only IPC output regenerated from Rust with
`pnpm bindings:generate`. The router plugin generates `src/routeTree.gen.ts`.
Neither generated file owns UI styling.

## M3: verify both surfaces

1. Start with a clean `src/shared/ui/button.tsx`, preserving unrelated edits.
2. Run `pnpm dev`. Tab to **Say hello** in the operator window. Confirm visible
   focus and activation with Enter and Space. Check greeting results and that
   the action becomes usable again after a result.
3. Temporarily change Button's default size from `px-4` to `px-8`. Confirm the
   button widens through hot reload. Restore `px-4` and stop desktop.
4. Run `pnpm dev:vite`, open `http://localhost:3000/`, and repeat the edit,
   restoration, keyboard/focus, and greeting checks. Stop Vite.
5. Check `git diff -- src/shared/ui/button.tsx` for leftover temporary edits.

Both commands use port 3000; run them sequentially. Both surfaces import the
same Welcome and Button source. No dependency patch or IPC regeneration is
needed. Welcome tests cover focusability, pending/disabled state, subsequent
activation, browser results, and error recovery. The maintainer reported M3
passing on 2026-10-22, covering its keyboard/focus, hot-reload, and both-surface
checks; see the
[acceptance ledger](foundation-verification.md#maintainer-acceptance-ledger).
