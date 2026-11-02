# Bundling the World English Bible

Checked 3 November 2026. Scope: WEB text and its name, not every dependency in
Lumina's installers.

## Official rules

- The publisher dedicates WEB to the public domain and permits copying,
  redistribution, electronic publication, and sale. Donations are optional.
  Its notice does not require a royalty or a separate permission request for
  this distribution. [Edition notice](https://ebible.org/engwebp/copyright.htm).
- The WEB name and logo identify faithful copies. The FAQ explicitly includes
  punctuation: if the actual text or punctuation changes, the result must not
  be presented under that name. It also asks publishers to obtain a recent
  official copy. [FAQ, publication and changes](https://ebible.org/eng-web/webfaq.htm).
- Reformatting a public-domain work is allowed; the original text remains
  public domain. A copyright claim may cover original contributions, not the
  underlying public-domain work. [eBible.org intellectual-property policy](https://ebible.org/legal.php).
- A proprietary application may therefore include the public-domain text;
  this is an inference from the unrestricted publication permissions. The
  opened notice and FAQ impose no app-source disclosure requirement or
  mandatory attribution wording. Retaining provenance and the publisher notice
  is a useful precaution, not a stated distribution condition in those sources.
  [Notice](https://ebible.org/engwebp/copyright.htm),
  [FAQ](https://ebible.org/eng-web/webfaq.htm).

## Lumina's recorded implementation

| Check | Evidence |
| --- | --- |
| Identify the acquired edition | The seed records `engwebp`, the official archive URL, acquisition/source dates, and SHA-256. [Provenance](https://github.com/Kertsu/lumina/blob/beta/crates/lumina-persistence/seed/provenance.json). |
| Retain source terms | The original publisher notice is stored with the seed. Packaging maps that notice and provenance into `notices/WEB-NOTICE.html` and `notices/WEB-provenance.json`. [Bundle configuration](https://github.com/Kertsu/lumina/blob/beta/src-tauri/tauri.conf.json). |
| Separate application and Bible rights | The application license preserves third-party rights rather than claiming ownership of the Bible text. [Application terms](https://github.com/Kertsu/lumina/blob/beta/LICENSE). |
| Preserve Scripture during conversion | The converter retains native coordinates and verse characters while removing USFM markup and annotations. Its exact extraction choices are documented. [Converter](https://github.com/Kertsu/lumina/blob/beta/scripts/prepare-web.py), [seed documentation](https://github.com/Kertsu/lumina/blob/beta/crates/lumina-persistence/seed/README.md). |

## Checks performed

- `python3 scripts/prepare-web.py --check` reproduced all 66 books and 31,098
  verse rows from the pinned publisher archive. Archive/member checksums passed;
  the committed SQLite image matched the converter's complete logical output.
- The retained `NOTICE.html` matches the archive's original `copr.htm` byte for
  byte. The CI-built beta.4 macOS updater archive contains exact copies of this
  notice and the retained provenance in its bundled `notices` directory.
- PGP signer authenticity has not been independently verified; member hash
  checks alone are not signer verification. The provenance states this limit.
  [Acquisition record](https://github.com/Kertsu/lumina/blob/beta/crates/lumina-persistence/seed/provenance.json).

## Evidence limits

The copyright permission fits Lumina's intended distribution. Calling the
converted text a faithful WEB copy additionally depends on preserving its
Scripture wording and punctuation. Rebuilding the same database with the same
converter demonstrates reproducibility, not independent text fidelity.

The opened official sources allow extracts and format changes, but do not
specifically discuss Lumina's omission of footnotes, headings, or annotation-only
verse labels. This source review has not independently compared every converted
verse against an official rendering. [FAQ](https://ebible.org/eng-web/webfaq.htm),
[format policy](https://ebible.org/legal.php).

The retained source is dated 22 October 2026; the live edition notice currently
reports 30 October 2026. A generated-page date alone does not establish a change
to Scripture. Preserve the acquisition record and check any actual source
changes before replacing the bundled edition. [Recorded provenance](https://github.com/Kertsu/lumina/blob/beta/crates/lumina-persistence/seed/provenance.json),
[current notice](https://ebible.org/engwebp/copyright.htm).
