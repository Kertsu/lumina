# Release runbook

Status: private preparation, 3 November 2026 (Asia/Manila). The complete production
installer matrix and CI-authenticated private draft publication passed in
[run 41474985591](https://github.com/Kertsu/lumina/actions/runs/41474985591).
Installer builds do not establish runtime compatibility. See [recorded results](poc-results.md).
Publishing infrastructure in this change still needs to land on `main`.

The [beta plan](beta-plan.md) owns release policy. This document owns operating
steps. Workflow infrastructure, public-documentation sources, and launch media
live on `main`; the beta application stays on `beta`.

## Credentials

`Kertsu/lumina` already has `TAURI_SIGNING_PRIVATE_KEY`. Keep its private backup
outside Git. Set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` only for a password-protected
key. The app embeds the public verification key, never the private key.

For cross-repository publishing, the maintainer creates a fine-grained personal
access token in [GitHub settings](https://github.com/settings/personal-access-tokens/new):

1. Resource owner: `Kertsu`.
2. Repository access: **Only select repositories → lumina-releases**.
3. Repository permissions: **Contents → Read and write**. Metadata read access is
   automatic. Do not grant source-repository, workflow, or account permissions.
4. Choose an expiration and retain the rotation date.
5. In private `Kertsu/lumina`, open **Settings → Secrets and variables → Actions →
   New repository secret**. Name it `RELEASES_TOKEN` and enter the token there.
   Do not paste it into a chat, source file, issue, or shell command argument.

The normal `GITHUB_TOKEN` stays read-only and source-repository scoped. Only the destination
preflight and publication steps receive `RELEASES_TOKEN`; build jobs receive the updater signing
key only for signing. A missing publication secret fails before expensive builds.
The complete-matrix CI rehearsal verified `RELEASES_TOKEN` by uploading all
production packages into an unpublished destination draft.

## Build private installers

The [Installers workflow](../../.github/workflows/installers.yml) resolves one
source commit, checks that app source on every selected platform, builds signed
updates/installers, and uploads private Actions artifacts retained for seven days.
The workflow's `main` checkout owns tooling; app code is checked out separately.

```sh
gh workflow run installers.yml --repo Kertsu/lumina --ref main \
  -f source_ref=beta -f platform=all -f mode=production \
  -f publication=none
```

Inputs:

| Input | Meaning |
| --- | --- |
| `source_ref` | Branch, tag, or **full 40-character commit SHA**; default `beta` |
| `platform` | `all`, `macos-universal`, `windows-x64`, or `linux-x64` |
| `mode` | `poc` uses a local feed/separate data; `production` uses the normal identity/HTTPS feed |
| `app_version` | Optional POC beta override; production uses committed Cargo version |
| `publication` | `none` leaves the destination untouched; `draft` rehearses unpublished uploads |

Do not supply an abbreviated SHA: `actions/checkout` may interpret it as a branch.
Download the desired `installer-TARGET-MODE-VERSION` from the run. The artifact
contains the installer, updater package/signature, `build-info.json`, and generated
third-party notices. Leave a Mac updater `.app.tar.gz` intact.

Production builds derive the beta/stable HTTPS endpoint from the Cargo version.
Both Mac architectures receive entries for the universal package. POC HTTP/TLS
exceptions remain confined to the generated test configuration.

## Dependency notices

CI installs pinned `cargo-about 0.9.3`, generates a target-specific Rust report,
and reads the installed production JavaScript dependency graph with pnpm. The
[notice generator](../../scripts/notices.mjs) preserves original license text,
font notices, source locations, and material credits in a bundled HTML report.
Raw tool metadata containing local paths is private build scratch, never an asset.
Missing license text stops generation. The version-pinned clarification for
`react-remove-scroll-bar 2.3.8` records its upstream notice and checksum.

Mac builds explicitly use `signingIdentity: "-"`. This free ad hoc signature
seals the app bundle; it is separate from updater signatures and does not
establish Apple publisher trust or notarization. The build verifies the whole
`.app` with `codesign --verify --deep --strict` before collecting artifacts.

The report and original WEB notices are included in app resources. Each public
release also uploads its per-target HTML notices. Before launch, inspect the
actual AppImage's bundled native runtime libraries and their notice/source
requirements; Rust/npm inventories do not inventory system libraries copied by
an external bundler. Keep those results with the release evidence.

## Private updater rehearsal

POC builds are **Lumina POC**, identifier `com.kurtddanielbigtas.lumina.poc`.
They share their own data and do not use the production library/profile.

For a repeat investigation, build two POC versions from one full source SHA:

```sh
gh workflow run installers.yml --repo Kertsu/lumina --ref main \
  -f source_ref=FULL_SOURCE_SHA -f platform=macos-universal \
  -f mode=poc -f app_version=0.1.0-beta.N -f publication=none
```

Use a strictly newer compiled version for the second build. With its extracted
artifact downloaded locally:

```sh
pnpm updater:poc /absolute/path/to/extracted-newer-artifact
```

The helper serves only the selected signed package and manifest on
`http://127.0.0.1:4318/latest.json`. Quit/reopen the installed older POC app,
confirm detection, choose Later once, then install/restart. Check About and
workspace retention. Stop the server with Ctrl+C.

The dot appears only when an update exists. Open the Lumina menu to review and
confirm an available update. These packages remain test-only. Private/draft GitHub assets cannot be downloaded
anonymously by the installed updater.

## Draft upload rehearsal

`Kertsu/lumina-releases` exists privately. Pages remains disabled. Its main branch
contains only explicitly allowlisted user docs, branding, media, and notices.
The [publisher](../../scripts/publish-release.mjs) never mirrors source history.
Destination release tags point to documentation commits, not private app commits.

For documentation-only updates, use a descriptive commit message. With `gh`
authenticated for destination writes, run from the private source repository:

```sh
node scripts/publish-release.mjs --docs docs/releases/public \
  --sync-docs --message "docs: update Bible import instructions"
```

`--message` is required for this mode. Unchanged files create no commit. Normal
release publication names its documentation/feed commits with the app version.

For the first production configuration rehearsal, after credentials and this
workflow land on `main`, build beta source with `publication=draft`:

```sh
gh workflow run installers.yml --repo Kertsu/lumina --ref main \
  -f source_ref=beta -f platform=all -f mode=production \
  -f publication=draft
```

This creates `rehearsal-vVERSION` as an unpublished draft. It uploads installers,
updater packages/signatures, per-target provenance/notices, `updater.json`,
`downloads.json`, and `SHA256SUMS`. It does **not** change the website catalog or
beta/stable feeds. POC drafts and partial-platform drafts are allowed for a
rehearsal; normal publication requires all production targets.

Verify the draft assets and private build contents. Do not publish a rehearsal
release manually. An existing destination tag/release is never overwritten;
inspect any failed draft and remove that disposable draft before retrying it.
The original Mac POC draft is recorded in [results](poc-results.md).

## Launch preparation

1. Merge the main-based infrastructure/docs PR. The tag-aware workflow, app terms,
   and version preparation are applied separately to `beta`; keep its workflow
   aligned before tagging. The next initial public version is `0.1.0-beta.4`.
2. Confirm application terms, dependency/material notices, installed core
   operator/audience behavior, and production packaging. The [public docs](public/README.md)
   describe beta runtime compatibility as experimental on all targets.
3. Review the [download page](public/docs/index.html), installer instructions,
   app guide, media credits, issue form, and public repository history. Its
   default buttons link to Releases until a production catalog is published.
4. Remove disposable rehearsal releases before launch. Keep the source repo
   private. At the approved launch, make the releases repo public and enable
   Pages from **main /docs**. The website is
   `https://kertsu.github.io/lumina-releases/`; keep it unpublished until then.
5. Push the intentional production source tag only after the repository and
   website are ready. Normal publication requires a public destination with Pages enabled.
6. Check downloads, JSON manifests, installation, and updater discovery without
   GitHub login. Private preparation cannot prove anonymous delivery.

## Subsequent beta and stable releases

1. Make beta fixes on `beta`; stabilize separately and add later product features
   on `main`. Update the root Cargo workspace version and lockfile.
2. Add `docs/releases/notes/VERSION.md` on `main`. Confirm beta-data compatibility
   before the first stable release; the current `main` app cannot replace beta.
3. Push `vVERSION` from the correct source line. Tags must match Cargo and point
   into `beta` for prereleases or `main` for stable. Ordinary pushes build no
   public release. Tag-triggered runs use workflow tooling/docs from `main`.
4. All targets must pass checks and builds. Assets are uploaded into a draft,
   then published automatically; there is no recurring human draft gate.
5. Only after complete asset publication does one destination commit advance the
   feed/catalog. Beta advances beta; stable advances stable and beta, preserving
   a newer future-beta feed. The stable binary checks stable only. Feeds cannot
   move backward. Once stable exists, later betas do not replace the default
   website download catalog.

Do not replace published binaries/tags. Use a new version for corrections.
If publication completes but a feed write fails, inspect the published assets and
repair the feed using their exact manifest; do not rebuild and overwrite them.
Downgrades are not a supported database migration strategy.

## Primary references

- [Tauri updater](https://v2.tauri.app/plugin/updater/)
- [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Fine-grained token setup](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [cargo-about configuration](https://embarkstudios.github.io/cargo-about/cli/generate/config.html)
- [MPL-covered source obligations](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)
