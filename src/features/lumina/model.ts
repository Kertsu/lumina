import type {
    BookMetadata,
    Translation,
    TranslationId,
    Verse,
} from "./fixtures";

export type SearchMode = "all" | "phrase" | "starts" | "contains";

export type Appearance = {
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    color: string;
    background: string;
    backgrounds: Record<TranslationId, string>;
    fit: "cover" | "contain";
    bands: { min: number; max: number; size: number }[];
};

export type HistoryEntry = {
    id: string;
    verse: Verse;
    timestamp: number;
    projected: boolean;
    outcome?: "selected" | "awaitingConfirmation" | "unconfirmed" | "projected";
    action: string;
};

export type Workspace = {
    id: string;
    name: string;
    translation: TranslationId;
    current: Verse | null;
    preview: Verse | null;
    status: "closed" | "blank" | "live";
    information: boolean;
    hideCursor: boolean;
    alwaysOnTop?: boolean;
    fullscreen?: boolean;
    appearance: Appearance;
    history: HistoryEntry[];
    query: string;
    submittedQuery: string;
    mode: SearchMode;
    scope: string;
    page: number;
    order: "best" | "bible";
    historyProjectedOnly: boolean;
    searchResults: Verse[];
    searchTotal: number;
    searchPages: number;
    ntPage?: number | null;
    chapterVerses: Verse[];
    books: { id: number; name: string }[];
    metadata: BookMetadata | null;
    projectionOutcome?: string;
};

export type ImportReview = {
    id: string;
    label: string;
    translations: { title: string; bookCount: number; verseCount: number }[];
    warnings: string[];
};

type ScopedAction<T extends string> = { type: T; workspaceId: string };
export type DeskAction =
    | { type: "add" }
    | { type: "cancelReferenceChoice" }
    | {
          type: "chooseReference";
          workspaceId: string;
          choiceToken: string;
          bookNumber: number;
      }
    | (ScopedAction<"inspectInformation"> & { bookId?: number })
    | ScopedAction<
          | "activate"
          | "remove"
          | "openAudience"
          | "closeAudience"
          | "blank"
          | "resume"
          | "clearPreview"
          | "search"
          | "clearHistory"
          | "copyHistory"
          | "exportHistory"
      >
    | (ScopedAction<"rename"> & { name: string })
    | { type: "reorder"; workspaceIds: string[] }
    | (ScopedAction<"select" | "preview" | "send"> & {
          verse: Verse;
          action?: string;
      })
    | (ScopedAction<"reference"> & { input: string; preview: boolean })
    | (ScopedAction<"navigate"> & { direction: -1 | 1 })
    | (ScopedAction<"changeSearchTranslation" | "changeCurrentTranslation"> & {
          translationId: string;
      })
    | (ScopedAction<"appearance"> & { appearance: Appearance })
    | (ScopedAction<
          "hideCursor" | "alwaysOnTop" | "fullscreen" | "information"
      > & { enabled: boolean; bookId?: number })
    | (ScopedAction<"patchUi"> & {
          patch: Partial<
              Pick<
                  Workspace,
                  | "query"
                  | "submittedQuery"
                  | "mode"
                  | "scope"
                  | "page"
                  | "order"
                  | "historyProjectedOnly"
              >
          >;
      })
    | { type: "importBible" }
    | { type: "publishImport" | "cancelImport"; reviewId: string }
    | { type: "deleteTranslation"; translationId: string };

export type DeskController = {
    workspaces: Workspace[];
    activeId: string;
    translations: Translation[];
    pending?: boolean;
    error?: string;
    importReview?: ImportReview | null;
    referenceChoice?: {
        input: string;
        preview: boolean;
        workspaceId: string;
        choiceToken: string;
        candidates: { bookNumber: number; name: string }[];
    } | null;
    dispatch: (action: DeskAction) => void;
};

/** Visual fallback only; confirmed overrides remain Rust-owned. */
export function defaultAppearance(): Appearance {
    return {
        fontFamily: "Cormorant Garamond",
        fontSize: 64,
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        color: "#faf7f0",
        background: "mountains",
        backgrounds: {},
        fit: "cover",
        bands: [
            {
                min: 0,
                max: 50,
                size: 60,
            },
            {
                min: 51,
                max: 100,
                size: 58,
            },
            {
                min: 101,
                max: 150,
                size: 57,
            },
            {
                min: 151,
                max: 200,
                size: 59,
            },
            {
                min: 201,
                max: 250,
                size: 51,
            },
            {
                min: 251,
                max: 300,
                size: 53,
            },
            {
                min: 301,
                max: 400,
                size: 48,
            },
            {
                min: 401,
                max: 450,
                size: 38,
            },
            {
                min: 451,
                max: 500,
                size: 34,
            },
            {
                min: 501,
                max: 550,
                size: 33,
            },
            {
                min: 551,
                max: 600,
                size: 24,
            },
            {
                min: 601,
                max: 650,
                size: 24,
            },
            {
                min: 651,
                max: Number.POSITIVE_INFINITY,
                size: 30,
            },
        ],
    };
}

export function graphemeCount(text: string): number {
    return Array.from(
        new Intl.Segmenter(undefined, {
            granularity: "grapheme",
        }).segment(text)
    ).length;
}

export function getBand(verse: Verse, appearance: Appearance) {
    const count = graphemeCount(verse.text);
    return appearance.bands.find(
        (band) => count >= band.min && count <= band.max
    );
}
