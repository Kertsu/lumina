# macOS installer artwork

`background.png` is the approved 720 × 460-point background at 2× resolution.
Finder supplies the real Lumina and Applications icons. Its window size and
icon positions live in `../tauri.conf.json` under `bundle.macOS.dmg`.

Regenerate on macOS after editing the source artwork:

```sh
swift src-tauri/dmg/render-background.swift
```

The renderer uses AppKit/CoreText and the existing Lumina icon. Its coordinates
reserve space for Finder’s native icon labels and title bar. Keep the footer’s
bottom clearance when changing the canvas or typography; inspect a newly built
DMG in Finder after regenerating. No application rebuild is needed to inspect
DMG layout with an existing `.app` bundle.

Release tooling enables Finder styling explicitly when `CI=true`; otherwise
Tauri skips the background and icon arrangement on CI.
