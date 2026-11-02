# Release runbook

Status: partially implemented, 2 November 2026 (Asia/Manila). The beta updater,
build-only workflow, and local test helper are implemented. CI-generated
installers and installed upgrades still need verification. Draft uploads,
tag-based publication, and Pages setup remain planned work.

The [beta plan](beta-plan.md) owns release policy, package targets, licensing
intent, versioning, and updater behavior. This document owns implementation
order and operating steps. Keep public-facing documentation sources on `main`.

## Build private installers

The manually dispatched [Private installers workflow](../../.github/workflows/installers.yml)
checks out the selected app ref separately from the workflow infrastructure.
One resolved source commit is used across all selected platforms. It runs the
app's existing checks, builds signed updater packages and initial installers,
then stores only those files and `build-info.json` as private Actions artifacts.
It cannot publish releases or update Pages. Artifacts expire after seven days.

The workflow must first land on GitHub's default branch, `main`, for manual
dispatch. Keep its infrastructure scripts available on both release lines;
application code stays on beta. Push the beta updater commit before selecting
that branch in a run.

Configure the private source repo secret `TAURI_SIGNING_PRIVATE_KEY` using the
private key file's contents. Back up that file securely. Its public key is
already in the beta app config. Set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` only if
the key has a password; the generated initial key is passwordless and stored
outside Git with owner-only filesystem permissions.

From an authenticated `gh` session:

```sh
gh workflow run installers.yml --repo Kertsu/lumina --ref main \
  -f source_ref=beta -f platform=all \
  -f mode=poc -f app_version=0.1.0-beta.1
```

Find the run in Actions, or use `gh run list --repo Kertsu/lumina --workflow installers.yml`.
Download `installer-macos-universal-poc-0.1.0-beta.1` for the available Mac.
Other artifacts provide Windows x64 NSIS and Linux x64 AppImage packages.
Successful builds do not qualify those systems as tested.

For the second Mac build, replace `SOURCE_COMMIT` below with `sourceCommit` from
the first artifact's `build-info.json`. This keeps product code identical while
the workflow changes the Cargo workspace version and refreshes its lockfile:

```sh
gh workflow run installers.yml --repo Kertsu/lumina --ref main \
  -f source_ref=SOURCE_COMMIT -f platform=macos-universal \
  -f mode=poc -f app_version=0.1.0-beta.2
```

Download and extract `installer-macos-universal-poc-0.1.0-beta.2` separately.
The artifact includes a DMG, signed `.app.tar.gz` updater package, signature,
and provenance. Extract the Actions ZIP; leave the `.app.tar.gz` file intact.
Install `beta.1`, then from a checkout with the helper installed:

```sh
pnpm updater:poc /absolute/path/to/extracted-beta.2-artifact
```

The command serves only the selected update and its manifest at
`http://127.0.0.1:4318/latest.json`. Start or restart Lumina POC beta.1 after the
server starts, click its update indicator, and confirm installation. Stop the
server with Ctrl+C. The helper does not publish files or use GitHub credentials.

POC packages are named **Lumina POC** and use the production app identifier plus
`.poc`, giving both test versions the same separate data location. They do not
share the normal app's library. Their HTTP exception exists only in generated
build config; signature verification stays enabled. Use test data in this profile.

`mode=production` keeps the normal app identity and source-defined HTTPS update
feed; it still produces private artifacts only. Version overrides are restricted
to POC beta builds. The Mac package uses macOS 13.3 as a build minimum candidate;
this is not compatibility evidence. Linux AppImage downloads may need
`chmod +x` after extraction from the Actions ZIP.

## Implementation order

1. Keep the plan and this runbook canonical on `main`. Historical research links
   to the approved policy.
2. Updater integration lives on `beta`, with Cargo version
   authority, a public verification key, silent checks, and confirmation UI.
3. Maintain workflow infrastructure separately on `main`. It must explicitly select
   beta source for beta builds; never merge the prototype to make builds work.
   Apply the necessary workflow-only commits to the beta line before tagging:
   tag-triggered runs load workflows from the tagged commit. Keep `main` as the
   workflow authority. The current workflow implements private artifacts; draft
   rehearsal and tag-based publication remain to implement.
4. Create `Kertsu/lumina-releases` privately. Configure destination-scoped
   publishing credentials and prepare its public content. Keep Pages unpublished.
5. Run the one-time installer, draft-upload, and local-updater rehearsals below.
6. Finish application terms, bundled notices, public documentation, and
   production feed configuration. Prepare a launch build, then make the release
   repo/site public when ready and check anonymous delivery.

Populate exact workflow names, script commands, and endpoint URLs here when they
exist. Do not present unimplemented commands as working setup instructions.

## Build and publishing setup

- Register the manually dispatchable workflow on the default branch. For a manual
  beta build, dispatch that workflow with a source-ref input and explicitly check
  out beta source. Execute checks against that source, not the unrelated
  application snapshot on `main`. Apply workflow infrastructure changes to both
  release lines as described above so tag builds also have a workflow to run.
- Validate the source tag against the app version and release line. A build-only
  run uploads private Actions artifacts without creating a destination release.
  A draft rehearsal uses `releaseDraft: true`. Normal intentional version tags
  publish after successful checks/builds without a recurring draft/approval gate.
- Use destination-scoped credentials for cross-repo writes. The source repo's
  default `GITHUB_TOKEN` cannot publish to another repository.
- Back up the update-signing private key/password before the first shipped
  updater build. Keep those values in release secrets; ship only the public key.
- Produce initial installers and signed updater artifacts. On macOS, the DMG
  installs the application; the updater uses its signed application archive.
  Include manifest entries for both architectures of the universal Mac app.
- Upload all referenced packages before updating the appropriate beta/stable
  manifest. Do not use `/releases/latest/download/latest.json` to discover beta
  releases. The production manifest must be anonymously readable over HTTPS.
- Publish only an explicit allowlist of public documentation/assets from the
  private repo. Public release tags and source archives belong to the public
  documentation repo, not the private app source history.

## Installer and upload rehearsal

1. Manually build the beta source through Actions. Run the existing checks and
   download the actual generated installers from private Actions artifacts.
2. Install the Mac package, launch without a development server, and rehearse
   the core operator/audience workflow with disposable test data. Record what
   was actually tested; other configurations retain their experimental labels.
3. Once draft publishing is implemented, exercise cross-repo publication into a
   draft in the private releases repo. Verify installers, signed updater
   artifacts, metadata, and release notes.
4. Confirm a build-only run leaves the releases repo untouched. A draft run
   should leave an unpublished draft with its uploaded assets.

The maintainer performs manual testing. This rehearsal is not a recurring manual
approval requirement on future releases; their automated checks still run.

## Private updater rehearsal

Follow [Build private installers](#build-private-installers) to create both
versions from one source commit and start the helper with the second artifact.
The workflow changes the compiled Cargo version, not merely the manifest label.

1. Install the first POC build on the available Mac using disposable data.
2. Start the helper with the second build's extracted artifact. Its manifest
   advertises that version and serves the signed package locally.
3. Start or restart the first build. Confirm it discovers the update silently and shows
   the update indicator without opening a popup.
4. Click the indicator. Confirm details and the installation/restart warning
   appear, and installation waits for agreement. Cancel once, then accept.
5. Confirm the app installs/relaunches as the second version and retains the test
   data. Check the version in the native About dialog. Record the shared source
   commit, both versions, Actions runs, host, package, and result.
6. Stop the server. These loopback-configured builds remain test-only. Build a
   later version with the production feed for launch; do not publish the POC
   packages as normal user downloads.

Both test versions share the isolated POC identity/data location. Their separate
configuration retains the production public key and signature verification.

This proves update mechanics. It does not prove anonymous access to the future
public GitHub assets. Draft/private files require GitHub authorization, which the
installed app does not inherit from the maintainer's browser login.

## Launch preparation

1. Prepare the README, platform-specific installation instructions, unsigned-app
   warning guidance, app guide, release notes, and issue-report templates on
   `main`. Include tested configurations and known limitations. Publish their
   public subset into the private releases repo.
2. Reconcile the application's existing MIT file and bundled references with the
   license intent in the plan. Inventory dependencies and bundled fonts, images,
   Bible text, and metadata; include applicable notices and provenance. This
   docs change does not perform that inventory or change licenses.
3. Configure production beta/stable manifests and signed package URLs. Ensure
   the beta feed can offer the eventual stable release, and a stable app follows
   stable-only updates. Keep the production config free of local test URLs and
   private-repo credentials.
4. Build the next unused beta version with the production config. Inspect the
   installer/release contents and prepare the website. Remove rehearsal downloads
   and review the public repo's files/history before changing its visibility.
5. When ready to launch, make the releases repo public, publish the intended
   release and feed, and enable Pages. Check installation links, manifests,
   package downloads, and update discovery without a GitHub login. Repository
   privacy and draft status prevent that anonymous-access check beforehand.

## Planned subsequent beta and stable releases

Tag-driven publication is not implemented by the current build-only workflow.

1. Make beta fixes on the beta release line. Develop stabilized code and later
   new product features on `main`, using dedicated implementation branches.
2. Update the single version authority and release notes. Confirm stable code can
   read/migrate beta data before the first stable release; a branch change alone
   does not establish compatibility. Follow the existing migration convention.
3. Push the intentional version tag from the appropriate source line. The normal
   workflow runs checks, builds/signs all intended packages, publishes assets,
   and advances the correct feed only after success.
4. Confirm published links and metadata are correct. Investigate issue reports
   using app version, OS/architecture, steps, and observed behavior. Collect logs
   only when useful; remind reporters to remove private content.

Do not replace an already published version/tag with different binaries. A
corrective release gets a newer version and valid signature. Do not assume an
older application can open data migrated by a newer release.

## References

- [Tauri updater configuration and installation](https://v2.tauri.app/plugin/updater/)
- [Tauri release-action inputs and caveats](https://github.com/tauri-apps/tauri-action)
- [GitHub manual workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub workflow-token scope](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub release-asset authentication](https://docs.github.com/en/rest/releases/assets#get-a-release-asset)
