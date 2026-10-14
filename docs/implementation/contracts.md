# MVP module contracts

Shared JSON uses camelCase. `src/lib/types.ts` owns TypeScript types.

Verse: `{ book: number, chapter: number, verse: number, text: string }`.
Book: `{ number: number, name: string, aliases?: string[], information?: { author?: string, date?: string, location?: string, source: string } }`.
Translation: `{ id: string, edition: string, title: string, abbreviation: string, description?: string, language?: string, bundled: boolean, available: boolean, books: Book[], verses: Verse[] }`.
Selection: Verse plus `{ translationId: string, edition: string, translationTitle: string, abbreviation: string, bookName: string }`.

Native storage commands:
- `load_library` -> Translation[]. Bundled WEB is read from embedded artifact; browser reads `/bibles/web.json` with identical Translation shape.
- `review_import({path})` -> `{path: string, translations: Translation[]}`; provisional IDs/edition hashes valid in review.
- `accept_import({path, choices})` -> Translation[] (entire library), choices: `{sourceId: string, action: "add" | "replace" | "restore" | "skip", targetId?: string, confirmed: boolean }[]`.
- `remove_translation({id, confirmed})` -> Translation[].
- `load_workspace` -> JSON value or null; `save_workspace({workspace})`.
- `pick_import` -> string|null; `pick_background` -> managed data URL|null (JPEG/PNG/BMP).
Native audience-open checks protect replace/remove inside backend.

Audience transport owned by audience agent in `src/lib/audience.ts`, `src/components/Audience.tsx`, `src-tauri/src/audience.rs`.
Exports: `isDesktop(): boolean`, `openAudience(): Promise<void>`, `closeAudience(): Promise<void>`, `publishAudience(payload: {selection: Selection|null, appearance: Appearance, blank: boolean}): Promise<void>`, `setAudienceFullscreen(value: boolean): Promise<void>`, `setOperatorOnTop(value: boolean): Promise<void>`, `setCursorRestriction(value: boolean): Promise<void>`, `watchAudience(callback: (open: boolean)=>void): Promise<()=>void>`.
Audience uses URL `/?audience=1`; root selects Audience component in effect/browser. Never open during projection; open starts blank. Audience render uses shared selection/appearance contracts; labels fixed.

Appearance: `{family: string, bold: boolean, italic: boolean, underline: boolean, strikeout: boolean, color: string, bands: {max: number, size: number}[], backgrounds: Record<string, {color: string, image?: string, fit: "fill"|"fit"}>}`. Size in px at a 1920-wide slide; preview scales proportionally. Full verse, no pagination/automatic fit.

Core agent owns `src/lib/{types,bible,workspace,storage,appearance}.ts` and `public/bibles/books.json` if needed. Root owns UI/CSS/routes. Storage agent owns native storage files, Cargo dependencies, WEB artifact, import/release docs. Audience agent owns native audience files/capabilities/config and frontend audience files. Root integrates `src-tauri/src/lib.rs`.
