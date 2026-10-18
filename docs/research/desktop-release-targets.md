# Desktop release targets

Research: 14 October 2026 (Asia/Manila). Primary-documentation and pinned-source
review only. No packaged Lumina compatibility or cursor behavior verified.

Lumina targets Windows, macOS, and Linux with independent audience windows and
per-workspace cursor hiding. The candidates below are qualification baselines,
not support guarantees. Downloaded packages and any supplied dependency bundle
must install offline on the documented baseline. Each supported build requires
a 60-minute packaged offline rehearsal; execution and compatibility results
remain unverified.

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
| Linux | Ubuntu 22.04 / Debian 12 as build-base candidates, with updated WebKitGTK and separate X11/Wayland evaluation | Tauri names these as examples of old bases providing the required 4.1 API package. The inspected pinned runtime enables Wry's `linux-body`, selecting WebKitGTK 2.40 APIs. Package availability and CSS behavior need verification; “4.1” is an API-package name, not an engine compatibility guarantee. [AppImage guidance](https://v2.tauri.app/distribute/appimage/), [published runtime source](https://github.com/tauri-apps/tauri/blob/e5ae5b93cdd310045191cc0526f253140ad64b87/crates/tauri-runtime-wry/Cargo.toml), [Wry features](https://github.com/tauri-apps/wry/blob/wry-v0.55.1/Cargo.toml) |

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

## Cursor visibility qualification

Qualify the [cursor visibility contract](../../.scratch/lumina-mvp/spec.md#cursor-visibility-and-shortcuts)
on each supported configuration. With Hide cursor enabled, the pointer image
must disappear over that audience and remain visible outside it. Disabling the
setting must restore visibility. Movement across edges, clicks, and normal focus
behavior remain available.

Check blank output, entering/leaving an audience, focus/fullscreen/application
changes, closure/reopening, restart, and multiple audiences with different
preferences. Native-window and rendered settings must agree. Saved preferences
belong to their workspaces; changing one must not change another.

## Proposed evidence-driven release gate

1. Record the tested artifact, CPU architecture, OS build, embedded engine,
   Linux display protocol/compositor, and package format. Claim only the matrix
   actually verified; keep other accepted targets tracked as pending.
2. Run the packaged application on each proposed minimum and a current system.
   Verify installation, offline core tasks, typography/layout, the full accepted
   operator/audience workflow, and persisted workspace recovery.
3. Use physical extended displays with mixed scale factors and different
   arrangements. Verify audience placement/fullscreen, cursor hiding and restored
   visibility, normal pointer movement/input, application switches, audience
   closure/reopening, display disconnection, and app exit. Check failure isolation
   and independent preferences across audiences.
4. A failed workflow or cursor-visibility check blocks claiming support for that
   configuration. Record the failure, unresolved configurations, and limitations
   alongside the observed results.

These are prospective packaged-app acceptance criteria, not completed checks.
