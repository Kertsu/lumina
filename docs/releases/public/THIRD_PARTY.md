# Third-party material

Lumina's freeware terms cover the application-owned material. They do not
replace the licenses of its dependencies or your imported content.

## Software dependencies

Production release packages must include generated dependency notices for the
locked JavaScript and Rust dependency graph. The release also provides those
notices as downloadable assets. Notices identify component versions, applicable
license text, and upstream source locations. The release build must stop if
required notice generation fails.

Unmodified MPL-covered dependency source is available at the exact versioned
source location identified in its notice. Those components retain MPL rights;
Lumina's proprietary terms do not restrict them. Lumina does not modify vendored
dependency sources.

## Linux libraries and AppImage runtime

Linux packages also include native-library copyright notices and full license
texts. The matching release provides `THIRD-PARTY-SOURCES-VERSION-linux-x64.tar.zst`:
exact Ubuntu source packages, distro patches/build rules, and the AppImage
runtime's sources and relinking inputs. These are third-party components and
packaging recipes; the archive does not contain Lumina's application source.

To use modified native libraries, extract the AppImage with
`./Lumina.AppImage --appimage-extract`, replace the relevant library in
`squashfs-root/usr/lib`, and run `squashfs-root/AppRun`. Library ABI compatibility
still matters. The source archive's README explains its contents and build inputs.
The components' licenses preserve their own modification and debugging rights.

## Fonts

The application bundles **DM Sans** and **Cormorant Garamond** through Fontsource,
under the SIL Open Font License 1.1. Their original copyright and OFL notices
must accompany the font files. Other development dependencies may appear in the
generated inventory even when their assets are not used in the final UI.

## Background photographs

Bundled backgrounds were obtained from Unsplash:

- Mountain valley: <https://images.unsplash.com/photo-1464822759023-fed622ff2c3b>
- Forest: <https://images.unsplash.com/photo-1472396961693-142e6e269027>
- [Unsplash license](https://unsplash.com/license)

They are used as app backgrounds. The photo collection is not a separate stock
image service. Imported user images retain their own terms.

## World English Bible

The bundled `engwebp` edition is the 2020 stable World English Bible text,
obtained from eBible.org's archive dated 22 October 2026. The text is public
domain; **World English Bible** is an eBible.org trademark. Changed Scripture
wording or punctuation must not be represented as the World English Bible.

The original publisher notice and acquisition provenance accompany the
application. Source: <https://ebible.org/engwebp/>. This permission does not apply
automatically to other Bible translations imported by users.

Official distribution terms: [edition notice](https://ebible.org/engwebp/copyright.htm),
[publication FAQ](https://ebible.org/eng-web/webfaq.htm), and
[eBible.org intellectual-property policy](https://ebible.org/legal.php).
These permit redistribution, including sale. The Bible text remains public domain;
Lumina's proprietary application terms do not restrict it.
