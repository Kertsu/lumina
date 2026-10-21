# Open-source release foundations

Research: 14 October 2026 (Asia/Manila). Facts informed Lumina's selected MIT
license and WEB Protestant edition. These are practical summaries of license
text, not a legal determination. No dependency license audit or app execution
performed.

## Verified: application-license options

| License | Redistribution obligations | Practical tradeoff |
| --- | --- | --- |
| [MIT](https://opensource.org/license/mit) | Include the copyright and permission notice in copies or substantial portions. | Short, permissive; proprietary forks allowed. No source-publication requirement or explicit patent grant in its text. |
| [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | Include the license; mark changed files; retain relevant notices in distributed derivative source. Carry applicable upstream `NOTICE` attributions when a `NOTICE` exists (§4). | Permissive; proprietary forks allowed. Explicit contributor patent grant, with covered patent-litigation termination (§3); more notice bookkeeping. No general trademark grant (§6). |
| [GPLv3](https://opensource.org/license/gpl-3.0) | Preserve notices/license; mark distributed modifications and license covered derivative works under GPLv3 (§§4–5). Binary distribution requires access to Corresponding Source through an allowed method (§6), including necessary build/control scripts. | Copyleft keeps distributed covered forks under GPL. More release/source compliance; private modifications need not be published (§2). Independent aggregates are not automatically covered (§5). |

All three permit commercial distribution. Choosing GPLv3 would also require
deciding `GPL-3.0-only` versus `GPL-3.0-or-later`; the license describes the
later-version option in §14. Application licensing does not establish rights to
third-party Bible text or metadata. The licenses above govern their covered
works; imported/bundled material needs its own provenance and applicable terms.

## Verified: bundled World English Bible

eBible.org declares WEB public domain and explicitly permits copying,
redistribution, publication, and sale. It identifies “World English Bible” as
its trademark and asks that changed actual text no longer use that name. The
inspected notice specifies no mandatory attribution formula; credit remains a
useful provenance proposal, not a stated condition of that notice.
[Official notice](https://ebible.org/eng-web/copyright.htm).

“WEB” alone does not fix the edition or book set. Classic uses American spelling
and Yahweh and includes Deuterocanon/Apocrypha. The publisher also offers a
66-book Protestant subset of WEB Update using LORD/GOD and American spelling.
These are publisher-provided alternatives.
[Classic catalog](https://ebible.org/details.php?id=eng-web),
[66-book edition](https://ebible.org/engwebp/).

The Classic catalog offers USFM and verse-per-line plus SQL downloads; this does
not establish that its SQL matches Lumina's contract. The notice calls Classic
a stable 2020 text edition while allowing typo corrections, so a release should
identify its actual source artifact rather than only “WEB.”
[Downloads](https://ebible.org/details.php?id=eng-web),
[Edition notice](https://ebible.org/eng-web/copyright.htm).

## Evidence limit: book information

Lumina supports optional attributed import metadata for book name, author,
writing date, and writing location. The [implementation specification](../../.scratch/lumina-mvp/spec.md#book-information-projection)
defines its display behavior. A curated bundled dataset remains deferred until
a suitable redistributable source is established. Define the metadata format and
provenance contract before implementation; attribution alone does not establish
redistribution permission.

## Accepted choices and remaining release work

- MIT selected for Lumina code, accepting proprietary/commercial forks with
  retained notices. Add the license file and collect dependency and release
  notices before distribution.
- The publisher's WEB Protestant edition selected for the 66-book starter.
- Record bundled WEB's exact edition, official source, acquisition date, and
  artifact hash; preserve Scripture text and keep app/data terms distinguishable.
- Credit WEB and link its notice as provenance. Lumina accepts optional attributed
  book-information metadata supplied with Bible imports; a curated bundled
  dataset is deferred until an appropriate source is established. Attribution
  and redistribution permission remain separate concerns.
