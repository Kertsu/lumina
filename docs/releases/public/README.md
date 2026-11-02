<img src="docs/assets/lumina-icon.png" alt="Lumina app icon" width="80" height="80">

# Lumina

Hi there, fellas! 👋

This is my first time releasing a freeware app. Thanks for giving Lumina a try!

Lumina helps you find Bible passages, preview them privately, and show them on a
separate audience display. The World English Bible comes included, so you can use
it offline. You can also keep different selections in separate workspaces.

It's still a beta, so expect some rough edges. Try it with your actual setup
before using it at a gathering, and keep backups of important local data. If
something breaks or feels confusing, I'd appreciate a
[bug report](https://github.com/Kertsu/lumina-releases/issues/new/choose).

I plan to fully open-source Lumina. I'm cleaning up the code first so it's easier
to read, change, and contribute to. For now, the application source is private,
and the [current freeware terms](LICENSE) apply. This repository is where you'll
find downloads, guides, and a place to report issues.

## Downloads

Head to [Releases](https://github.com/Kertsu/lumina-releases/releases) and pick the
installer for your computer. Downloads will appear there when the beta launches.
Choose a published beta; `rehearsal-` drafts and `Lumina POC` packages are for
release testing.

| Package | Architecture | Status |
| --- | --- | --- |
| macOS `.dmg` | Apple Silicon and Intel, universal | Experimental beta |
| Windows `.exe` | x64 | Experimental beta |
| Linux `.AppImage` | x64 | Experimental beta |

macOS and Windows may show security warnings when you open the installer. Mac
packages use ad hoc signing, without Apple Developer ID or notarization. Windows
installers have no publisher certificate. The [installation guide](INSTALL.md)
walks you through what to expect; managed computers may block installation.
These build targets don't guarantee compatibility with every OS version.

## Need a hand?

- [Install Lumina](INSTALL.md)
- [Use the operator and audience windows](GUIDE.md)
- [Add a Bible translation](IMPORT.md)
- [Report a bug](https://github.com/Kertsu/lumina-releases/issues/new/choose)
- [Application terms](LICENSE) and [third-party notices](THIRD_PARTY.md)

## Updates

Lumina checks quietly for updates when you're online. If you see a dot on the
Lumina menu, an update is ready. Open the menu, choose **Update available**, and
take a look at the details. Choose **Update and restart** when you're ready.
There isn't a popup just because an update was found. Installing an update can
close audience windows and restart the app, so pick a good time.

I'm keeping the beta focused on fixes while I work toward a stable release.
Beta installs receive those fixes and the eventual stable release; the stable app
then follows stable updates. The plan is to keep the same app and your data
through that transition. Beta data compatibility still needs to be verified
before the first stable release ships. POC builds use a separate test identity
and data.

## Privacy and reports

Your Bible content, workspaces, and settings stay on your computer. Update checks
contact GitHub-hosted metadata and packages. Bug reports through GitHub are
optional. Please check logs and screenshots before sharing them, and leave your
whole database and private presentation content out of public issues.

## License

Lumina is currently proprietary freeware: it's free for personal, organizational,
and commercial use. You're welcome to share the original, unmodified installers
with their notices. Distributing modified or rebranded application builds needs
permission. Your own settings and presentation content are normal app use.
Third-party components keep their own terms. See [LICENSE](LICENSE) for the full
details.
