# Future enhancements

These capabilities are outside the [MVP plan](mvp.md). Reasons and reconsideration criteria guide future evaluation; scheduling requires a scope decision. Requirement history belongs in the [specification changelog](../../.scratch/lumina-mvp/spec-changelog.md).

| Capability | Current scope and reason | Reconsider when |
| --- | --- | --- |
| Verse queue | Direct verse selection and optional inspection keep the presentation workflow small | Operators need ordered preparation enough to justify queue management and persistence |
| Persistent private/live browsing and separate navigation | Temporary reference/search previews support inspection while one current-verse navigation pair controls display | Operators need ongoing private browsing independent of output |
| Cursor restriction | Hide cursor addresses visible pointer distraction while movement/input remain available | Operators need actual pointer exclusion and accept its platform integration costs |
| Dedicated reading mode | Focus on the operator's projection workflow | A distinct personal reading workflow is needed |
| Detached operator windows | One tabbed operator window identifies audience workspaces | Operators need controls simultaneously visible on separate displays |
| Bulk controls and linked navigation | Control each audience independently | A concrete workflow needs coordinated presentation actions |
| Workspace copy/clone | Fresh workspaces and ordinary clipboard Copy cover initial setup | Operators repeatedly rebuild the same workspace preparation |
| Multi-slot content | Display one verse or its replacement book information at a time per audience | Operators need several independently arranged passages/translations within one output |
| Reference ranges | Single-verse references and navigation keep display behavior simple | Operators need multi-verse selection and grouping |
| Automatic text fitting | Character-count size bands and manual reduction control readability | Real verses or display setups repeatedly need manual correction |
| Projection pagination | Each complete verse uses one slide | Long content cannot remain readable through size adjustment |
| In-app monitor picker | OS Extend, manual placement, and fullscreen provide setup | Manual display placement causes repeated friction |
| Independent reference/translation formatting | Keep label styles fixed; customize verse text | Fixed labels cannot meet a concrete readability requirement |
| Spelling/fuzzy assistance | Explicit text-matching presets define the search scope | Real queries repeatedly fail because of typos; evaluate English/Tagalog suggestions and latency |
| Semantic search | Text matching covers the first search workflow | Operators regularly recall ideas rather than wording; evaluate retrieval quality and resource cost |
| Any word, mixed expressions, cross-translation/cross-verse search, or language-specific stemming | Search one translation with the four explicit matching presets | Representative queries demonstrate a need beyond the supported matching rules |
| Other Bible book sets and book-ID mappings | Use one declared book-ID convention for the standard 66 books while preserving each edition's native integer chapter/verse numbering | Additional book sets or alternative book-ID conventions are required; evaluate identity, ordering, scopes, and references together |
| Split/suffixed and merged verse identifiers | The import contract supports positive-integer chapter/verse coordinates; unsupported identifier forms fail clearly without silent coercion | Source editions require identifiers such as `3a` or `3–4`; define a faithful representation before claiming compatibility |
| Automatic passage-equivalence mapping | Translation changes look up the same numbered coordinate and report unavailability when absent | Operators need equivalent content across numbering schemes; evaluate declared versification profiles and explicit maps |
| Separate font Script selector | Font selection/rendering covers the supported text | A writing-system requirement cannot be addressed through the current controls |
| Curated book-information dataset | Inspect and optionally project attributed import metadata | A suitable redistributable dataset is established |
| Per-verse size overrides | Share size bands within each workspace | Operators need individual adjustments without affecting similar-length verses |
| Remote/network/browser/mobile audiences | Use local native outputs on extended displays | A concrete deployment requires remote receivers |

Application-level Bible encryption is outside scope. Code licensing, Bible/metadata terms, and dependency notices remain distinct release responsibilities.

Update the plan, implementation specification, and changelog together when requirements change. Detailed engineering/UI review belongs in the [plan's remaining work](mvp.md#work-remaining-before-release), not in the enhancement backlog.
