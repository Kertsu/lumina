export interface Verse {
    book: number;
    chapter: number;
    verse: number;
    text: string;
}

export interface Book {
    number: number;
    name: string;
    aliases?: string[];
    information?: {
        author?: string;
        date?: string;
        location?: string;
        source: string;
    };
}

export interface Translation {
    id: string;
    edition: string;
    title: string;
    abbreviation: string;
    description?: string;
    language?: string;
    bundled: boolean;
    available: boolean;
    books: Book[];
    verses: Verse[];
}

export interface Selection extends Verse {
    translationId: string;
    edition: string;
    translationTitle: string;
    abbreviation: string;
    bookName: string;
}

export interface Background {
    color: string;
    image?: string;
    fit: "fill" | "fit";
}

export interface SizeBand {
    max: number;
    size: number;
}

export interface Appearance {
    family: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikeout: boolean;
    color: string;
    bands: SizeBand[];
    backgrounds: Record<string, Background>;
}

export type SearchMode = "all-words" | "phrase" | "word-starts" | "contains";
export type SearchScope =
    | "all"
    | "ot"
    | "nt"
    | "moses"
    | "gospels"
    | "paul"
    | number;
export type SearchOrder = "best" | "bible";

export interface Highlight {
    start: number;
    end: number;
}

export interface SearchResult {
    selection: Selection;
    highlights: Highlight[];
    score: number;
}

export type ReferenceResult =
    | { status: "resolved"; selection: Selection }
    | { status: "ambiguous"; candidates: ReferenceCandidate[]; message: string }
    | { status: "invalid" | "unavailable"; message: string };

export interface ReferenceCandidate {
    book: number;
    chapter: number;
    verse: number;
    bookName: string;
    selection: Selection | null;
}

export interface QueueEntry {
    id: string;
    translationId: string;
    book: number;
    chapter: number;
    verse: number;
    translationTitle: string;
    bookName: string;
}

export interface HistoryEntry {
    id: string;
    selection: Selection;
    action: "preview" | "live";
    timestamp: string;
}

export interface Workspace {
    queue: QueueEntry[];
    history: HistoryEntry[];
    selectedTranslationId: string;
    appearance: Appearance;
}

export interface WorkspaceEntry {
    id: string;
    name: string;
    state: Workspace;
}

export interface WorkspaceCollection {
    version: 2;
    activeWorkspaceId: string;
    workspaces: WorkspaceEntry[];
}

export interface ImportReview {
    path: string;
    translations: Translation[];
}

export interface ImportChoice {
    sourceId: string;
    action: "add" | "replace" | "restore" | "skip";
    targetId?: string;
    confirmed: boolean;
}
