# Beta release plan

Approved: 2 November 2026 (Asia/Manila). See the [runbook](runbook.md) for
implementation and verification status.

This is the canonical release policy. The [runbook](runbook.md) owns execution
steps and implementation order. Policy approval does not establish completed
testing. The application terms now live in the root LICENSE; evidence is
recorded separately in the runbook.

## Ownership and branches

| Location | Owns |
| --- | --- |
| Private `Kertsu/lumina`, `main` | Independently stabilized application code |
| Private `Kertsu/lumina`, `beta-release` | Canonical release documentation, public-documentation sources, workflow infrastructure, and download site |
| Private `Kertsu/lumina`, `beta` | Beta application, bug fixes, updater integration, and packaging changes |
| `Kertsu/lumina-releases` | Published installers, update metadata, public documentation, GitHub Issues, and GitHub Pages |

Do not merge `beta` or `beta-release` into `main`. Target release infrastructure
and documentation changes at `beta-release`. Build application code from its own
ref; the foundation code inherited by `beta-release` is not the beta application.

Freeze beta product features. Allow bug fixes and release/updater infrastructure.
Stabilize code on `main` before adding further product features there.

Keep release documentation canonical on `beta-release`. Publish an explicit
public-docs subset into the releases repo; do not mirror the private source repository.

## Launch and platform claims

Prepare `lumina-releases` privately. Make it public for the public beta only when
its downloads, README, installation instructions, app guide, license terms,
third-party notices, and website are ready. Keep Pages unpublished during private
preparation: private repository visibility does not itself make a Pages site
private.

| Platform | Initial installer | Architecture |
| --- | --- | --- |
| Windows | NSIS `.exe` | x64 |
| macOS | Universal `.dmg` | Apple Silicon and Intel |
| Linux | `.AppImage` | x64 |

These are build targets, not verified compatibility claims. Label beta runtime
compatibility **experimental** in downloads and release notes. Record automated
build/publication results separately. Users can report problems through public
GitHub Issues.

The [earlier target research](../research/desktop-release-targets.md) supplies
qualification candidates. Its proposed per-platform rehearsal is not a gate on
this experimental beta.

## Versions, tags, and publication

Use prerelease counters toward the first stable release:

```text
0.1.0-beta.1 -> 0.1.0-beta.2 -> ... -> 0.1.0
```

Increment `beta.N` for each published beta, regardless of the number of fixes.
Reserve the normal version for stable. Subsequent stable fixes/features follow
the [repository's SemVer convention](../../CONTRIBUTING.md#semver).

Use one application-version authority: the root Cargo workspace version, which
the desktop crate already inherits. Let Tauri derive that version from Cargo;
derive or validate release metadata and the source tag against it.

An app version identifies the installed release. A private-source Git tag such
as `v0.1.0-beta.1` records its source commit. A release in the public repo hosts
the resulting assets. Tags in the two repos refer to their own histories; a
public release tag does not point into the private source repository.

After the one-time rehearsal, intentional version tags trigger existing
automated checks, installer/update builds, and publication. Beta tags select beta
source; stable tags select stabilized `main` source. Ordinary branch pushes do
not publish releases. Tag builds pin tooling/docs from `beta-release` separately
from application source. There is no recurring draft or manual-approval stage.

Keep build-only, draft-rehearsal, and normal publication behavior explicit.
`if: github.ref_type != 'tag'` only gates a step; it does not define workflow
triggers or protect another publishing step.

Publish complete signed assets before advertising them in update metadata.
Failed checks or incomplete builds must not advance the update feed. Beta
discovery must not depend on GitHub's latest-release endpoint, which excludes
prereleases.

## Updater behavior and data compatibility

- Check silently when network access is available. Offline/check failures must
  leave import, search, navigation, and projection usable.
- Show a persistent update indicator when a newer release is available. Finding
  an update must not open a popup.
- Clicking the indicator opens update details and installation confirmation.
  Download/install only after the operator agrees. Explain that installation
  may close/restart Lumina.
- Allow installation during an active presentation when the operator confirms;
  do not add a presentation-state restriction.
- Beta users receive subsequent beta fixes and the first stable release. The
  stable application then follows stable-only updates. Future betas require
  explicit opt-in; a beta opt-in UI is not required for the initial beta.

Keep the installed application identity and managed data compatible through
beta-to-stable upgrades. Stable development must preserve beta migration/data
contracts even though its code is developed separately on `main`.

At planning time, both branches use `com.kurtddanielbigtas.lumina`, but `main`
supports database schema 1 and the prototype supports schema 6. Current `main`
cannot replace the beta application and open its database. A future stable
release needs both a newer app version and beta-compatible persistence.

The updater must use public HTTPS metadata and assets in production, without
private-repository credentials in installed apps. A beta feed must offer the
eventual stable release; the stable binary must use a stable-only feed. SemVer
comparison alone does not implement channel selection.

## Signing and licensing

Use Tauri's mandatory update-package signatures. Generate the keypair, back up
the private key/password, make signing credentials available only to release CI,
and embed the public verification key. This signing is free and separate from
Apple/Windows publisher signing, which is excluded from the initial beta.
Mac packages use free ad hoc bundle signing (`signingIdentity: "-"`); it does not
provide Developer ID trust or notarization.

Document unsigned-installation warnings and possible platform policy blocks.
Installation instructions and disclaimers do not establish software safety or
guarantee removal of liability.

Approved application-license intent:

- Proprietary freeware, with the source repository private.
- Free personal, organizational, and commercial use.
- Redistribution of original, unmodified installers with their notices allowed.
- Distribution of altered or rebranded program builds requires permission.
- Ordinary changes to settings and presentation content remain normal app use.

This supersedes the app-license choice in the
[earlier research](../research/open-source-release.md), not its third-party
research. The root LICENSE implements the approved freeware terms for new application releases. It does not revoke permissions already granted for earlier MIT-licensed copies. Retain applicable dependency, font, image, and Bible-data terms/notices separately; the application policy does not replace them.

## One-time proof of concept

Use private Actions artifacts to verify actual generated installers. Separately
exercise cross-repo uploads with `releaseDraft: true` in the private releases
repo. A draft creates a release object and uploads real assets; it is not a
zero-write dry run.

Check updater mechanics with two CI-built versions and a temporary local
server. Only the application version needs to change between them once
the updater exists. The [runbook](runbook.md#private-updater-rehearsal) defines
this local-only test and the one-command helper to implement.

Draft/private assets are not anonymously available to the installed updater.
The local rehearsal checks detection, signatures, confirmation, installation,
and data retention; public download access needs a final check at launch.

## Primary references

- [Tauri updater: signing, configuration, manifests, and installation](https://v2.tauri.app/plugin/updater/)
- [Tauri release action](https://github.com/tauri-apps/tauri-action)
- [GitHub manual workflow dispatch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub Actions artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
- [GitHub latest-release behavior](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)
- [GitHub Pages visibility](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [SemVer precedence](https://semver.org/#spec-item-11)
