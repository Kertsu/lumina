# Install Lumina

Download a platform installer from this repository's
[published releases](https://github.com/Kertsu/lumina-releases/releases).
Use the assets attached to the release, rather than GitHub's automatic
**Source code** archives: those archives contain this documentation repository.

The public beta is experimental. Test it with your displays before a gathering.
You do not need Node.js, Rust, or a development server to run an installer.

## macOS

1. Choose the universal `.dmg` for Apple Silicon or Intel.
2. Open it and drag **Lumina** into **Applications**. Eject the disk image.
3. Launch **Lumina** from Applications.
4. If macOS says Apple cannot verify the app, dismiss the warning. Only if you
   trust the download, open **System Settings → Privacy & Security**, find the
   blocked app, and choose **Open Anyway**. Confirm **Open** and authenticate if
   asked. Labels can vary by macOS version.

The Mac beta uses free ad hoc signing to seal the application bundle. It has no
Apple Developer ID identity or notarization. An exception
permits that app to run; it does not establish that the app is safe. Do not
disable Gatekeeper globally. Employer/school policy can prevent exceptions.

Apple's [official instructions](https://support.apple.com/en-us/102445) explain
these controls. The build targets macOS 13.3 or later.
Runtime compatibility remains experimental.

## Windows

1. Choose the x64 `.exe` installer and run it.
2. Follow the setup prompts, then launch Lumina from the Start menu.
3. If Microsoft Defender SmartScreen blocks an unrecognized app, inspect its
   details. Some systems offer **More info → Run anyway**; proceed only after
   verifying that you intentionally downloaded this release. Organization policy
   may prevent this option.

The initial beta is not publisher-signed. Windows x64 is a build target; runtime
compatibility remains experimental. Do not disable antivirus or device policy.

## Linux

1. Choose the x64 `.AppImage`.
2. Make that file executable in your file manager's permissions, or run:

   ```sh
   chmod +x /path/to/Lumina_VERSION_linux-x64.AppImage
   ```

3. Open the AppImage. Keep it somewhere you can write if you intend to use the
   built-in updater.

AppImage runtime/FUSE requirements vary by distribution. A successful Ubuntu
22.04 build does not establish support for every distribution, display server,
or desktop environment. If launch fails, report the exact distribution/version,
architecture, and terminal error. Do not run the app as root to work around it.

## Verify a download

Each release includes `SHA256SUMS`. Compare your downloaded asset's SHA-256 with
the entry for its exact filename:

```sh
# macOS
shasum -a 256 /path/to/downloaded-file.dmg

# Linux
sha256sum /path/to/downloaded-file.AppImage
```

```powershell
# Windows PowerShell
Get-FileHash -Algorithm SHA256 'C:\path\to\downloaded-file.exe'
```

A checksum detects a mismatch with the published file. It does not replace
publisher identity verification. Lumina's updater independently requires a valid
Tauri update-package signature.

## Updating and local data

Use the Lumina menu's update entry when it appears. You choose when to install;
audience windows may close and the app may restart. Leave time to verify the
result before using it at a gathering.

Updates are intended to preserve local workspaces and the Bible library.
Uninstalling the application is not a supported database reset procedure.
Downgrading may fail if a newer app has changed the database format. Back up
important data before experimenting with versions.

`Lumina POC` packages belong to a private updater rehearsal. Their data and
loopback update feed are separate from the public app; do not use them as the
public beta installer.
