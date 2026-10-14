import type {
    Book,
    Highlight,
    ReferenceResult,
    SearchMode,
    SearchOrder,
    SearchResult,
    SearchScope,
    Selection,
    Translation,
    Verse,
} from "./types";

const names = [
    "Genesis|Gen|Ge|Gn|Henesis",
    "Exodus|Exod|Ex|Exo",
    "Leviticus|Lev|Le|Lv|Levitico",
    "Numbers|Num|Nu|Nm|Mga Bilang|Bilang|Bil",
    "Deuteronomy|Deut|Dt|Deu|Deuteronomio",
    "Joshua|Josh|Jos|Josue",
    "Judges|Judg|Jdg|Mga Hukom|Hukom|Huk",
    "Ruth|Ru|Rut",
    "1 Samuel|1 Sam|1 Sa|1Sam",
    "2 Samuel|2 Sam|2 Sa|2Sam",
    "1 Kings|1 Kgs|1 Ki|1 Mga Hari|1 Hari|1 Ha",
    "2 Kings|2 Kgs|2 Ki|2 Mga Hari|2 Hari|2 Ha",
    "1 Chronicles|1 Chron|1 Chr|1 Ch|1 Mga Cronica|1 Cronica|1 Cro",
    "2 Chronicles|2 Chron|2 Chr|2 Ch|2 Mga Cronica|2 Cronica|2 Cro",
    "Ezra|Ezr|Esdras|Esd",
    "Nehemiah|Neh|Nehemias",
    "Esther|Esth|Est|Ester",
    "Job|Jb",
    "Psalms|Psalm|Ps|Psa|Mga Awit|Awit|Aw",
    "Proverbs|Prov|Pr|Mga Kawikaan|Kawikaan|Kaw",
    "Ecclesiastes|Eccl|Ecc|Ec|Eclesiastes|Ecl|Mangangaral",
    "Song of Solomon|Song of Songs|Song|So|SOS|Mga Awit ni Solomon|Awit ni Solomon|Mga Awit ng mga Awit",
    "Isaiah|Isa|Is|Isaias",
    "Jeremiah|Jer|Je|Jeremias",
    "Lamentations|Lam|La|Mga Panaghoy|Panaghoy|Pan",
    "Ezekiel|Ezek|Eze|Ez|Ezequiel",
    "Daniel|Dan|Da|Dn",
    "Hosea|Hos|Ho|Oseas|Os",
    "Joel|Jl",
    "Amos|Am",
    "Obadiah|Obad|Ob|Obadias|Abdias",
    "Jonah|Jon|Jnh|Jonas",
    "Micah|Mic|Mi|Mikas|Miq|Miqueas",
    "Nahum|Nah|Na",
    "Habakkuk|Hab|Hb|Habacuc",
    "Zephaniah|Zeph|Zep|Sofonias|Sof",
    "Haggai|Hag|Hg|Hagai|Ageo",
    "Zechariah|Zech|Zec|Zacarias|Zac",
    "Malachi|Mal|Ml|Malakias",
    "Matthew|Matt|Mt|Mateo|Mat",
    "Mark|Mk|Mrk|Marcos|Mar",
    "Luke|Lk|Luk|Lucas|Luc",
    "John|Jn|Jhn|Juan|Jua",
    "Acts|Ac|Mga Gawa|Gawa|Gaw",
    "Romans|Rom|Ro|Roma",
    "1 Corinthians|1 Cor|1 Co|1 Mga Taga Corinto|1 Corinto|1 Corintos",
    "2 Corinthians|2 Cor|2 Co|2 Mga Taga Corinto|2 Corinto|2 Corintos",
    "Galatians|Gal|Ga|Mga Taga Galacia|Galacia",
    "Ephesians|Eph|Ep|Mga Taga Efeso|Efeso|Efe",
    "Philippians|Phil|Php|Mga Taga Filipos|Filipos|Fil",
    "Colossians|Col|Co|Mga Taga Colosas|Colosas",
    "1 Thessalonians|1 Thess|1 Thes|1 Th|1 Mga Taga Tesalonica|1 Tesalonica|1 Tes",
    "2 Thessalonians|2 Thess|2 Thes|2 Th|2 Mga Taga Tesalonica|2 Tesalonica|2 Tes",
    "1 Timothy|1 Tim|1 Ti|1 Timoteo",
    "2 Timothy|2 Tim|2 Ti|2 Timoteo",
    "Titus|Tit|Ti|Tito",
    "Philemon|Philem|Phlm|Phm|Filemon|Flm",
    "Hebrews|Heb|He|Mga Hebreo|Hebreo",
    "James|Jas|Jm|Santiago|Sant|San",
    "1 Peter|1 Pet|1 Pe|1 Pedro|1 Ped",
    "2 Peter|2 Pet|2 Pe|2 Pedro|2 Ped",
    "1 John|1 Jn|1 Jhn|1 Juan|1 Jua",
    "2 John|2 Jn|2 Jhn|2 Juan|2 Jua",
    "3 John|3 Jn|3 Jhn|3 Juan|3 Jua",
    "Jude|Jud|Judas",
    "Revelation|Rev|Re|Apocalypse|Apocalipsis|Apoc|Pahayag|Pah",
];

export const BOOKS: Book[] = names.map((entry, index) => {
    const [name, ...aliases] = entry.split("|");
    return {
        number: index + 1,
        name,
        aliases,
    };
});

export function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[’‘]/g, "'")
        .toLowerCase();
}

function aliasKey(text: string): string {
    return normalize(text)
        .trim()
        .replace(
            /^(iii|ii|i)\s+(?=\p{L})/u,
            (ordinal) => `${ordinal.trim().length} `
        )
        .replace(/[.\s-]+/g, "");
}

function coordinate(verse: Pick<Verse, "book" | "chapter" | "verse">): string {
    return `${verse.book}:${verse.chapter}:${verse.verse}`;
}

function bibleOrder(a: Verse, b: Verse): number {
    return a.book - b.book || a.chapter - b.chapter || a.verse - b.verse;
}

export function referenceLabel(
    verse: Pick<Selection, "bookName" | "chapter" | "verse">
): string {
    return `${verse.bookName} ${verse.chapter}:${verse.verse}`;
}

export function inScope(book: number, scope: SearchScope): boolean {
    if (typeof scope === "number") return book === scope;
    switch (scope) {
        case "ot":
            return book <= 39;
        case "nt":
            return book >= 40;
        case "moses":
            return book <= 5;
        case "gospels":
            return book >= 40 && book <= 43;
        case "paul":
            return book >= 45 && book <= 57;
        default:
            return true;
    }
}

interface Token extends Highlight {
    word: string;
    position: number;
}

interface IndexedVerse {
    verse: Verse;
    normalized: string;
    starts: number[];
    ends: number[];
    tokens: Token[];
}

function words(text: string): RegExpExecArray[] {
    return [...text.matchAll(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)];
}

function indexVerse(verse: Verse): IndexedVerse {
    let normalized = "";
    const starts: number[] = [];
    const ends: number[] = [];
    let offset = 0;
    for (const point of verse.text) {
        const value = normalize(point);
        if (!value.length && ends.length)
            ends[ends.length - 1] = offset + point.length;
        for (let unit = 0; unit < value.length; unit++) {
            starts.push(offset);
            ends.push(offset + point.length);
        }
        normalized += value;
        offset += point.length;
    }
    const tokens = words(normalized).map((match, position) => ({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
        position,
    }));
    return {
        verse,
        normalized,
        starts,
        ends,
        tokens,
    };
}

function mergedHighlights(
    index: IndexedVerse,
    spans: Highlight[]
): Highlight[] {
    const original = spans
        .map((span) => ({
            start: index.starts[span.start],
            end: index.ends[span.end - 1],
        }))
        .sort((a, b) => a.start - b.start || a.end - b.end);
    const result: Highlight[] = [];
    for (const span of original) {
        const previous = result[result.length - 1];
        if (previous && previous.end >= span.start)
            previous.end = Math.max(previous.end, span.end);
        else result.push(span);
    }
    return result;
}

function trigrams(text: string): Set<string> {
    const result = new Set<string>();
    for (let index = 0; index <= text.length - 3; index++)
        result.add(text.slice(index, index + 3));
    return result;
}

export class BibleIndex {
    readonly translation: Translation;
    private readonly verses: IndexedVerse[];
    private readonly coordinates = new Map<string, number>();
    private readonly lexical = new Map<string, Set<number>>();
    private readonly substring = new Map<string, Set<number>>();
    private readonly aliases = new Map<string, Set<number>>();

    constructor(translation: Translation) {
        this.translation = translation;
        this.verses = (translation.available ? [...translation.verses] : [])
            .sort(bibleOrder)
            .map(indexVerse);
        for (const book of BOOKS) this.addAliases(book);
        for (const book of translation.books) this.addAliases(book);
        this.verses.forEach((entry, index) => {
            this.coordinates.set(coordinate(entry.verse), index);
            for (const word of new Set(entry.tokens.map((token) => token.word)))
                this.addPosting(this.lexical, word, index);
            for (const trigram of trigrams(entry.normalized))
                this.addPosting(this.substring, trigram, index);
        });
    }

    private addAliases(book: Book): void {
        for (const alias of [book.name, ...(book.aliases ?? [])])
            this.addPosting(this.aliases, aliasKey(alias), book.number);
    }

    private addPosting(
        index: Map<string, Set<number>>,
        key: string,
        value: number
    ): void {
        let posting = index.get(key);
        if (!posting) {
            posting = new Set();
            index.set(key, posting);
        }
        posting.add(value);
    }

    private selection(verse: Verse): Selection {
        return {
            ...verse,
            translationId: this.translation.id,
            edition: this.translation.edition,
            translationTitle: this.translation.title,
            abbreviation: this.translation.abbreviation,
            bookName:
                this.translation.books.find(
                    (book) => book.number === verse.book
                )?.name ?? BOOKS[verse.book - 1].name,
        };
    }

    selectVerse(
        book: number,
        chapter: number,
        verse: number
    ): Selection | null {
        const index = this.coordinates.get(`${book}:${chapter}:${verse}`);
        return index === undefined
            ? null
            : this.selection(this.verses[index].verse);
    }

    adjacent(selection: Selection, direction: -1 | 1): Selection | null {
        if (
            selection.translationId !== this.translation.id ||
            selection.edition !== this.translation.edition
        )
            return null;
        const index = this.coordinates.get(coordinate(selection));
        const adjacent =
            index === undefined ? undefined : this.verses[index + direction];
        return adjacent ? this.selection(adjacent.verse) : null;
    }

    chapter(book: number, chapter: number): Selection[] {
        return this.verses
            .filter(
                (entry) =>
                    entry.verse.book === book && entry.verse.chapter === chapter
            )
            .map((entry) => this.selection(entry.verse));
    }

    resolveRef(input: string): ReferenceResult {
        const match = input.trim().match(/^(.+?)\s*(\d+)\s*:\s*(\d+)\s*$/u);
        if (
            !match ||
            Number(match[2]) < 1 ||
            Number(match[3]) < 1 ||
            !Number.isSafeInteger(Number(match[2])) ||
            !Number.isSafeInteger(Number(match[3]))
        ) {
            return {
                status: "invalid",
                message: "Enter one reference, such as John 3:16 or Juan 3:16.",
            };
        }
        const key = aliasKey(match[1]);
        let candidates = this.aliases.get(key);
        if (!candidates && key) {
            candidates = new Set();
            for (const [alias, books] of this.aliases)
                if (alias.startsWith(key))
                    for (const book of books) candidates.add(book);
        }
        if (!candidates?.size)
            return {
                status: "invalid",
                message: `Unknown book: ${match[1].trim()}.`,
            };
        const chapter = Number(match[2]);
        const verse = Number(match[3]);
        if (candidates.size > 1)
            return {
                status: "ambiguous",
                message: "Choose the intended book explicitly.",
                candidates: [...candidates]
                    .sort((a, b) => a - b)
                    .map((book) => ({
                        book,
                        chapter,
                        verse,
                        bookName:
                            this.translation.books.find(
                                (entry) => entry.number === book
                            )?.name ?? BOOKS[book - 1].name,
                        selection: this.selectVerse(book, chapter, verse),
                    })),
            };
        const [book] = candidates;
        const selection = this.selectVerse(book, chapter, verse);
        return selection
            ? {
                  status: "resolved",
                  selection,
              }
            : {
                  status: "unavailable",
                  message: `${BOOKS[book - 1].name} ${chapter}:${verse} is not loaded in ${this.translation.title}.`,
              };
    }

    search(
        query: string,
        mode: SearchMode = "all-words",
        scope: SearchScope = "all",
        order: SearchOrder = "best"
    ): SearchResult[] {
        const text = normalize(mode === "contains" ? query : query.trim());
        const terms = words(text).map((match) => match[0]);
        if (!text.trim() || (mode !== "contains" && !terms.length)) return [];
        const postings: Set<number>[] = [];
        if (mode === "contains") {
            for (const trigram of trigrams(text))
                postings.push(this.substring.get(trigram) ?? new Set());
        } else {
            for (const term of new Set(terms)) {
                if (mode !== "word-starts")
                    postings.push(this.lexical.get(term) ?? new Set());
                else {
                    const matches = new Set<number>();
                    for (const [word, posting] of this.lexical)
                        if (word.startsWith(term))
                            for (const index of posting) matches.add(index);
                    postings.push(matches);
                }
            }
        }
        postings.sort((a, b) => a.size - b.size);
        const candidates = postings.length
            ? [...postings[0]].filter((index) =>
                  postings.every((posting) => posting.has(index))
              )
            : this.verses.map((_, index) => index);
        const results: SearchResult[] = [];
        for (const index of candidates) {
            const entry = this.verses[index];
            if (!inScope(entry.verse.book, scope)) continue;
            const spans: Highlight[] = [];
            let phraseCount = 0;
            if (mode === "contains") {
                let offset = entry.normalized.indexOf(text);
                while (offset !== -1) {
                    spans.push({
                        start: offset,
                        end: offset + text.length,
                    });
                    offset = entry.normalized.indexOf(text, offset + 1);
                }
            } else if (mode === "phrase") {
                for (
                    let start = 0;
                    start <= entry.tokens.length - terms.length;
                    start++
                ) {
                    if (
                        terms.every(
                            (term, offset) =>
                                entry.tokens[start + offset].word === term
                        )
                    ) {
                        phraseCount++;
                        for (let offset = 0; offset < terms.length; offset++)
                            spans.push(entry.tokens[start + offset]);
                    }
                }
            } else {
                for (const token of entry.tokens)
                    if (
                        terms.some((term) =>
                            mode === "word-starts"
                                ? token.word.startsWith(term)
                                : token.word === term
                        )
                    )
                        spans.push(token);
                for (
                    let start = 0;
                    start <= entry.tokens.length - terms.length;
                    start++
                ) {
                    if (
                        terms.every((term, offset) =>
                            mode === "word-starts"
                                ? entry.tokens[start + offset].word.startsWith(
                                      term
                                  )
                                : entry.tokens[start + offset].word === term
                        )
                    )
                        phraseCount++;
                }
            }
            if (!spans.length) continue;
            const spread = spans[spans.length - 1].end - spans[0].start;
            const score =
                mode === "contains"
                    ? spans.length + text.length / entry.normalized.length
                    : phraseCount * 10 +
                      spans.length / Math.max(1, entry.tokens.length) +
                      1 / Math.max(1, spread);
            results.push({
                selection: this.selection(entry.verse),
                highlights: mergedHighlights(entry, spans),
                score,
            });
        }
        return results.sort(
            (a, b) =>
                (order === "best" ? b.score - a.score : 0) ||
                bibleOrder(a.selection, b.selection)
        );
    }
}

const indexes = new WeakMap<Translation, BibleIndex>();

export function bibleIndex(translation: Translation): BibleIndex {
    let index = indexes.get(translation);
    if (!index) {
        index = new BibleIndex(translation);
        indexes.set(translation, index);
    }
    return index;
}
