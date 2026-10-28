import type { HighlightRange, ResolvedVerse } from "@/bridge/client";
import type { Verse } from "./fixtures";

/** Rust offsets are original UTF-8 bytes; DOM string slicing uses UTF-16. */
export function byteHighlights(text: string, ranges: HighlightRange[]) {
    const bytes = new TextEncoder().encode(text);
    const decoder = new TextDecoder();
    return ranges.map((range) => ({
        start: decoder.decode(bytes.subarray(0, range.start)).length,
        end: decoder.decode(bytes.subarray(0, range.end)).length,
    }));
}

export function viewVerse(
    verse: ResolvedVerse,
    extra: Partial<Verse> = {}
): Verse {
    return {
        id: `${verse.editionId}:${verse.coordinate.bookNumber}:${verse.coordinate.chapter}:${verse.coordinate.verse}`,
        translation: verse.translationId,
        translationTitle: verse.translationTitle,
        editionId: verse.editionId,
        book: verse.bookName,
        bookId: verse.coordinate.bookNumber,
        chapter: verse.coordinate.chapter,
        verse: verse.coordinate.verse,
        text: verse.text,
        ...extra,
    };
}
