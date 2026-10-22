# Default application theme

Design agreed on 2026-10-22. Implementation tracked in
[#24](https://github.com/Kertsu/lumina/issues/24).

## Confirmed direction

- One application theme supplies light and dark palettes to the operator and
  audience windows. Audience windows are not implemented yet.
- Explicit workspace verse colors and background images override application
  palette defaults; later application theme changes preserve those choices.
- Light/dark follows the system. Manual selection and preference persistence are
  deferred.
- Scope is color. Typography, spacing, radii, shadows, layout, and existing brand
  artwork are outside this palette task.
- Future customization includes bundled presets and user-imported palettes.
  Import UI, validation, storage, and theme management are future work.
- Keep the captured tweakcn color role names. Define the public versioned import
  file structure when implementing imports.
- Small, documented color adjustments may correct insufficient rendered contrast
  while preserving the palette's overall appearance.

## Current foundation

`src/styles.css` owns semantic CSS variables, Tailwind v4 utility mappings,
system-mode selection, typography, and base styles. Welcome and Button already
consume semantic colors. No theme selection or persisted preference exists.
Keep shared UI independent of application state and the native bridge.

The existing [MVP appearance requirements](mvp.md#appearance-and-operator-interface)
provide workspace-specific verse styling and translation backgrounds, with
Apply/Cancel. [Book information projection](mvp.md#book-information-projection)
also uses the confirmed workspace background. Sharing an application palette
provides defaults beneath explicit workspace styling. Automatic changes to live
audience output remain audience implementation work.

## Color role contract

Retain the captured tweakcn color variable names unchanged,
following [shadcn's semantic token convention](https://ui.shadcn.com/docs/theming).
[Tailwind theme mappings](https://tailwindcss.com/docs/theme) expose those roles
as utilities: `--background` maps through `--color-background` to
`bg-background`; `--primary` maps to `bg-primary`; `--primary-foreground` maps
to `text-primary-foreground`. Each palette supplies different values under the
same names. The captured 32-role set includes card, popover, sidebar, and chart
colors, plus tweakcn's exported `destructive-foreground`. This contract concerns
color names and values; it does not accept non-color export settings or define
an external import file format.

Exact audience rendering defaults, blank-output color, image fallback behavior,
and live reaction to mode/theme changes belong to audience implementation; the
palette task must not invent these behaviors or implement audience windows.

## Inspected palette

Read from the user's live, unsaved [tweakcn editor](https://tweakcn.com/editor/theme?p=marketing)
on 2026-10-22. That URL alone does not preserve the edited values. This table
captures the color export; font, radius, shadow, tracking, and spacing exports
are deliberately excluded. These are source values, not a claim that every
possible component state passes contrast review.

| Semantic role | Light | Dark |
| --- | --- | --- |
| background | `#f5f3ed` | `#111820` |
| foreground | `#2b302e` | `#e9e4da` |
| card | `#fdfcf9` | `#18212b` |
| card-foreground | `#2b302e` | `#e9e4da` |
| popover | `#fffefa` | `#1c2631` |
| popover-foreground | `#2b302e` | `#e9e4da` |
| primary | `#8a612f` | `#d8b782` |
| primary-foreground | `#fffaf1` | `#1b2026` |
| secondary | `#e8e5dc` | `#2d3339` |
| secondary-foreground | `#2b302e` | `#e9e4da` |
| muted | `#eeeae2` | `#202a34` |
| muted-foreground | `#686f6b` | `#8e9ba9` |
| accent | `#e8e4da` | `#2a3540` |
| accent-foreground | `#2b302e` | `#e9e4da` |
| destructive | `#b4403a` | `#e38b86` |
| destructive-foreground | `#fffaf1` | `#1b2026` |
| border | `#dcd7cc` | `#2b3540` |
| input | `#d1cbbf` | `#35404c` |
| ring | `#8a612f` | `#d8b782` |
| chart-1 | `#8a612f` | `#d8b782` |
| chart-2 | `#3a7857` | `#99c5a9` |
| chart-3 | `#505c57` | `#8e9ba9` |
| chart-4 | `#b9924e` | `#e1c69d` |
| chart-5 | `#b4403a` | `#e38b86` |
| sidebar | `#f0eee7` | `#111820` |
| sidebar-foreground | `#2b302e` | `#e9e4da` |
| sidebar-primary | `#8a612f` | `#d8b782` |
| sidebar-primary-foreground | `#fffaf1` | `#1b2026` |
| sidebar-accent | `#e8e4da` | `#2a3540` |
| sidebar-accent-foreground | `#2b302e` | `#e9e4da` |
| sidebar-border | `#dcd7cc` | `#2b3540` |
| sidebar-ring | `#8a612f` | `#d8b782` |

## Implementation seam

Keep palette definitions separate from typography and global base rules;
components consume semantic roles rather than named palettes or literal colors.
Preserve system-mode switching. Establish one bundled palette pair without a
runtime registry, provider, import schema, or new dependency solely for future
customization. Extend the existing Tailwind mappings for the captured roles.

Document how a future theme supplies the same semantic roles. The future import
contract must validate external data before application; its exact format and
versioning policy are deferred until import implementation.

## Implementation issue

Title: Set up the default application color palette

One issue is sufficient: the palette, shared mappings, documentation, and visual
verification form one reviewable change. Splitting static token definitions from
their application would leave an incomplete result.

### Outcome

Replace the neutral application colors with the captured paired palette while
preserving system-mode selection and existing semantic component usage. Keep
palette values easy to replace independently of typography and base rules.

### Changes

1. Extract the default light/dark color values into one palette stylesheet,
   `src/themes/default.css`, imported by `src/styles.css`. Keep a single source
   for each mode's values.
2. Retain all 32 exported color names. Complete the `@theme inline` color
   mappings in `src/styles.css`; retain its font configuration and base rules.
3. Keep the existing `prefers-color-scheme` behavior. Avoid introducing runtime
   theme state or a selector API for the single bundled theme.
4. Review Welcome and every existing Button variant/state against the new
   palette. Make bounded semantic-token or color-class adjustments if rendered
   contrast requires them, preserving behavior, typography, and geometry.
5. Update `docs/shared-ui.md` with color ownership, role naming, palette editing,
   current system-mode behavior, and the path for future themes to reuse roles.
6. Add or update `docs/specs/application-theme.md` with these agreed decisions,
   the captured source palette, verification, and any color adjustments. Keep the
   captured source palette separate from the final adjusted values.

### Acceptance criteria

- The captured palette's 32 roles are defined in both light and dark modes,
  with corresponding Tailwind color mappings and no missing variable references.
- Rendered Welcome and existing Button variants use the new palette in browser
  and Tauri; system mode switches update colors without restarting.
- Relevant rendered text, essential control indicators, and focus states meet
  the contrast checks below, including hover/opacity composites. Any adjustment
  retains the overall cream/brown and navy/gold appearance and has evidence.
- Component color classes continue to use shared roles; palette values are
  isolated from fonts and global styling. Future palettes reuse these names.
- Audience override precedence is documented for future audience work; this
  change adds no audience renderer or workspace appearance settings.
- Typography, artwork, layout, spacing, radii, and shadows remain unchanged.
- No theme picker, persistence, registry, import/export, new dependency, or public
  import file format is added.

### Verification to report

Run `pnpm check:frontend` and `pnpm build:vite`. Follow the rendered review below
with `pnpm dev:vite` and `pnpm dev` sequentially because they use the same port.
Record browser/native results separately. Review all Button variants in temporary
fixtures and remove those fixtures before completion. Review palette-only
surfaces with temporary swatches where no component exists; installing unused
components is unnecessary. Do not add tests that merely repeat CSS literal values.
Follow `CONTRIBUTING.md` for the eventual issue branch and commits.

Future theme imports remain a deferred capability rather than a ready-for-agent
issue: file structure, version compatibility, validation limits, persistence,
mode controls, and live audience behavior need their own design before coding.

## Rendered verification

Run existing frontend checks and the Vite production build. Review rendered
Welcome/Button states in light and dark in browser and Tauri; confirm system
mode changes update the colors. Review text, hover, keyboard focus, destructive,
and disabled states, accounting for opacity and actual adjacent surfaces.
Temporary review fixtures must respect the playground's no-commit instruction.

Use [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
for applicable rendered pairs: normal text at least 4.5:1, large text at least
3:1, and essential control/state indicators at least 3:1 against adjacent colors.
Use the linked standard's definition of large text. Decorative borders and
inactive controls do not
automatically need the same contrast as essential control/state indicators.
Record original/adjusted values, affected role/state, and measured ratios for
any adjustment. Do not claim arbitrary image backgrounds are covered by a
palette-only review. These are required implementation checks, not completed
verification results.
