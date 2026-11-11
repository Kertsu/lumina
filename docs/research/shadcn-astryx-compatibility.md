# shadcn → Astryx component coverage

Checked 2026-11-11 against Lumina `beta` commit
[`77e9dcee`](https://github.com/Kertsu/lumina/tree/77e9dcee437e763242ff34e02cd264725ecbfae3)
and Astryx public source commit
[`a370b5e0`](https://github.com/meta/astryx/tree/a370b5e07e4f2cbe19bfa163d025bde9397e1a28).

**All 15 installed UI components have Astryx counterparts.** Nine retain the
same component name; six use different names or composition. This confirms
component availability, not interchangeable props or complete behavior parity.

## Lumina inventory

Lumina uses shadcn's `radix-nova` style and the `@/shared/ui` alias, confirmed by
[`components.json`](https://github.com/Kertsu/lumina/blob/77e9dcee437e763242ff34e02cd264725ecbfae3/components.json).
The [shared UI directory](https://github.com/Kertsu/lumina/tree/77e9dcee437e763242ff34e02cd264725ecbfae3/src/shared/ui)
contains 15 component files, excluding `utils.ts` and tests. All 15 have production
callers. `command` uses cmdk; the others use Radix primitives, including Button's
Slot. These dependencies are declared in
[`package.json`](https://github.com/Kertsu/lumina/blob/77e9dcee437e763242ff34e02cd264725ecbfae3/package.json).

## Cross-check

Every Astryx target below is a public subpath export in its
[`@astryxdesign/core` manifest](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/package.json).
Links in the target column point to its implementation. “Same name” means a
matching component category, not API compatibility.

| Installed file | Astryx counterpart | Match |
| --- | --- | --- |
| `alert-dialog.tsx` | [AlertDialog](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/AlertDialog/AlertDialog.tsx) | Same name; exported, absent from catalog overview |
| `button.tsx` | [Button](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Button/Button.tsx) | Same name |
| `command.tsx` | [CommandPalette](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/CommandPalette/CommandPalette.tsx) | Equivalent; search-source API replaces cmdk composition |
| `context-menu.tsx` | [ContextMenu](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/ContextMenu/ContextMenu.tsx) | Same name; exported, absent from catalog overview |
| `dialog.tsx` | [Dialog](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Dialog/Dialog.tsx) | Same name |
| `dropdown-menu.tsx` | [DropdownMenu](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/DropdownMenu/DropdownMenu.tsx) | Same name |
| `popover.tsx` | [Popover](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Popover/Popover.tsx) | Same name |
| `radio-group.tsx` | [RadioList](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/RadioList/RadioList.tsx) | Equivalent |
| `scroll-area.tsx` | [ScrollableArea](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/ScrollableArea/ScrollableArea.tsx) | Equivalent; native viewport and scrollbars |
| `select.tsx` | [Selector](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Selector/Selector.tsx) | Equivalent |
| `sheet.tsx` | [Drawer](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Drawer/Drawer.tsx) | Equivalent for Lumina's left/right sheets |
| `slider.tsx` | [Slider](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Slider/Slider.tsx) | Same name |
| `switch.tsx` | [Switch](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Switch/Switch.tsx) | Same name |
| `tabs.tsx` | [TabList / Tab](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/TabList/TabList.tsx) | Equivalent; caller composes panels |
| `tooltip.tsx` | [Tooltip](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Tooltip/Tooltip.tsx) | Same name |

Sonner is also installed and used directly by Lumina's
[root route](https://github.com/Kertsu/lumina/blob/77e9dcee437e763242ff34e02cd264725ecbfae3/src/routes/__root.tsx),
without a `shared/ui/sonner.tsx` wrapper. Astryx exports
[Toast](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Toast/Toast.tsx)
as its notification counterpart. This is additional to the 15-file inventory.

## Important distinctions

- The [catalog overview](https://astryx.atmeta.com/components/) omits AlertDialog
  and ContextMenu. Their public exports and implementations confirm availability.
  AlertDialog provides modal alert semantics, blocks outside-click dismissal,
  cancels on Escape, and initially focuses Cancel. ContextMenu supports right-click,
  keyboard context-menu invocation, and touch long press. See their source links above.
- Lumina's [Sheet](https://github.com/Kertsu/lumina/blob/77e9dcee437e763242ff34e02cd264725ecbfae3/src/shared/ui/sheet.tsx)
  supports left/right. Astryx's [Drawer documentation](https://astryx.atmeta.com/components/Drawer)
  covers these side panels using logical start/end edges. BottomSheet is for top/bottom
  presentation, so it is not the direct match for current Lumina sheets.
- Astryx TabList needs `role="tablist"` for tabs semantics; its default is navigation.
  It does not replace Lumina's custom draggable/closable workspace-tab behavior.
  ScrollableArea exposes a native viewport ref, relevant to Lumina's scrolling code.
  These mappings still require caller-level verification before migration.

Lumina already declares React 19.2.6. Astryx requires React 19+ and StyleX's runtime
peer dependency, base CSS, and a theme. It supports CSS/Tailwind styling; existing
cascade layers need deliberate integration. See
[Getting Started](https://astryx.atmeta.com/docs/getting-started) and the official
[migration guide](https://astryx.atmeta.com/docs/migration).

The initial inventory changed no application code or dependencies. The subsequent
`beta-astryx` migration is documented in [Shared UI](../shared-ui.md).

## Migration API notes: published 0.7.13

Verified against the [published package](https://www.npmjs.com/package/@astryxdesign/core/v/0.7.13),
including its bundled source and declarations. These notes support the subsequent
`beta-astryx` migration; the availability audit above remains a snapshot.

| Surface | Public contract |
| --- | --- |
| Dialog | `isOpen`, `onOpenChange`; `purpose="info"` permits Escape/backdrop, `"form"` Escape only, `"required"` neither. Compose Layout/DialogHeader; header title names dialog. |
| AlertDialog | `isOpen`, `onOpenChange`, `title`, `description`, `actionLabel`, `onAction`; optional `isActionLoading`. Action never auto-closes: caller closes after success. |
| Drawer | `isOpen`, `onOpenChange`, required `label`, `side="start"` or `"end"`, `hasScrim`; same purpose rules. Header needs its own close callback. |
| Popover | `isOpen`, `onOpenChange`, `content`; render-function `children(triggerProps)` supplies ref/click/ARIA. Also `anchorRef`, `hasAutoFocus`, `hasLightDismiss`, `hasEscapeDismiss`, `isModal`. |
| Tooltip | `content`, children or `anchorRef`; optional `isOpen`, `onOpenChange`, `delay`, `focusTrigger`, `touchTrigger`. |
| DropdownMenu | Controlled state is **`isMenuOpen`**, with `onOpenChange`; `renderTrigger(props)` or `button` config; either data `items` or compound children. |
| ContextMenu | Children form trigger wrapper. Either `items` or `menuContent`; `isDisabled`, `onOpenChange`. No controlled open prop. |
| Selector | `label`, `options`, `value`, `onChange`; hidden visible label via `isLabelHidden`. Whole control `isDisabled`; option objects use **`disabled`**. No controlled open prop. |
| TabList / Tab | Root `value`, `onChange`, `role="tablist"`. Tab `value`, string `label`, `panelId`, ref; caller renders linked panels. |
| Toast | `useToast()` returns `show(options) => dismiss`; options include `body`, `type`, `uniqueID`, `onHide`. Root LayerProvider manages viewport/theme/modal hosting. |

Sources: [Dialog](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Dialog/Dialog.tsx),
[AlertDialog](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/AlertDialog/AlertDialog.tsx),
[Drawer](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Drawer/Drawer.tsx),
[Popover](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Popover/Popover.tsx),
[Tooltip](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Tooltip/Tooltip.tsx),
[DropdownMenu](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/DropdownMenu/DropdownMenu.tsx),
[ContextMenu](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/ContextMenu/ContextMenu.tsx),
[Selector](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Selector/Selector.tsx),
[TabList](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/TabList/TabList.tsx),
[Toast types](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Toast/types.ts).

### Disabled commands and notifications

The high-level CommandPalette takes `searchSource={bootstrap, search}` and reports
selection through `onValueChange(id)`. `createStaticSource(items, {keywords})`
supports keyword matching; `auxiliaryData.group` supplies group headings. However,
its root renderer does not propagate item-disabled state. Preserving visible
disabled commands requires the public standalone composition: Dialog,
CommandPaletteInput/List/Group/Item, and `useCombobox` from the Selector entry.
See [root implementation](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/CommandPalette/CommandPalette.tsx)
and [public exports](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/CommandPalette/index.ts).

`useCombobox({selectableItems, isOpen, hasSearch, onOpen, onClose, onSelect, listboxId})`
accepts options with `{value, disabled}`. Spread `getFieldProps()` onto the input
and `getListboxProps()` onto the list. Items use `getItemId(i)`, `isDisabled`,
`isHighlighted`, and `isSelected`; pointer selection calls `onItemSelect(option)`.
`onItemMouseEnter(option, i)` handles highlight. Editable-field keys from
`getFieldProps()` skip disabled items, preserve Home/End caret behavior, handle
IME/modifier keys, and select/close through callbacks. See
[useCombobox](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Selector/hooks.ts).

Toast's only built-in types are `"info"` and `"error"`. Preserve success/warning
meaning through an application notification interface and visible message/icon;
do not pass unsupported variants. See the Toast types linked above.

### Focus and test environment

Dialog captures its opener and restores focus on close/unmount. Requested initial
focus uses `data-autofocus`; React's ordinary autofocus can run before native
`showModal()`. Render-trigger APIs must receive their supplied ref and handlers.
See the Dialog and Popover implementations linked above.

Astryx's [Dialog tests](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Dialog/Dialog.test.tsx)
shim `showModal()` by adding `open`, and `close()` by removing it. Its
[shared jsdom setup](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/internal/test-utils/src/setup.ts)
supplies matchMedia and Popover API shims. Tests of actual dismissal need stateful
popover behavior/events. A desktop matchMedia model should allow hover, reject
coarse pointer, and report reduced motion when deterministic timing is required.
Returning no animations from `getAnimations()` removes entrance input holds.

Drawer closure waits for a transform transition or a backstop (300ms when CSS
timing cannot resolve). Await removal or dispatch its transform transition end;
reduced-motion matchMedia alone does not bypass this JavaScript timer. See
[drawer presence](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Drawer/useDrawerDialogPresence.ts)
and [entrance holds](https://github.com/meta/astryx/blob/a370b5e07e4f2cbe19bfa163d025bde9397e1a28/packages/core/src/Layer/holdEntranceInput.ts).
Native top-layer positioning and focus trapping still require browser verification.
