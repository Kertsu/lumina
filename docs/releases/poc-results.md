# Installer build and publication results

Recorded 3 November 2026 (Asia/Manila). Automated build/publication results do not
establish runtime compatibility or qualify a live presentation setup.

## Complete production matrix

[CI run 41474985591](https://github.com/Kertsu/lumina/actions/runs/41474985591)
passed on every production target using application source
`23e150abb4154bf33120bad349d2f302729815c9`, version `0.1.0-beta.4`:

- macOS universal: Apple Silicon and Intel package.
- Windows x64: NSIS installer.
- Linux x64: AppImage.

Source checks, dependency-notice generation, installer/update builds, and private
draft publication succeeded. The universal macOS bundle passed whole-app strict
signature verification. The Windows binding tool embeds its required Common
Controls v6 manifest.

## Private publication

Draft `rehearsal-v0.1.0-beta.4` contains 16 assets: all three installers, the macOS
updater archive, update signatures, per-target provenance and notices,
`downloads.json`, `updater.json`, and `SHA256SUMS`. The run used the Actions
`RELEASES_TOKEN`, establishing CI write access to the destination. Draft assets
were checked against GitHub's reported sizes and SHA-256 digests.

The draft remains unpublished. The repository remains private with Pages disabled.
No beta/stable update feed was created or advanced. Rehearsal drafts point to the
current documentation history; installer provenance retains the exact CI source.

## Launch work still requiring evidence

- Production-identity installer runtime checks and public HTTPS update delivery.
- Core operator/audience behavior with the intended display setup.
- AppImage native runtime library notices/source requirements.
- Public anonymous website, assets, and updater access after launch approval.
