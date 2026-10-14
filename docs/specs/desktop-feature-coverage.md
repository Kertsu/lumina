# Desktop feature coverage

Source: maintainer-supplied digi-bible-documentation.docx.pdf, 27 pages, plus the previously supplied Notion current-state page. The PDF is a functional reference derived from screenshots and notes; it is not runtime or algorithm verification. The MVP aims to preserve existing capabilities where feasible, with explicit scope decisions for omissions.

| Capability | Evidence | Current MVP position |
| --- | --- | --- |
| Select an active translation | PDF p. 8 | Ordinary selection preserves audience content; Change translation on the live reference previews that reference in the chosen translation, then Send Live projects it |
| Four Single/Multiple and Exact/With Similar search modes | PDF p. 9 | Replaced by All words/Phrase/Word starts/Contains text; multi-word matching and normalization accepted; spelling assistance and semantic search deferred |
| Search summary, result count, highlighted verse text | PDF pp. 7, 10 | Required; summary appears inline with query, translation, and scope |
| Numbered pagination, First/Previous/Next/Last, current/total pages, NT-result jump | PDF pp. 11-12 | Numbered pagination accepted; Best match default and Bible order available; NT jump in Bible order; exact controls/page size pending |
| Entire Bible, OT, NT, Books of Moses, Gospels, Epistles of Paul scopes | PDF p. 13 | Accepted alongside specific-book scope; Entire Bible default; Moses=Genesis-Deuteronomy, Gospels=Matthew-John, Paul=Romans-Philemon; Hebrews available in NT/specific-book scopes |
| Translation list via F1; search via F3 | PDF pp. 14-15 | F1/F3 retained; F7 opens book information; Ctrl/Cmd+Enter sends the private preview live while the operator window is focused |
| Book information via F7: name, date, author, writing location | PDF p. 16 | Optional attributed metadata supplied with Bible imports (Q50); unavailable state accepted; optional format/provenance fields pending; no curated bundled dataset until an appropriate source is established |
| Font size by character-length band, current length, confirm/cancel | PDF pp. 19-20 | Editable global bands with current length/active range; manual changes update the shared band and persist (Q48); one verse per slide; Apply/Cancel accepted; initial ranges/values pending; auto-fit, pagination, and per-verse overrides deferred |
| Viewed-verse history, translation, count, Save to computer | PDF p. 21 | Timestamped preview/projection actions, newest first, repeats and Sent Live filter; retain original wording/labels after Bible changes; saved copies support preview/copy/export/re-projection; adjacent navigation requires the original edition; clearing requires confirmation |
| Font family/style/size, underline/strikeout/color, Script selector, sample preview, three text targets | PDF p. 22 | Verse-text family, size, bold/italic, color, underline, strikeout accepted (Q41); labels have fixed styles/sizes; independent label controls and the separate Script selector deferred |
| Default background and replacement image | PDF p. 23 | Per-translation backgrounds with readable fallback and global font defaults accepted; JPEG/PNG/BMP copied into managed storage; Fill/crop default and Fit accepted (Q49); decoding/limits pending |
| Minimize and close controls | PDF pp. 17-18 | Closing the operator saves persistent workspace state and closes the audience; startup opens only the operator window. Open Audience opens/reopens blank for display setup; projection requires the audience to be open; disconnection preserves operator work |
| Direct reference entry, abbreviations, immediate display | Maintainer's account and Notion current-state page | Bottom bar accepts references only; Enter projects valid, unambiguous input; separate word-search results preview before Send Live |
| Previous/next verse, copy, per-translation background, cursor restriction, always-on-top | Notion current-state page | Separate live/private navigation accepted (Q23), preserving the other target and using each target's translation; copy/backgrounds accepted; audience cursor hidden; cursor restriction is a manual, initially-off toggle (Q54), preserving its state across fullscreen/application changes; placement/platform support remain to verify; operator always-on-top optional where supported |

## Evidence limits

- The PDF leaves matching algorithms unspecified (pp. 24, 27). Neither fuzzy edit-distance matching nor semantic search is established.
- Android FTS4/LIKE findings describe the Android artifact only.
- The PDF shows Script set to Western in the font dialog, but does not establish the legacy application's handling of that selection. In the standard Windows font dialog, Script selects a character set. [Microsoft Font dialog documentation](https://learn.microsoft.com/en-us/windows/win32/dlgbox/font-dialog-box).
- The PDF leaves C, BF, BI, <> and ^ toolbar actions unspecified; the Notion account provides additional descriptions.
- Passage ranges are deferred beyond MVP; single-verse Previous/Next navigation remains in scope.
- The maintainer reports sensible size defaults and manual reduction have been sufficient in the current application. Auto-fit and projection pagination are deferred.
- Verse history preserves timestamped preview and projection actions, newest first, including repeat visits. Its Sent Live filter provides projection history; searching and scrolling do not create entries.
- Spelling assistance and semantic search are confirmed deferrals. The four Android-inspired presets, multi-word matching, normalization, ordering, execution, and scopes are accepted. Desktop REA can inform a later comparison within the accepted scope.

Confirmed omissions and reconsideration criteria are tracked in [future enhancements](future-enhancements.md).
