# Shared UI

The `beta-astryx` experiment uses Astryx 0.7.13 with its Neutral theme.
`src/shared/ui/` contains application adapters and compositions over public
`@astryxdesign/core` exports. Radix, cmdk, Sonner, and the shadcn CLI
configuration have been removed.

## Ownership

- Rust retains confirmed application settings. `useAppTheme` reads accepted
  System/Light/Dark preferences and supplies Astryx `Theme` in the operator
  and audience windows. Browser preferences remain session-only.
- Astryx owns control rendering, modal containment, roving focus, anchored
  layers, and notification surfaces. Features own actions, validation,
  disabled conditions, and projection state.
- `Button` translates the app's existing size and action vocabulary to Astryx
  Button/IconButton. Disabled buttons retain native `disabled` behavior.
- `Dialog` composes Astryx Dialog, DialogHeader, and LayoutFooter. Feature
  `onOpened`/`onClosed` callbacks run after the native modal's focus effects.
- `Sheet` uses Astryx Drawer for responsive left/right panels. Its explicit
  title also names the native modal. Features retain their search/verse focus
  targets and restore focus to the opening control.
- `Select` uses Astryx Selector. Use its `label`, `options`, `value`, and
  `onChange` props; external duplicate labels are unnecessary. F1 opens the
  translation selector through its public trigger ref.
- `Tabs` owns panel identity and selected content; Astryx TabList/Tab own
  controls and keyboard navigation. Workspace drag/reorder/close behavior
  remains in `workspace-tabs.tsx`.
- `CommandMenu` composes public Astryx command-palette parts with its
  `useCombobox` keyboard model. The application supplies groups, keywords,
  shortcuts, and actions. Disabled commands remain visible and cannot run.
- `useNotifications` adapts success/warning/error meaning to Astryx Toast.
  Success and warning keep distinct icons; Astryx supplies info/error surfaces.
  Root LayerProvider hosts notifications above modal dialogs.
- Native desktop workspace menus retain Tauri behavior. The browser preview
  renders the same action list through Astryx ContextMenu, including right-click
  and Shift+F10.
- Mounted but closed layers do not block verse shortcuts.
  `hasOpenInteractionLayer` checks actual native dialog/popover visibility.

## Styling

`src/app/main.tsx` imports `layers.css` before the global stylesheet and any
component modules. The ordered layers put resets and Tailwind preflight below
Astryx's component/theme rules; layout utilities remain available.

`src/themes/preferences.css` maps application color roles to Astryx tokens.
Theme previews consume the same tokens with explicit light/dark color schemes.

Figtree is bundled through Fontsource.
The verse fonts, image backgrounds, formatting, size bands, and explicit
workspace appearance remain independent from the operator's UI theme.

Keep shared UI independent of native integration and application rules.
Use Astryx props for control states; reserve local CSS for product layout and
compositions. Read the installed package's `src/` and `dist/` declarations
before extending an adapter. Avoid rebuilding an unused Radix-style API.

## Verification

```sh
pnpm lint:ci
pnpm typecheck
pnpm test
pnpm test:release
pnpm build:vite
```

`src/test-setup.ts` supplies jsdom's missing CSS, native dialog, and popover
APIs. Real-browser checks remain necessary for top-layer behavior, focus traps,
responsive drawers, and light/dark rendering.

The [component comparison](research/shadcn-astryx-compatibility.md) records the
original beta inventory and the public APIs used for this migration.
