# Desktop release targets

Research: 14 October 2026 (Asia/Manila). Primary-documentation and pinned-source
review only. No packaged Lumina compatibility or cursor behavior verified.

Accepted scope remains Windows/macOS/Linux and audience-window cursor avoidance
across application switches, with manual release and release on audience closure
or display disconnection. Q51 accepts the candidates below as qualification
baselines, not support guarantees. Q55 accepts offline installation from
downloaded release packages on the documented baseline. Q52 accepts a 60-minute
offline rehearsal before release; execution and compatibility results remain
unverified.

## Dependency and runtime boundary

The [Rust lockfile](../../src-tauri/Cargo.lock) pins Tauri/runtime-wry 2.11.1,
Tao 0.35.2, Wry 0.55.1, and tauri-utils 2.9.1. The
[frontend lockfile](../../pnpm-lock.yaml) pins Tailwind 4.2.4, Tauri API 2.11.0,
and CLI 2.11.1. The [configuration](../../src-tauri/tauri.conf.json) does not
declare a product macOS minimum or a WebView2 installation policy override.

Tailwind v4's documented browser baseline is Chrome 111, Safari 16.4, and Firefox
128. Its optional newer utilities can require newer browser features. These are
CSS-framework baselines, not Lumina OS compatibility results.
[Tailwind compatibility](https://tailwindcss.com/docs/compatibility).

Tauri uses WebView2 on Windows, WKWebView on macOS, and WebKitGTK on Linux. Their
actual embedded engine versions matter; installing a newer desktop browser is
not proof that Lumina's webview meets its requirements.
[Tauri webview versions](https://v2.tauri.app/reference/webview-versions/),
[Microsoft runtime distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Minimum candidates to evaluate

| Target | Candidate | Evidence and limits |
| --- | --- | --- |
| Windows | Windows 10 22H2 and Windows 11, with a supported WebView2 runtime | Current ordinary Rust MSVC targets require Windows 10+. Microsoft lists Windows 10/11 WebView2 support. Selecting 22H2 is a manageable test baseline, not proof that earlier Windows 10 builds fail. [Rust requirements](https://doc.rust-lang.org/rustc/platform-support/windows-msvc.html), [WebView2 support](https://learn.microsoft.com/en-us/microsoft-edge/webview2/) |
| macOS | macOS 13.3+ as the initial conservative candidate | Tauri's WKWebView table maps 13.3 to Safari 16.4, matching Tailwind's baseline. This is an inference for testing; newer APIs or cursor integration may raise the minimum. [Webview table](https://v2.tauri.app/reference/webview-versions/) |
| Linux | Ubuntu 22.04 / Debian 12 as build-base candidates, with updated WebKitGTK and separate X11/Wayland evaluation | Tauri names these as examples of old bases providing the required 4.1 API package. The inspected pinned runtime enables Wry's `linux-body`, selecting WebKitGTK 2.40 APIs. Package availability and CSS behavior need verification; “4.1” is an API-package name, not an engine compatibility guarantee. [AppImage guidance](https://v2.tauri.app/distribute/appimage/), [local published runtime dependency](/Users/kurtddanielbigtas/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-runtime-wry-2.11.1/Cargo.toml), [Wry features](https://github.com/tauri-apps/wry/blob/wry-v0.55.1/Cargo.toml) |

Tauri's development prerequisites list macOS 10.15 and Windows 7, while its
macOS bundle configuration defaults to 10.13. These settings do not override the
frontend/runtime requirements or verify Lumina on those systems. Build Linux
artifacts on the oldest intended compatible base to avoid raising required glibc.
[Prerequisites](https://v2.tauri.app/start/prerequisites/),
[pinned configuration defaults](https://github.com/tauri-apps/tauri/blob/tauri-utils-v2.9.1/crates/tauri-utils/src/config.rs),
[AppImage guidance](https://v2.tauri.app/distribute/appimage/).

The default Windows WebView2 bootstrapper requires internet when the runtime is
missing. Offline core use and offline installation are different requirements;
Microsoft provides a standalone offline runtime installer.
[Pinned installation defaults](https://github.com/tauri-apps/tauri/blob/tauri-utils-v2.9.1/crates/tauri-utils/src/config.rs),
[offline deployment](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution#offline-deployment).

## Cursor requirement remains a release risk

Tauri's grab confines to its window, locks the pointer at a fixed location on
macOS, and is documented unsupported on Linux. Pinned Tao's Linux call is a
no-op returning success. None of these is proof of audience avoidance while
using other applications normally.
[Tauri API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#setcursorgrab),
[pinned Linux source](https://github.com/tauri-apps/tao/blob/tao-v0.35.2/src/platform_impl/linux/window.rs).

- **macOS:** the mouse/cursor disassociation used by Tao is documented for a
  foreground application. It does not establish movable exclusion of the
  audience rectangle while another application is active.
  [Apple cursor controls](https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/QuartzDisplayServicesConceptual/Articles/MouseCursor.html).
- **Wayland:** pointer confinement intersects the requested region with the
  requesting surface's input region; activation and later release are controlled
  by the compositor. **Inference:** this API cannot express a global forbidden
  audience area while the pointer freely interacts with unrelated app surfaces.
  [Protocol source](https://raw.githubusercontent.com/wayland-mirror/wayland-protocols/main/unstable/pointer-constraints/pointer-constraints-unstable-v1.xml).
- **Windows/X11:** `ClipCursor` supplies a rectangular allowed area and requires
  release before yielding control to another app. X11/GTK pointer grabs redirect
  events to the grabbing client. These primitives alone do not prove the accepted
  background behavior or unrestricted interaction with other apps.
  [ClipCursor](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-clipcursor),
  [GTK grab semantics](https://docs.gtk.org/gdk3/method.Seat.grab.html).

This rules out treating these particular calls as a complete solution. It does
**not** prove that no other native or compositor integration is possible.

## Proposed evidence-driven release gate

1. Record the tested artifact, CPU architecture, OS build, embedded engine,
   Linux display protocol/compositor, and package format. Claim only the matrix
   actually verified; keep other accepted targets tracked as pending.
2. Run the packaged application on each proposed minimum and a current system.
   Verify installation, offline core tasks, typography/layout, the full accepted
   operator/audience workflow, and persisted workspace recovery.
3. Use physical extended displays with mixed scale factors and different
   arrangements. Verify audience placement/fullscreen and pointer avoidance
   while other apps remain usable, across application switches; verify manual
   release, audience closure, display disconnection, and app exit.
4. A failed cursor gate blocks claiming that configuration meets MVP. Document
   the failure and continue feasibility work; request an explicit scope decision
   if needed. Do not silently replace avoidance with hiding, fixed locking, or
   operator-window confinement, or silently remove a platform.

These are prospective manual acceptance criteria, not completed checks.
