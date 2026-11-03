<p align="center">
  <img src="docs/assets/lumina-icon.png" alt="Lumina app icon" width="128" height="128">
</p>

<h1 align="center">Lumina</h1>

<p align="center"><strong>Scripture, ready for the room.</strong></p>

<p align="center">Free desktop software for finding and presenting Bible passages.</p>

<p align="center">
  <a href="https://kertsu.github.io/lumina-releases/download/"><strong>Download beta</strong></a>
  · <a href="GUIDE.md">User guide</a>
  · <a href="https://github.com/Kertsu/lumina-releases/issues/new/choose">Report a bug</a>
</p>

<p align="center">Public beta · macOS · Windows · Linux</p>

---

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

Head to the [download page](https://kertsu.github.io/lumina-releases/download/)
and pick the installer for your computer. [GitHub Releases](https://github.com/Kertsu/lumina-releases/releases)
has release notes and all packages.

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

## Buy me a coffee

I turn caffeine into software. If Lumina comes in handy and you'd like to send
a little thanks, here's where you can buy me a coffee. Always optional.
Lumina is free either way.

<table>
  <tr><th>GCash</th><th>GoTyme</th><th>MariBank</th></tr>
  <tr>
    <td align="center"><a href="docs/assets/support/gcash.png"><img src="docs/assets/support/gcash.png" alt="GCash receiving QR" width="180"></a></td>
    <td align="center"><a href="docs/assets/support/gotyme.png"><img src="docs/assets/support/gotyme.png" alt="GoTyme receiving QR" width="180"></a></td>
    <td align="center"><a href="docs/assets/support/maribank.png"><img src="docs/assets/support/maribank.png" alt="MariBank receiving QR" width="180"></a></td>
  </tr>
  <tr>
    <td align="center">KU**D DA***L B.<br><a href="docs/assets/support/gcash.png">Open full size QR</a></td>
    <td align="center">KURTD BIGTAS<br><a href="docs/assets/support/gotyme.png">Open full size QR</a></td>
    <td align="center">KURTD DANIEL B.<br><a href="docs/assets/support/maribank.png">Open full size QR</a></td>
  </tr>
</table>

Thanks for the support!

## License

Lumina is currently proprietary freeware: it's free for personal, organizational,
and commercial use. You're welcome to share the original, unmodified installers
with their notices. Distributing modified or rebranded application builds needs
permission. Your own settings and presentation content are normal app use.
Third-party components keep their own terms. See [LICENSE](LICENSE) for the full
details.
