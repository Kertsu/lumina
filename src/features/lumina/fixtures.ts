/** Rendering contracts. Accepted application data comes from the typed bridge. */
export type TranslationId = string;

export type Verse = {
    id: string;
    book: string;
    bookId: number;
    chapter: number;
    verse: number;
    text: string;
    translation: TranslationId;
    translationTitle?: string;
    editionId?: string;
    candidateId?: string;
    historyActionId?: string;
    highlights?: { start: number; end: number }[];
};

export type Translation = {
    id: TranslationId;
    name: string;
    shortName: string;
    language?: string;
    description?: string;
    bundled?: boolean;
    importLabel?: string;
    bookCount?: number;
    verseCount?: number;
};

export type BookMetadata = {
    name: string;
    author?: string;
    date?: string;
    location?: string;
    attribution?: string;
};

export function referenceLabel(verse: Verse): string {
    return `${verse.book} ${verse.chapter}:${verse.verse}`;
}
