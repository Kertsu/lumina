import type {
    ApplicationSnapshot,
    BookInformation,
    ReferenceResult,
} from "./bindings.gen";

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

export const browserBooks: BookInformation[] = [
    {
        translationId: "browser-web",
        editionId: "browser-web-edition",
        translationTitle: "World English Bible",
        bookNumber: 43,
        name: "John",
        author: null,
        writingDate: null,
        writingLocation: null,
        metadataAttribution: null,
        metadataSourceUrl: null,
        metadataRightsNotice: null,
    },
];

/** Fixed browser examples; no lookup, persistence, or application transitions. */
export const browserState: ApplicationSnapshot = {
    applicationTheme: "system",
    projectionFailures: [],
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
                importFilename: null,
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
            currentVerse: browserReference.verse,
            currentBackground: null,
            bookInformationMode: false,
            audience: "closed",
            owner: null,
            outputRevision: 0,
            outputActionId: null,
            preview: null,
            history: [],
            appearance: {
                fontFamily: null,
                bold: null,
                italic: null,
                underline: null,
                strike: null,
                color: null,
                bands: null,
                backgrounds: [],
            },
            information: null,
            fullscreen: false,
            alwaysOnTop: false,
        },
    ],
    activeWorkspaceId: "browser-workspace",
};
