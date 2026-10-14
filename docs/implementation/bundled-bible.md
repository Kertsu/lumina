# Bundled World English Bible

The starter is the publisher's **World English Bible Protestant** (`engwebp`):
66 books, American spelling, LORD/GOD. It contains 31,103 verse rows from the
publisher's BibleWorks verse-per-line archive, acquired **14 October 2026**.
The full JSON is `public/bibles/web.json`, embedded at native compile time;
browser builds serve the identical file. First use does not fetch Bible assets.

- [Official catalog](https://ebible.org/details.php?id=engwebp)
- [Downloaded artifact](https://ebible.org/Scriptures/engwebp_vpl.zip)
- [Publisher notice](https://ebible.org/engwebp/copyright.htm)

Exact artifact hashes, publisher archive-member timestamp, acquisition date,
source URLs, and conversion details are recorded in
`public/bibles/web-provenance.json`. The runtime edition identifies the exact
publisher `engwebp_vpl.txt` bytes by SHA-256. `scripts/bundle-web.py` converts an
already downloaded archive reproducibly; it strips only the reference prefix
and line separator, keeping each verse's remaining Unicode text unchanged.
The publisher's VPL excludes footnotes, paragraph formatting, and noncanonical
section headings; Lumina does not manufacture those omitted features.

Bible text is public domain. **World English Bible** is eBible.org's trademark;
the publisher asks that changed Scripture text not retain that name. Lumina
keeps Bible provenance/terms separate from application and dependency licenses.
No author/date/location information dataset is bundled. Application MIT license
and dependency notices remain separate release deliverables.

## Release qualification

This implementation is a first prototype. Supported release claims require a
packaged offline installation and the accepted 60-minute rehearsal on physical
extended displays. Candidate baselines remain Windows 10 22H2/11, macOS 13.3+,
and updated Ubuntu 22.04/Debian 12, with Linux X11/Wayland evaluated separately.
Browser demonstrations, native compilation, and read-only import code review
are not evidence of complete desktop behavior or pointer restriction.

Windows offline packaging needs an available WebView2 runtime or an offline
runtime installer included in release preparation. Linux runtime dependencies
and WebKitGTK must be supplied or documented for the tested baseline. Record
artifact identity, OS/architecture/engine/session, installation conditions,
latency/memory observations, and actual cursor/display recovery behavior before
publishing a compatibility claim. See `docs/research/desktop-release-targets.md`.
