import type { ApplicationSnapshot, ReferenceResult } from "./bindings.gen";

/** Fixed browser examples; no lookup, persistence, or application transitions. */
export const browserState: ApplicationSnapshot = {
    translations: [
        {
            translationId: "browser-web",
            editionId: "browser-web-edition",
            title: "World English Bible",
            description: "Browser fixture",
            bundled: true,
            bookCount: 66,
            verseCount: 31098,
            source: {
                publisherEditionId: "engwebp",
                artifactSha256: null,
                editionLabel: null,
                sourceName: "eBible.org",
                sourceUrl: "https://ebible.org/engwebp/",
                rightsNotice: "World English Bible is in the Public Domain.",
            },
        },
    ],
    workspaces: [
        {
            workspaceId: "browser-workspace",
            settings: {
                name: "Audience 1",
                selectedTranslationId: "browser-web",
                hideCursor: true,
            },
            currentVerse: null,
            bookInformationMode: false,
            audience: "closed",
        },
    ],
    activeWorkspaceId: "browser-workspace",
};

export const browserReference: ReferenceResult = {
    workspaceId: "browser-workspace",
    verse: {
        translationId: "browser-web",
        editionId: "browser-web-edition",
        translationTitle: "World English Bible",
        bookName: "John",
        coordinate: {
            bookNumber: 43,
            chapter: 3,
            verse: 16,
        },
        text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
    },
};
