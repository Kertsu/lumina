# Cursor restriction and confinement

Research: 14 October 2026 (Asia/Manila). Documentation/source review only; no
Lumina confinement implementation or runtime verification exists.

Q42 includes cursor restriction in MVP. The initial recommendation described
confinement to the operator's display; the maintainer clarified the goal as
preventing pointer hover over the **audience window** while allowing normal use
of other applications. Revised Q45 accepts keeping the setting enabled when
switching applications, manual release, and release on audience closure or
display disconnection. Q54 accepts manual activation with an initially-off
toggle; fullscreen does not automatically enable it. Control placement and
shortcuts remain UI-design details. This requirement does not establish
identical support on every target platform.

## Framework boundary

The [lockfile](../../src-tauri/Cargo.lock) pins Tauri 2.11.1, Tao 0.35.2, and Wry
0.55.1. Tauri's `setCursorGrab(bool)` describes confinement to a **window**;
it has no monitor or rectangle parameter. Its documentation lists Linux as
unsupported and macOS as a fixed-position lock. Cursor hiding is separate.
[Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#setcursorgrab).

Pinned Tao 0.35.2's Linux method is a no-op returning `Ok(())`. A successful call
therefore does not establish active confinement.
[Pinned Linux source](https://github.com/tauri-apps/tao/blob/tao-v0.35.2/src/platform_impl/linux/window.rs).

Full-display confinement permits normal pointer movement across one monitor.
Window confinement restricts movement to the app's rectangle. A fixed-position
lock prevents ordinary pointer movement. These are different product behaviors.

## Verified platform primitives

**Windows:** `ClipCursor` confines to a screen-coordinate rectangle; passing
`NULL` releases it. Microsoft requires release before relinquishing control to
another application. `MONITORINFO.rcMonitor` provides the monitor rectangle in
virtual-screen coordinates, including possible negative coordinates.
[ClipCursor](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-clipcursor),
[MONITORINFO](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo).
Tao's grab uses the window client rectangle, rather than a monitor rectangle.
[Pinned Windows source](https://github.com/tauri-apps/tao/blob/tao-v0.35.2/src/platform_impl/windows/window_state.rs).

**macOS:** Tao's grab disconnects mouse movement from cursor movement. Apple
documents this foreground-only operation and cursor positioning in global
display coordinates. These primitives do not demonstrate movable confinement
within an entire monitor.
[Pinned macOS source](https://github.com/tauri-apps/tao/blob/tao-v0.35.2/src/platform_impl/macos/window.rs),
[Apple cursor controls](https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/QuartzDisplayServicesConceptual/Articles/MouseCursor.html).

**Linux X11:** `XGrabPointer` can confine to a viewable window unrelated to the
event window. It affects event routing and can fail if another client holds a
grab. Unmapping the event/confinement window automatically releases the grab.
The API accepts a confinement window, not a monitor rectangle.
[Xlib specification](https://www.x.org/releases/X11R7.6/doc/libX11/specs/libX11/libX11.html).

**Linux Wayland:** pointer constraints require compositor support. A confinement
region is intersected with the requesting surface's input region; activation is
compositor-controlled and reported through a `confined` event. The compositor
can subsequently release it. This protocol is not an arbitrary desktop-monitor
rectangle API.
[Upstream protocol source mirror](https://raw.githubusercontent.com/wayland-mirror/wayland-protocols/main/unstable/pointer-constraints/pointer-constraints-unstable-v1.xml).

## Implication for MVP

**Inference:** Tauri's built-in grab alone does not establish audience-window
avoidance across application switches on all targets. Additional platform
integration and physical multi-display verification are required. Keep Q42 in
scope; record platform feasibility and release behavior as unresolved, without
presenting fixed locking or confinement to the operator window as equivalent
substitutes. Maintaining the application's protection setting and maintaining
an active native pointer constraint are separate concerns: OS focus/release
constraints must be reconciled with the requested behavior during implementation.
