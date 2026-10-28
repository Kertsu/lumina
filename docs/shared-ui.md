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
  It imports `src/themes/default.css` for the paired application palette and
  maps all 32 color roles to semantic utilities through `@theme inline`.
  Dark colors follow `prefers-color-scheme`; fonts remain bundled and separate
  from palette values.
- Enabled buttons use a pointer cursor through `@layer base` in
  `src/styles.css`, matching shadcn's `init --pointer` option.
- Button needs only `@radix-ui/react-slot`, `class-variance-authority`, `clsx`,
  and `tailwind-merge`. Local `cn` merges caller class overrides. No aggregate
  Radix, icon, or animation package is installed. `iconLibrary` configures
  future generation; it installs no icons.
- Shared UI stays independent of native integration and application rules.
  Keep capability compositions in their `src/features/` capability.

The workspace tab menu is composed in `src/features/lumina/workspace-tab-menu.tsx`.
One action list supplies the native desktop popup through `@/bridge/client`
and the Radix browser preview. Right-click and Shift+F10 use the same actions;
renaming, moving and closing still pass through the workspace controller.
The bridge retains one native popup until the next request because GTK returns
before dismissal. Stable action IDs keep native callback registrations bounded.

`DeskStatus` is custom feedback UI. Errors have an explicit dismiss action;
dismissal hides the current notice without changing its projection outcome.
New failures remain visible, including a new audience revision with the same
message.

`SizeBandEditor` owns contiguous draft boundaries and font-size editing. It shows
the current grapheme count and can reset to the reference profile before Apply.
Existing accepted profiles remain intact. The reference omits 301–400 characters;
that default range uses 48px. The final 651+ range uses 30px without an upper
limit, and the first range includes zero internally for the IPC contract.

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
Change shared color values in `src/themes/default.css`; keep their Tailwind
mappings in `src/styles.css`. Keep behavior in the capability, as Welcome does
for pending state and greeting results.
Inspect diffs before permitting a CLI overwrite of customized source.

## Application palette

The default palette retains tweakcn's shadcn color names: surface/foreground
pairs, primary, secondary, muted, accent, destructive, border, input, ring,
chart colors, and sidebar colors. This includes the exported
`destructive-foreground` role. Use semantic utilities such as `bg-primary` and
`text-primary-foreground` in components. Keep literal palette colors in the
palette stylesheet.

Light and dark values live once in `src/themes/default.css` as
`--palette-light-*` and `--palette-dark-*` tokens. `src/themes/preferences.css`
maps them to the same semantic roles for System and manual modes. Edit palette
values only in `default.css`; mode selectors contain references, never colors.

Rust owns the confirmed System/Light/Dark preference in `application_settings`.
`set_application_theme` saves before publishing; both windows refresh accepted
state on `ApplicationChanged`. System follows the window's media query live.
Browser development keeps only a session-local palette preview.

When editing a palette or copying values from tweakcn, update the color variables
in both palette token sets. Retain the existing role names and mappings. Keep fonts,
spacing, radii, shadows, and base rules separate; importing tweakcn's complete
stylesheet would also replace settings outside the palette. Future palettes
supply values for these same roles. Theme selection, a registry, and the public
import format will be designed with their implementations.

The application palette supplies shared defaults for windows importing the global
stylesheet. Explicit workspace verse colors and translation backgrounds retain
precedence. Audience windows follow the shared application preference without
changing those overrides. A missing image uses its captured fallback color or
the existing visual default.

Check rendered component states after color changes. The palette is adjusted
around Button's existing hover opacity and focus-ring styles. The sole Button
change is a fully opaque destructive keyboard-focus border: its stock 40%
opacity cannot reach 3:1 on the light surfaces through palette values alone.
This shared focus style applies to every theme; imported palettes retain the same
color role contract and need contrast review against Lumina's component states.
Sizes, radii, ring width, and behavior are unchanged. The
[theme specification](specs/application-theme.md#implementation-evidence)
records palette adjustments, measured ratios, and browser/native verification.
Check new components and color combinations individually; a palette does not
guarantee contrast for every opacity, image, or pairing.

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
