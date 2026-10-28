import { expect, it } from "vitest";
import { byteHighlights, viewVerse } from "./accepted-view";

it("renders backend UTF-8 highlights over original Unicode text", () => {
    expect(
        byteHighlights("A\u0301😀 love", [
            {
                start: 3,
                end: 7,
            },
            {
                start: 8,
                end: 12,
            },
        ])
    ).toEqual([
        {
            start: 2,
            end: 4,
        },
        {
            start: 5,
            end: 9,
        },
    ]);
});

it("keeps a saved history capture's edition and original wording", () => {
    const result = viewVerse(
        {
            translationId: "deleted-source",
            editionId: "original-edition",
            translationTitle: "Original translation",
            bookName: "Roma",
            coordinate: {
                bookNumber: 45,
                chapter: 16,
                verse: 25,
            },
            text: "Original  wording.\nUnchanged.",
        },
        {
            historyActionId: "recorded-action",
        }
    );
    expect(result).toMatchObject({
        translation: "deleted-source",
        editionId: "original-edition",
        text: "Original  wording.\nUnchanged.",
        historyActionId: "recorded-action",
        bookId: 45,
        verse: 25,
    });
});

it("preserves captured book-information translation and provenance", async () => {
    const { viewInformation } = await import("./appearance-view");
    expect(
        viewInformation({
            translationId: "deleted",
            editionId: "old",
            translationTitle: "Original translation",
            bookNumber: 1,
            name: "Genesis",
            author: null,
            writingDate: null,
            writingLocation: null,
            metadataAttribution: "Editorial team",
            metadataSourceUrl: "https://example.com/metadata",
            metadataRightsNotice: "Used with permission",
            background: null,
        })
    ).toEqual({
        name: "Genesis",
        translationTitle: "Original translation",
        author: undefined,
        date: undefined,
        location: undefined,
        attribution: "Editorial team",
        sourceUrl: "https://example.com/metadata",
        rightsNotice: "Used with permission",
    });
});
