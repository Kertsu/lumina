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
- Adjust the palette around Button's existing hover and focus-ring styles. The
  sole agreed component change makes the destructive keyboard-focus border fully
  opaque; its stock opacity cannot provide 3:1 contrast on the light surfaces.

## Starting foundation

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
inactive controls do not automatically need the same contrast as essential
control/state indicators.
Record original/adjusted values, affected role/state, and measured ratios for
any adjustment. Do not claim arbitrary image backgrounds are covered by a
palette-only review. These are required implementation checks, not completed
verification results.

## Implementation evidence

The 2026-10-22 palette and verification below are historical. The maintainer's
2026-11-01 palette in `src/themes/default.css` is now the default. See the
[current palette verification](#current-palette-verification) for its component
role changes and checks.

Implemented on 2026-10-22. `src/themes/default.css` defines the paired palette;
`src/styles.css` imports it and maps all 32 color roles to Tailwind utilities.
Typography and global base rules remain in `src/styles.css`. Static inspection
confirmed all roles in both modes, all mappings, and exactly the four palette
adjustments below. Existing brand artwork and non-color styling are unchanged.

### Contrast adjustments

The inspected palette table above preserves the original export. The final
palette differs only in these four mode/role values:

| Mode / role | Source | Final | Reason |
| --- | --- | --- | --- |
| Light / primary | `#8a612f` | `#714722` | With stock 80% hover opacity, light text improves from 3.60:1 to 4.78:1 on the application background. |
| Light / muted-foreground | `#686f6b` | `#636a66` | Text on the muted surface improves from 4.29:1 to 4.63:1. |
| Light / destructive | `#b4403a` | `#9b302b` | With stock 20% hover tint, text improves from 3.81:1 to 4.83:1 on the application background. |
| Dark / destructive | `#e38b86` | `#e9938e` | With stock 20% hover tint, text on the popover surface improves from 4.30:1 to 4.58:1. |

Button retains its stock hover and focus-ring opacity. It has one shared
color-class exception, explicitly agreed with the maintainer:

| State | Source styling | Final styling | Evidence |
| --- | --- | --- | --- |
| Destructive keyboard focus | `focus-visible:border-destructive/40` | `focus-visible:border-destructive` | At 40% opacity, even a black border reaches only 2.81:1 against the light application background. The final destructive focus border reaches 6.64:1 there. Its stock 20% ring remains a decorative glow. |

Before-change ratios above use sRGB compositing of the source colors. Final
ratios come from rendered computed colors, including alpha compositing, using a
temporary review fixture in each renderer. Rounded values are for reporting;
the measured hovered-text minima were 4.616:1 in light and 4.580:1 in dark.
Existing three-pixel focus-ring geometry, layout, typography, and interaction
behavior are preserved.

The focus border is shared component behavior for all application themes.
Keeping the same token names preserves palette compatibility; every future
palette still needs validation against these component states. The import file
format and validation policy remain future work.

### Rendered checks

Reviewed all six Button variants (default, outline, secondary, ghost,
destructive, link) on background, card, popover, and sidebar surfaces in both
system modes. For each renderer/mode, checked 24 hover states and 24 keyboard
focus states, plus normal states, disabled appearance, and color swatches.

| Surface under test | Mode | Minimum hovered text contrast | Minimum focus-border contrast |
| --- | --- | --- | --- |
| In-app browser | Light | 4.631:1 | 4.721:1 |
| In-app browser | Dark | 4.580:1 | 6.586:1 |
| Native Tauri window | Light | 4.616:1 | 4.721:1 |
| Native Tauri window | Dark | 4.580:1 | 6.586:1 |

The muted foreground/surface pair measured 4.625:1 in light and 5.139:1 in dark.
These checks cover the listed combinations; they do not certify future controls,
arbitrary chart adjacency, or audience image backgrounds.

Browser verification used `pnpm dev:vite`; native verification used `pnpm dev`
after stopping the separate Vite server. A temporary `.app` wrapper exposed the
unchanged development binary to native automation separately from an older
packaged Lumina already open. The native configuration override opened the
temporary fixture; no wrapper or configuration override is committed.

Changed macOS appearance from Dark to Light and back with the maintainer's
permission. Both renderers updated their media mode and colors without an app
restart. Reviewed the actual Welcome screen in both modes; browser keyboard
activation returned the browser fixture greeting, and native keyboard activation
returned `Hello world from Rust!`. Restored macOS Dark appearance and removed
the temporary playground fixture before final checks.

### Automated checks

`pnpm check` passed: frontend lint, typechecking, all 23 frontend tests, Rust
formatting, generated IPC binding drift, Clippy, and all 10 Rust tests.
`pnpm build:vite` passed after restoring the original playground. The production
build excludes the temporary review fixture. Existing Welcome tests were also
run during implementation; no CSS literal-value tests or new dependencies were
added. Biome does not include CSS in this repo; the Vite build and rendered
checks provide the stylesheet verification.

## Current palette verification

On 2026-11-01, adopted the maintainer's replacement palette from
`src/themes/default.css` without changing its supplied values. The default now
pairs warm light surfaces and charcoal dark surfaces with blue primary actions.
The 32 shadcn roles remain, with three independent application roles:

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| live | `#c62828` | `#f2635b` | Live audience indicators |
| success | `#2e7d4f` | `#5cc08a` | Completion and import-review icons |
| gold | `#a9751c` | `#e0b25a` | Blank/pending icons and search highlight tint |

`preferences.css` resolves all three roles for System and manual modes.
`styles.css` exposes their Tailwind mappings. Chart colors no longer define
application status. Gold remains an icon/highlight color, with foreground text
for small status labels; the light gold is unsuitable for normal-size text.
History completion uses a green icon and foreground label, since green text on
the light sidebar measures only 4.43:1.

Component changes keep palette ownership explicit:

- Cards use `card`; dialogs, workspace search and notices use `popover`.
- Inputs/outline controls use `input` borders and focus uses `ring`.
- Destructive buttons use the paired `destructive-foreground`, including dark
  mode. Destructive menu focus uses a 10% destructive tint to retain contrast.
- Checked switch thumbs use `primary-foreground`; unchecked thumbs and
  scrollbars use `muted-foreground` for visible neutral indicators.
- Theme thumbnails resolve each mode's palette variables directly. Projected
  verse styling and the thumbnail scene artwork retain their separate colors.

An isolated headless Chromium fixture rendered the actual desk, settings,
shared controls and menus with the production stylesheet. No native Lumina
window was launched. The review covered both modes, four component surfaces
(background/card/popover/sidebar), five Button variants in normal/hover/focus
states (120 observations), 16 switch states and four destructive-menu focus
states. Rendered minima:

| Pair | Minimum contrast |
| --- | --- |
| Button text, normal/hover | 4.89:1 |
| Button focus color against adjacent surface | 6.92:1 |
| Switch thumb against track | 3.88:1 |
| Destructive focused-menu text | 4.58:1 |

Six mode combinations confirmed System follows emulated appearance and manual
Light/Dark override it, including live/success/gold. Theme thumbnails rendered
the same mode-specific values regardless of the surrounding mode. Reviewed
live/blank tabs, search highlights, history completion and settings screenshots.
`pnpm check:frontend` passed (123 tests), and `pnpm build:vite` passed. Native
renderer qualification and arbitrary audience-image contrast are not implied by
these browser checks. No dependency or CSS-literal tests were added.

### Palette hierarchy refinement

The Impeccable refinement on 2026-11-01 keeps the supplied palette and incumbent
layout. The operator works under a restrained color hierarchy: blue for actions
and current selections, neutral chrome for passive information, red for live
output or failure, green for completed operations, and gold for blank/pending
states or search highlights. Status labels and distinct icons accompany color.

`selection` mixes primary with card at 10%; `selection-hover` uses 16%.
Both are opaque and pair with `selection-foreground`, avoiding different
translucent blue overlays on every component. Workspace selection, pressed
formatting, current workspace search, active size bands and chapter layout
controls share these roles. Informational badges and result reference headings
use neutral foregrounds. The stage and tab read the same audience-status rule,
including closed, blank, pending, unconfirmed and confirmed-live states.

Dark surfaces retain their intended elevation. Shadows use the palette's dark
background as ink in both modes; the main projection card keeps its border
without a surrounding shadow. Empty search artwork loses its decorative blue
glow. Fonts, copy, workspace verse styling and projection behavior are preserved.

One batched isolated Chromium review covered light/dark at 1600px, 1000px and
390px browser widths, workspace search, settings, appearance, library, preview,
empty/error states and keyboard focus. Sixteen layout observations found no
page overflow or out-of-viewport dialogs. Sixty sampled contrast pairs had
minima of 5.13:1 for text and 3.77:1 for status icons. Eight rendered state
comparisons matched tab and stage colors. Deuteranopia/protanopia simulations
retained the distinct state icons and accessible names. These sampled checks
are not a blanket contrast certification or native/mobile support claim.

`pnpm check:frontend` passed (123 tests); the existing seven audience-state cases
now also verify stage/tab agreement. `pnpm build:vite` passed. No native Lumina
window was launched. The Impeccable context launcher was unavailable; this
narrow refinement used the existing implementation and product/theme docs.

### Cool light mode

The maintainer requested a cooler light mode on 2026-11-01 while preserving the
approved dark palette. Nineteen light roles now use cool gray surfaces, slate
text and pale blue hover fills. The existing blue primary stays unchanged.
Gold remains a blank/pending state color rather than a general light UI tint.

| Light role | Previous | Current |
| --- | --- | --- |
| background | `#faf8f4` | `#f6f8fb` |
| foreground | `#1c1917` | `#202938` |
| secondary | `#ece7dd` | `#e8edf3` |
| muted | `#f1ede6` | `#eef2f6` |
| muted-foreground | `#6b645b` | `#586779` |
| accent | `#f4ead3` | `#e4ecf7` |
| sidebar | `#f3f0e9` | `#edf1f6` |
| border | `#e3ddd2` | `#d8e0ea` |
| input | `#d9d2c5` | `#c5d0de` |

Paired foreground/sidebar roles follow the same slate/white values. Search
matches use the semantic `search-highlight`: pale blue accent in light mode,
the existing 16% gold tint in dark mode. Projection colors remain independent.

One batched Chromium review sampled 160 text/icon/thumb contrast pairs and
16 layouts, including controls, destructive menus, overlays, empty/error states,
1600px/1000px/390px browser widths and color-vision simulations. Light-mode
text measured at least 4.78:1; switch thumbs at least 3.70:1. The review found
no failed contrast thresholds or overflowing layouts. All 35 dark primitive
values matched the previous version; computed dark semantic roles and sampled
component colors also matched in both manual Dark and System-dark modes.
`pnpm check:frontend` passed (123 tests), and `pnpm build:vite` passed.
Lumina was not launched; these remain isolated browser checks.

### Search match visibility

The maintainer's `pagibig` screenshots exposed weak separation between search
matches and their surrounding panels in both modes. Search now pairs opaque
blue with white text in light mode and opaque gold with dark ink in dark mode.
The semantic `search-highlight-foreground` keeps each foreground with its fill.
600 font weight adds a non-color cue; cloned box decoration keeps wrapped
phrases continuous. Matching, range boundaries and original verse text remain
owned by the existing search/rendering flow.

A bounded Chromium fixture rendered the three supplied Tagalog examples at
1300px and 390px in both modes. All nine `pagibig` ranges and the exact original
paragraph text were preserved in every case, with no page overflow. Highlight
text contrast measured 8.78:1 in light mode and 9.61:1 in dark mode; fill against
the panel measured 7.74:1 and 9.29:1 respectively. Both modes were visually
reviewed. `pnpm check:frontend` passed (123 tests), and `pnpm build:vite` passed.
Lumina remained closed. This replaces the earlier low-opacity highlight
presentation without changing the underlying palette values or search rules.
