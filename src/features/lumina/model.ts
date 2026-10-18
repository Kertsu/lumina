import {
    referenceLabel,
    type TranslationId,
    type Verse,
    verses,
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
    bands: {
        min: number;
        max: number;
        size: number;
    }[];
};

export type HistoryEntry = {
    id: string;
    verse: Verse;
    timestamp: number;
    projected: boolean;
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
    appearance: Appearance;
    history: HistoryEntry[];
    query: string;
    submittedQuery: string;
    mode: SearchMode;
    scope: string;
    page: number;
    order: "best" | "bible";
    historyProjectedOnly: boolean;
};

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
        backgrounds: {
            web: "mountains",
            adb: "mountains",
        },
        fit: "cover",
        bands: [
            {
                min: 0,
                max: 100,
                size: 72,
            },
            {
                min: 101,
                max: 220,
                size: 64,
            },
            {
                min: 221,
                max: 400,
                size: 48,
            },
            {
                min: 401,
                max: 100000,
                size: 40,
            },
        ],
    };
}

let nextIdentity = 0;

function identity(prefix: string): string {
    nextIdentity += 1;
    return `${prefix}-${Date.now()}-${nextIdentity}`;
}

export function createWorkspace(index: number): Workspace {
    return {
        id: identity("workspace"),
        name: `Audience ${index}`,
        translation: "web",
        current: null,
        preview: null,
        status: "closed",
        information: false,
        hideCursor: true,
        appearance: defaultAppearance(),
        history: [],
        query: "",
        submittedQuery: "",
        mode: "all",
        scope: "Entire Bible",
        page: 1,
        order: "best",
        historyProjectedOnly: false,
    };
}

export function initialWorkspace(): Workspace {
    const workspace = createWorkspace(1);
    const current = verses.find((verse) => verse.id === "web-43-3-16") ?? null;
    const recentIds = ["web-43-3-16", "web-19-23-1", "web-45-8-28"];
    const timestamp = Date.now();
    return {
        ...workspace,
        current,
        history: recentIds.flatMap((verseId, index) => {
            const verse = verses.find((candidate) => candidate.id === verseId);
            return verse
                ? [
                      {
                          id: identity("history"),
                          verse,
                          timestamp: timestamp - (index + 1) * 180_000,
                          projected: index !== 2,
                          action: "Demo history",
                      },
                  ]
                : [];
        }),
    };
}

export function normalizeText(input: string): string {
    return input
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase("en")
        .replace(/[’‘ʼ]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function words(input: string): string[] {
    return (
        normalizeText(input).match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? []
    );
}

const bookAliases: Record<string, string[]> = {
    Genesis: ["genesis", "gen", "ge", "gn"],
    Psalms: ["psalms", "psalm", "ps", "psa", "mga awit", "awit", "aw"],
    Matthew: ["matthew", "matt", "mt", "mateo", "mat"],
    John: ["john", "jn", "jhn", "juan", "ju"],
    Romans: ["romans", "rom", "ro", "roma"],
    "1 Corinthians": [
        "1 corinthians",
        "1 corinthian",
        "1 cor",
        "1 co",
        "1 corinto",
        "i corinthians",
        "i corinto",
    ],
    Philippians: ["philippians", "phil", "php", "filipos", "fil"],
};

function normalizedBook(input: string): string {
    return normalizeText(input)
        .replace(/\./g, "")
        .replace(/^([1-3])(?=\p{L})/u, "$1 ")
        .replace(/\s+/g, " ");
}

export function resolveReference(
    input: string,
    translation: TranslationId
): {
    verse?: Verse;
    error?: string;
} {
    if (!input.trim()) {
        return {
            error: "Enter a reference, such as John 3:16 or Juan 3:16.",
        };
    }
    if (/\d\s*[-–—]\s*\d/.test(input)) {
        return {
            error: "Choose one verse. Verse ranges are not supported.",
        };
    }
    const match = input.trim().match(/^(.+?)\s*(\d+)\s*:\s*(\d+)$/);
    if (!match) {
        return {
            error: "Use a book, chapter, and verse. For example: John 3:16.",
        };
    }
    const bookInput = normalizedBook(match[1]);
    const exact = Object.entries(bookAliases).filter(([, aliases]) =>
        aliases.includes(bookInput)
    );
    const candidates = exact.length
        ? exact
        : Object.entries(bookAliases).filter(([, aliases]) =>
              aliases.some((alias) => alias.startsWith(bookInput))
          );
    if (candidates.length > 1) {
        return {
            error: `Book name is ambiguous. Enter ${candidates.map(([book]) => book).join(" or ")}.`,
        };
    }
    if (!candidates.length) {
        return {
            error: "Book unavailable in this demo. Try John, Psalms, Genesis, Matthew, Romans, 1 Corinthians, or Philippians.",
        };
    }
    const chapter = Number(match[2]);
    const verseNumber = Number(match[3]);
    if (
        !Number.isSafeInteger(chapter) ||
        !Number.isSafeInteger(verseNumber) ||
        chapter < 1 ||
        verseNumber < 1
    ) {
        return {
            error: "Chapter and verse must be positive whole numbers.",
        };
    }
    const verse = verses.find(
        (candidate) =>
            candidate.book === candidates[0][0] &&
            candidate.chapter === chapter &&
            candidate.verse === verseNumber &&
            candidate.translation === translation
    );
    return verse
        ? {
              verse,
          }
        : {
              error: "That verse is outside the demo passages. Try John 3, Psalm 23, Genesis 1:1–5, Matthew 5:1–9, Romans 8:28, 1 Corinthians 13:4–7, or Philippians 4:13.",
          };
}

function inScope(verse: Verse, scope: string): boolean {
    switch (normalizeText(scope)) {
        case "entire bible":
        case "all":
        case "":
            return true;
        case "ot":
        case "old testament":
            return verse.bookId < 40;
        case "nt":
        case "new testament":
            return verse.bookId >= 40;
        case "books of moses":
            return verse.bookId <= 5;
        case "gospels":
            return verse.bookId >= 40 && verse.bookId <= 43;
        case "epistles of paul":
            return verse.bookId >= 45 && verse.bookId <= 57;
        default:
            return normalizeText(verse.book) === normalizeText(scope);
    }
}

export function searchVerses(
    query: string,
    translation: TranslationId,
    mode: SearchMode,
    scope: string
): Verse[] {
    const normalized = normalizeText(query);
    const queryWords = words(query);
    if (!normalized || (mode !== "contains" && !queryWords.length)) {
        return [];
    }
    const matches = verses.filter((verse) => {
        if (verse.translation !== translation || !inScope(verse, scope)) {
            return false;
        }
        if (mode === "contains") {
            return normalizeText(verse.text).includes(normalized);
        }
        const verseWords = words(verse.text);
        if (mode === "phrase") {
            return verseWords.some((_, offset) =>
                queryWords.every(
                    (word, index) => verseWords[offset + index] === word
                )
            );
        }
        return queryWords.every((word) =>
            verseWords.some((candidate) =>
                mode === "starts"
                    ? candidate.startsWith(word)
                    : candidate === word
            )
        );
    });
    const score = (verse: Verse) => {
        const content = words(verse.text);
        const phrase =
            queryWords.length > 0 &&
            content.join(" ").includes(queryWords.join(" "));
        return (phrase ? 1000 : 0) + 100 / Math.max(1, content.length);
    };
    return matches.sort((left, right) => score(right) - score(left));
}

export function getAdjacentVerse(
    verse: Verse,
    direction: -1 | 1
): Verse | undefined {
    const translationVerses = verses.filter(
        (candidate) => candidate.translation === verse.translation
    );
    const index = translationVerses.findIndex(
        (candidate) =>
            candidate.id === verse.id &&
            (!verse.edition || candidate.edition === verse.edition)
    );
    return index < 0 ? undefined : translationVerses[index + direction];
}

export function displayVerse(
    workspace: Workspace,
    verse: Verse,
    action: string
): Workspace {
    const projected = workspace.status !== "closed";
    return {
        ...workspace,
        current: verse,
        preview: null,
        information: false,
        status: projected ? "live" : "closed",
        history: [
            {
                id: identity("history"),
                verse,
                timestamp: Date.now(),
                projected,
                action,
            },
            ...workspace.history,
        ],
    };
}

export function getBand(verse: Verse, appearance: Appearance) {
    const length = [...verse.text].length;
    return (
        appearance.bands.find(
            (band) => length >= band.min && length <= band.max
        ) ?? {
            min: 0,
            max: 100000,
            size: appearance.fontSize,
        }
    );
}

export function copyVerseText(verse: Verse): string {
    return `${verse.text}\n— ${referenceLabel(verse)} · ${verse.translation.toUpperCase()}`;
}
