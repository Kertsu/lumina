# Prototype audience boundary

`audience::setup(app.handle())` registers transient payload state, audience
closure handling, main-window destruction handling, and display monitoring.
Register `audience::{open_audience, close_audience, audience_is_open,
audience_payload, publish_audience, set_audience_fullscreen,
set_operator_on_top, set_cursor_restriction}` in the native invoke handler.
The operator label is `main`; audience label is `audience`.

Open Audience creates black output. Native projection requires an existing
audience window. Only the operator can mutate output/window controls. Opening
is serialized with storage replacement/removal via `storage::MAINTENANCE`.
Audience closure clears transient projection state. Monitor removal or
reconfiguration closes audience output; opening again starts blank. Polling
occurs every 500 ms and conservatively closes output when any previous monitor
signature disappears. This includes resolution/layout changes. It does not
establish zero-frame recovery before an OS moves a window to another display;
physical display qualification is still required.

The operator must intercept CloseRequested, await workspace persistence,
close Audience, and destroy itself. Destruction fallback closes Audience even
when that graceful path is bypassed. Live content is never persisted/reopened.
Fullscreen and operator always-on-top use native window APIs and surface OS
errors. CSS and native cursor visibility hide the audience pointer separately
from cursor restriction.

## Cursor restriction remains blocked

Enabling restriction explicitly returns an unavailable error. State stays off;
no cursor-grab or cursor-position lock is activated. This is an incomplete MVP
requirement, not equivalent behavior or a supported-platform claim. Disabling
is a safe no-op because the prototype never installs a native constraint.

- Windows `ClipCursor` accepts one inclusion rectangle and requires release
  before yielding control to another application. It cannot establish arbitrary
  audience-window exclusion while allowing ordinary movement in all other apps.
  [Microsoft API contract](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-clipcursor).
- macOS's documented cursor-association primitive disconnects movement from
  the pointer and is foreground-only. Global event interception/warping would
  require additional integration and permission handling, then direct evidence
  that it prevents entry rather than correcting entry after it occurs.
  [Apple cursor controls](https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/QuartzDisplayServicesConceptual/Articles/MouseCursor.html).
- Linux X11 pointer grabs change event routing and can interfere with other
  applications. Wayland constraints are compositor-controlled, surface-scoped,
  and intersect the requesting surface's input region. Neither establishes the
  accepted exclusion behavior through the framework API.
  [Xlib](https://www.x.org/releases/X11R7.6/doc/libX11/specs/libX11/libX11.html),
  [Wayland protocol](https://gitlab.freedesktop.org/wayland/wayland-protocols/-/blob/main/unstable/pointer-constraints/pointer-constraints-unstable-v1.xml).

Tauri's grab documentation lists Linux as unsupported and macOS as locking at
a fixed position. A successful return cannot be interpreted as audience-window
exclusion. [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#setcursorgrab).
These are API/source constraints, not runtime qualification results. The
required global exclusion needs platform-specific engineering plus physical
display and application-switch verification before it can be advertised.

## Browser preview

Browser mode uses one named popup and a per-operator BroadcastChannel. Opening
clears its payload, closing resets operator status, and operator page closure
closes the popup. Direct sends while closed fail. Native display monitoring,
always-on-top, and pointer exclusion are unavailable. Fullscreen requests show
an audience-side button because browsers require a gesture in that window.
