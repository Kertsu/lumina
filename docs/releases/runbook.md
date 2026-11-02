# Release runbook

Status: planned, 2 November 2026 (Asia/Manila). The release workflows, updater,
local test helper, and publication setup described here still need implementation.
This is not yet an executable command guide.

The [beta plan](beta-plan.md) owns release policy, package targets, licensing
intent, versioning, and updater behavior. This document owns implementation
order and operating steps. Keep public-facing documentation sources on `main`.

## Implementation order

1. Land the plan and this runbook through a docs-only change based on `main`.
   Keep historical research linked to the approved policy.
2. Prepare signing credentials and updater integration in changes based on
   `1st-integrated-prototype`. Establish the shared version authority, public
   key, production/test configurations, update indicator, and confirmation flow.
3. Add workflow infrastructure separately on `main`. It must explicitly select
   beta source for beta builds; never merge the prototype to make builds work.
   Apply the necessary workflow-only commits to the beta line before tagging:
   tag-triggered runs load workflows from the tagged commit. Keep `main` as the
   workflow authority. Implement private artifacts, draft rehearsal, and
   tag-based publication for the package matrix in the plan.
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
3. Exercise cross-repo publication into a draft in the private releases repo.
   Verify installers, signed updater artifacts, metadata, and release notes.
4. Confirm a build-only run leaves the releases repo untouched. A draft run
   should leave an unpublished draft with its uploaded assets.

The maintainer performs manual testing. This rehearsal is not a recurring manual
approval requirement on future releases; their automated checks still run.

## Private updater rehearsal

Implement a one-command local helper that serves an update manifest and the
downloaded signed update files, bound only to `127.0.0.1`. It should print the
test URL and how to stop the server. No public hosting or GitHub credentials are
needed by these test apps.

Use a separate POC build configuration pointing at this server. If local HTTP
is used, enable `plugins.updater.dangerousInsecureTransportProtocol` only in that
test configuration. Keep normal signature verification enabled. Production
configuration retains HTTPS and excludes that override.

1. Build `0.1.0-beta.1` through Actions with the POC configuration. Download and
   install it on the available Mac using disposable data.
2. Bump the actual application version to `0.1.0-beta.2`, rebuild through Actions
   with the same POC configuration, and sign with the same update key. No product
   change is needed. Changing only the manifest version would not test a real
   installed-version upgrade.
3. Download the second build's updater package/signature. Start the helper so its
   manifest advertises that version and serves those files locally.
4. Launch the first build. Confirm it discovers the update silently and shows
   the update indicator without opening a popup.
5. Click the indicator. Confirm details and the installation/restart warning
   appear, and installation waits for agreement. Cancel once, then accept.
6. Confirm the app installs/relaunches as the second version and retains the test
   data. Record the two source commits, versions, host, package, and result.
7. Stop the server. These loopback-configured builds remain test-only. Build a
   later version with the production feed for launch; do not publish the POC
   packages as normal user downloads.

Keep the application identity compatible between the two test builds. Protect
existing local development data with a disposable profile/account or a backup;
the app identifier currently selects the normal managed-data location.

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

## Subsequent beta and stable releases

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
