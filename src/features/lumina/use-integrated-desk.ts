import { useCallback, useEffect, useRef, useState } from "react";
import {
    type ApplicationSnapshot,
    type BookInformation,
    type ClientResult,
    client,
    deskClient,
    onApplicationChanged,
    type ReferenceInputResult,
    type ResolvedVerse,
    type SearchRequest,
    type SearchResult,
} from "@/bridge/client";
import { byteHighlights, viewVerse } from "./accepted-view";
import { rgba, viewAppearance, viewInformation } from "./appearance-view";
import type { DeskAction, DeskController, Verse, Workspace } from "./index";

function accepted<T>(result: ClientResult<T>): T {
    if (result.status === "error") {
        throw new Error(result.error.message);
    }
    return result.data;
}

function projectionFailureId(
    notice: ApplicationSnapshot["projectionFailures"][number]
): string {
    return JSON.stringify([
        notice.owner,
        notice.acknowledgment,
        notice.failure.errorCode,
    ]);
}

type Interaction = Pick<
    Workspace,
    | "query"
    | "submittedQuery"
    | "mode"
    | "scope"
    | "page"
    | "order"
    | "historyProjectedOnly"
>;
const initialInteraction: Interaction = {
    query: "",
    submittedQuery: "",
    mode: "all",
    scope: "Entire Bible",
    page: 1,
    order: "best",
    historyProjectedOnly: false,
};

function target(workspaceId: string, verse: Verse) {
    return {
        workspaceId,
        translationId: verse.translation,
        editionId: verse.editionId ?? null,
        coordinate: {
            bookNumber: verse.bookId,
            chapter: verse.chapter,
            verse: verse.verse,
        },
    };
}

function searchScope(
    value: string,
    books: BookInformation[]
): SearchRequest["scope"] {
    const scopes: Record<string, SearchRequest["scope"]> = {
        "Entire Bible": "entireBible",
        "Old Testament": "oldTestament",
        OT: "oldTestament",
        "New Testament": "newTestament",
        NT: "newTestament",
        "Books of Moses": "moses",
        "The Gospels": "gospels",
        Gospels: "gospels",
        "Paul's Letters": "epistlesOfPaul",
        "Epistles of Paul": "epistlesOfPaul",
    };
    const book = books.find((item) => item.name === value);
    return book
        ? {
              book: book.bookNumber,
          }
        : (scopes[value] ?? "entireBible");
}

export function useIntegratedDeskController(): DeskController {
    const [snapshot, setSnapshot] = useState<ApplicationSnapshot | null>(null);
    const snapshotRef = useRef(snapshot);
    const [navigation, setNavigation] = useState<
        Record<string, { canPrevious: boolean; canNext: boolean }>
    >({});
    const [error, setError] = useState("");
    const [dismissedProjectionFailures, setDismissedProjectionFailures] =
        useState<Set<string>>(new Set());
    const [pending, setPending] = useState(0);
    const [interactions, setInteractions] = useState<
        Record<string, Interaction>
    >({});
    const interactionRef = useRef(interactions);
    const [searches, setSearches] = useState<Record<string, SearchResult>>({});
    const searchGenerations = useRef<Record<string, number>>({});
    const submittedSearches = useRef<
        Record<string, { request: SearchRequest; editionId: string }>
    >({});
    const [books, setBooks] = useState<Record<string, BookInformation[]>>({});
    const [chapters, setChapters] = useState<Record<string, ResolvedVerse[]>>(
        {}
    );
    const [information, setInformation] = useState<
        Record<string, BookInformation | null>
    >({});
    const [resources, setResources] = useState<Record<string, string>>({});
    const resourceRef = useRef(resources);
    const [importReview, setImportReview] =
        useState<DeskController["importReview"]>(null);
    const [referenceChoice, setReferenceChoice] =
        useState<DeskController["referenceChoice"]>(null);
    const choiceRef = useRef(referenceChoice);
    const refreshGeneration = useRef(0);
    const mounted = useRef(true);

    const refresh = useCallback(async () => {
        const generation = ++refreshGeneration.current;
        const state = accepted(await client.getApplicationState());
        if (mounted.current && generation === refreshGeneration.current) {
            const previous = snapshotRef.current;
            for (const workspace of previous?.workspaces ?? []) {
                const translation = previous?.translations.find(
                    (item) =>
                        item.translationId ===
                        workspace.settings.selectedTranslationId
                );
                const nextWorkspace = state.workspaces.find(
                    (item) => item.workspaceId === workspace.workspaceId
                );
                const nextTranslation = state.translations.find(
                    (item) =>
                        item.translationId ===
                        nextWorkspace?.settings.selectedTranslationId
                );
                if (
                    !nextWorkspace ||
                    translation?.editionId !== nextTranslation?.editionId
                ) {
                    const id = workspace.workspaceId;
                    searchGenerations.current[id] =
                        (searchGenerations.current[id] ?? 0) + 1;
                    delete submittedSearches.current[id];
                    if (choiceRef.current?.workspaceId === id) {
                        choiceRef.current = null;
                        setReferenceChoice(null);
                    }
                    setSearches((values) => {
                        const next = {
                            ...values,
                        };
                        delete next[id];
                        return next;
                    });
                    const interaction = interactionRef.current[id];
                    if (interaction) {
                        interactionRef.current = {
                            ...interactionRef.current,
                            [id]: {
                                ...interaction,
                                page: 1,
                                submittedQuery: "",
                            },
                        };
                        setInteractions(interactionRef.current);
                    }
                    if (translation) {
                        setBooks((values) => {
                            const next = {
                                ...values,
                            };
                            delete next[translation.translationId];
                            return next;
                        });
                    }
                }
            }
            snapshotRef.current = state;
            setSnapshot(state);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        let unsubscribe: (() => void) | undefined;
        const report = (cause: unknown) => {
            if (mounted.current) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "Could not load the workspace."
                );
            }
        };
        void refresh().catch(report);
        void onApplicationChanged(() => {
            void refresh().catch(report);
        })
            .then((dispose) => {
                if (mounted.current) {
                    unsubscribe = dispose;
                } else {
                    dispose();
                }
            })
            .catch(report);
        return () => {
            mounted.current = false;
            unsubscribe?.();
        };
    }, [refresh]);

    // Edition IDs are immutable. Load presentation data separately from accepted state.
    useEffect(() => {
        if (!snapshot) {
            return;
        }
        let cancelled = false;
        const load = async () => {
            const active = snapshot.workspaces.find(
                (item) => item.workspaceId === snapshot.activeWorkspaceId
            );
            if (!active) {
                return;
            }
            const translationId = active.settings.selectedTranslationId;
            if (!books[translationId]) {
                const result = await deskClient.listBooks(translationId);
                if (result.status === "ok" && !cancelled) {
                    setBooks((previous) => ({
                        ...previous,
                        [translationId]: result.data,
                    }));
                }
            }
            const availability = await deskClient.navigationState(
                active.workspaceId
            );
            if (availability.status === "ok" && !cancelled) {
                setNavigation((previous) => ({
                    ...previous,
                    [active.workspaceId]: availability.data,
                }));
            }
            const current = active.currentVerse;
            if (
                current &&
                snapshot.translations.some(
                    (item) => item.editionId === current.editionId
                )
            ) {
                const key = `${current.editionId}:${current.coordinate.bookNumber}:${current.coordinate.chapter}`;
                if (!chapters[key]) {
                    const result = await deskClient.chapterVerses(
                        current.translationId,
                        current.coordinate.bookNumber,
                        current.coordinate.chapter
                    );
                    if (result.status === "ok" && !cancelled) {
                        setChapters((previous) => ({
                            ...previous,
                            [key]: result.data,
                        }));
                    }
                }
            }
            if (current) {
                const result = await deskClient.bookInformation(
                    active.workspaceId,
                    null
                );
                if (result.status === "ok" && !cancelled) {
                    setInformation((previous) => ({
                        ...previous,
                        [active.workspaceId]: result.data,
                    }));
                }
            }
            const assetIds = new Set(
                snapshot.workspaces
                    .flatMap((workspace) => [
                        ...workspace.appearance.backgrounds.map(
                            (background) => background.assetId
                        ),
                        workspace.information?.background?.assetId,
                    ])
                    .filter((id): id is string => Boolean(id))
            );
            for (const assetId of assetIds) {
                if (resourceRef.current[assetId]) {
                    continue;
                }
                const uri = await deskClient.readAssetUri(assetId);
                if (uri.status === "ok" && !cancelled) {
                    resourceRef.current = {
                        ...resourceRef.current,
                        [assetId]: uri.data,
                    };
                    setResources(resourceRef.current);
                }
            }
        };
        void load().catch((cause: unknown) => {
            if (!cancelled) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "Could not load presentation data."
                );
            }
        });
        return () => {
            cancelled = true;
        };
    }, [snapshot, books, chapters]);

    function patch(workspaceId: string, changes: Partial<Interaction>) {
        interactionRef.current = {
            ...interactionRef.current,
            [workspaceId]: {
                ...initialInteraction,
                ...interactionRef.current[workspaceId],
                ...changes,
            },
        };
        setInteractions(interactionRef.current);
    }

    async function inspectReference(
        workspaceId: string,
        input: string,
        preview: boolean,
        choice?: { token: string; book: number }
    ) {
        const result: ReferenceInputResult = accepted(
            await deskClient.resolveReferenceInput({
                workspaceId,
                translationId: null,
                input,
                choice: choice?.book ?? null,
                choiceToken: choice?.token ?? null,
            })
        );
        if (result.status === "ambiguous") {
            const ambiguity = result.data;
            const next = {
                workspaceId,
                input,
                preview,
                choiceToken: ambiguity.choiceToken,
                candidates: ambiguity.candidates,
            };
            choiceRef.current = next;
            setReferenceChoice(next);
            return;
        }
        choiceRef.current = null;
        setReferenceChoice(null);
        if (result.status === "resolved") {
            const verse = result.data.verse;
            if (preview) {
                accepted(
                    await deskClient.previewVerse(
                        target(workspaceId, viewVerse(verse)),
                        "reference"
                    )
                );
            } else {
                accepted(
                    await deskClient.selectVerse(
                        target(workspaceId, viewVerse(verse))
                    )
                );
            }
        }
    }

    async function search(workspaceId: string, submit = true) {
        const state = snapshotRef.current;
        const workspace = state?.workspaces.find(
            (item) => item.workspaceId === workspaceId
        );
        if (!workspace) {
            return;
        }
        const draft = interactionRef.current[workspaceId] ?? initialInteraction;
        const generation = (searchGenerations.current[workspaceId] ?? 0) + 1;
        searchGenerations.current[workspaceId] = generation;
        const modes = {
            all: "allWords",
            phrase: "phrase",
            starts: "wordStarts",
            contains: "containsText",
        } as const;
        const submitted = submittedSearches.current[workspaceId];
        if (!submit && !submitted) {
            return;
        }
        const request: SearchRequest =
            !submit && submitted
                ? {
                      ...submitted.request,
                      requestId: `${workspaceId}:${generation}`,
                      page: draft.page,
                      order:
                          draft.order === "bible" ? "bibleOrder" : "bestMatch",
                  }
                : {
                      workspaceId,
                      translationId: workspace.settings.selectedTranslationId,
                      requestId: `${workspaceId}:${generation}`,
                      query: draft.query,
                      mode: modes[draft.mode],
                      scope: searchScope(
                          draft.scope,
                          books[workspace.settings.selectedTranslationId] ?? []
                      ),
                      order:
                          draft.order === "bible" ? "bibleOrder" : "bestMatch",
                      page: 1,
                      pageSize: 25,
                      libraryRevision: null,
                  };
        const edition = state?.translations.find(
            (item) => item.translationId === request.translationId
        );
        if (!edition) {
            return;
        }
        const result = accepted(await deskClient.searchVerses(request));
        if (
            searchGenerations.current[workspaceId] !== generation ||
            !snapshotRef.current?.translations.some(
                (item) =>
                    item.editionId === result.editionId &&
                    item.translationId === result.translationId
            ) ||
            !snapshotRef.current?.workspaces.some(
                (item) =>
                    item.workspaceId === workspaceId &&
                    item.settings.selectedTranslationId === result.translationId
            )
        ) {
            return;
        }
        if (submit) {
            submittedSearches.current[workspaceId] = {
                request,
                editionId: edition.editionId,
            };
        }
        setSearches((previous) => ({
            ...previous,
            [workspaceId]: result,
        }));
        patch(workspaceId, {
            submittedQuery: result.query,
            page: result.page,
        });
    }

    async function applyAppearance(
        workspaceId: string,
        appearance: Workspace["appearance"]
    ) {
        const workspace = snapshotRef.current?.workspaces.find(
            (item) => item.workspaceId === workspaceId
        );
        if (!workspace) {
            return;
        }
        const translationId =
            workspace.currentVerse?.translationId ??
            workspace.settings.selectedTranslationId;
        const configured = {
            ...appearance.backgrounds,
            [translationId]:
                appearance.backgrounds[translationId] ?? appearance.background,
        };
        const backgrounds = [];
        for (const [id, background] of Object.entries(configured)) {
            const existing = workspace.appearance.backgrounds.find(
                (item) => item.translationId === id
            );
            let assetId = existing?.assetId ?? null;
            let fallbackColor = existing?.fallbackColor ?? null;
            if (background === "mountains" || background === "forest") {
                assetId = accepted(
                    await deskClient.builtinBackground(background)
                ).assetId;
                fallbackColor = null;
            } else if (background.startsWith("data:image/")) {
                const unchanged =
                    existing?.assetId &&
                    resourceRef.current[existing.assetId] === background;
                if (!unchanged) {
                    assetId = accepted(
                        await deskClient.importBackgroundData(background)
                    ).assetId;
                }
                fallbackColor = null;
            } else {
                assetId = null;
                fallbackColor = rgba(
                    background === "midnight"
                        ? "#101d31"
                        : background === "linen"
                          ? "#d3c8b2"
                          : background
                );
            }
            backgrounds.push({
                translationId: id,
                assetId,
                fallbackColor,
                fit:
                    appearance.fit === "contain"
                        ? ("fit" as const)
                        : ("fill" as const),
            });
        }
        accepted(
            await deskClient.applyAppearance(workspaceId, {
                fontFamily: appearance.fontFamily,
                bold: appearance.bold,
                italic: appearance.italic,
                underline: appearance.underline,
                strike: appearance.strike,
                color: rgba(appearance.color),
                bands: appearance.bands.map((band, index) => ({
                    lower: band.min,
                    upper:
                        index === appearance.bands.length - 1
                            ? null
                            : band.max + 1,
                    fontSizePx: band.size,
                })),
                backgrounds,
            })
        );
    }

    async function run(action: DeskAction) {
        const state = snapshotRef.current;
        if (action.type === "patchUi") {
            const before =
                interactionRef.current[action.workspaceId] ??
                initialInteraction;
            patch(action.workspaceId, action.patch);
            if (
                (action.patch.page !== undefined &&
                    action.patch.page !== before.page) ||
                (action.patch.order !== undefined &&
                    action.patch.order !== before.order)
            ) {
                await search(action.workspaceId, false);
            }
            return;
        }
        switch (action.type) {
            case "cancelReferenceChoice":
                choiceRef.current = null;
                setReferenceChoice(null);
                return;
            case "chooseReference": {
                const choice = choiceRef.current;
                if (
                    choice &&
                    choice.workspaceId === action.workspaceId &&
                    choice.choiceToken === action.choiceToken
                ) {
                    await inspectReference(
                        action.workspaceId,
                        choice.input,
                        choice.preview,
                        {
                            token: action.choiceToken,
                            book: action.bookNumber,
                        }
                    );
                }
                break;
            }
            case "add":
                accepted(await deskClient.addWorkspace(null));
                break;
            case "activate":
                accepted(
                    await deskClient.activateWorkspace(action.workspaceId)
                );
                break;
            case "rename":
                accepted(
                    await deskClient.renameWorkspace(
                        action.workspaceId,
                        action.name
                    )
                );
                break;
            case "remove":
                accepted(
                    await deskClient.removeWorkspace(action.workspaceId, true)
                );
                break;
            case "reorder":
                accepted(
                    await deskClient.reorderWorkspaces(action.workspaceIds)
                );
                break;
            case "openAudience":
                accepted(await deskClient.openAudience(action.workspaceId));
                break;
            case "closeAudience":
                accepted(await deskClient.closeAudience(action.workspaceId));
                break;
            case "blank":
                accepted(await deskClient.blankAudience(action.workspaceId));
                break;
            case "resume":
                accepted(await deskClient.resumeAudience(action.workspaceId));
                break;
            case "navigate":
                accepted(
                    await deskClient.navigateVerse(
                        action.workspaceId,
                        action.direction < 0 ? "previous" : "next"
                    )
                );
                break;
            case "reference":
                await inspectReference(
                    action.workspaceId,
                    action.input,
                    action.preview
                );
                break;
            case "preview":
                accepted(
                    await deskClient.previewVerse(
                        target(action.workspaceId, action.verse),
                        "search"
                    )
                );
                break;
            case "send":
                if (action.verse.candidateId) {
                    accepted(
                        await deskClient.sendPreview(
                            action.workspaceId,
                            action.verse.candidateId
                        )
                    );
                } else if (action.verse.historyActionId) {
                    accepted(
                        await deskClient.recallHistory(
                            action.workspaceId,
                            action.verse.historyActionId
                        )
                    );
                } else {
                    accepted(
                        await deskClient.selectVerse(
                            target(action.workspaceId, action.verse)
                        )
                    );
                }
                break;
            case "select":
                if (action.verse.historyActionId) {
                    accepted(
                        await deskClient.recallHistory(
                            action.workspaceId,
                            action.verse.historyActionId
                        )
                    );
                } else {
                    accepted(
                        await deskClient.selectVerse(
                            target(action.workspaceId, action.verse)
                        )
                    );
                }
                break;
            case "clearPreview": {
                const preview = state?.workspaces.find(
                    (item) => item.workspaceId === action.workspaceId
                )?.preview;
                if (preview) {
                    accepted(
                        await deskClient.dismissPreview(
                            action.workspaceId,
                            preview.candidateId
                        )
                    );
                }
                break;
            }
            case "search":
                await search(action.workspaceId);
                return;
            case "changeSearchTranslation":
                delete submittedSearches.current[action.workspaceId];
                searchGenerations.current[action.workspaceId] =
                    (searchGenerations.current[action.workspaceId] ?? 0) + 1;
                accepted(
                    await deskClient.selectTranslation(
                        action.workspaceId,
                        action.translationId
                    )
                );
                setSearches((previous) => {
                    const next = {
                        ...previous,
                    };
                    delete next[action.workspaceId];
                    return next;
                });
                patch(action.workspaceId, {
                    page: 1,
                    submittedQuery: "",
                });
                break;
            case "changeCurrentTranslation":
                accepted(
                    await deskClient.changeCurrentTranslation(
                        action.workspaceId,
                        action.translationId
                    )
                );
                break;
            case "hideCursor":
                accepted(
                    await deskClient.setHideCursor(
                        action.workspaceId,
                        action.enabled
                    )
                );
                break;
            case "fullscreen":
                accepted(
                    await deskClient.setAudienceFullscreen(
                        action.workspaceId,
                        action.enabled
                    )
                );
                break;
            case "alwaysOnTop":
                accepted(
                    await deskClient.setAudienceAlwaysOnTop(
                        action.workspaceId,
                        action.enabled
                    )
                );
                break;
            case "appearance":
                await applyAppearance(action.workspaceId, action.appearance);
                break;
            case "information":
                accepted(
                    await deskClient.setInformationMode(
                        action.workspaceId,
                        action.enabled,
                        action.bookId ?? null
                    )
                );
                break;
            case "inspectInformation": {
                const value = accepted(
                    await deskClient.bookInformation(
                        action.workspaceId,
                        action.bookId ?? null
                    )
                );
                setInformation((previous) => ({
                    ...previous,
                    [action.workspaceId]: value,
                }));
                return;
            }
            case "clearHistory":
                accepted(
                    await deskClient.clearHistory(action.workspaceId, true)
                );
                break;
            case "copyHistory": {
                const workspace = state?.workspaces.find(
                    (item) => item.workspaceId === action.workspaceId
                );
                const projectedOnly =
                    interactionRef.current[action.workspaceId]
                        ?.historyProjectedOnly;
                const entries =
                    workspace?.history
                        .filter(
                            (entry) =>
                                !entry.recordOnConfirmation ||
                                entry.outcome === "projected"
                        )
                        .filter(
                            (entry) =>
                                !projectedOnly || entry.outcome === "projected"
                        ) ?? [];
                const text = await Promise.all(
                    entries.map(async (entry) =>
                        accepted(
                            await deskClient.copyHistory(
                                action.workspaceId,
                                entry.actionId
                            )
                        )
                    )
                );
                await navigator.clipboard.writeText(text.join("\n\n"));
                return;
            }
            case "exportHistory": {
                const workspace = state?.workspaces.find(
                    (item) => item.workspaceId === action.workspaceId
                );
                const projectedOnly =
                    interactionRef.current[action.workspaceId]
                        ?.historyProjectedOnly;
                const ids =
                    workspace?.history
                        .filter(
                            (entry) =>
                                (!entry.recordOnConfirmation ||
                                    entry.outcome === "projected") &&
                                (!projectedOnly ||
                                    entry.outcome === "projected")
                        )
                        .slice()
                        .reverse()
                        .map((entry) => entry.actionId) ?? [];
                accepted(await deskClient.saveHistory(action.workspaceId, ids));
                return;
            }
            case "importBible": {
                const review = accepted(await deskClient.pickBibleImport());
                setImportReview(
                    review
                        ? {
                              id: review.token,
                              label: review.filename,
                              translations: review.translations.map((item) => ({
                                  title: item.title,
                                  bookCount: item.bookCount,
                                  verseCount: item.verseCount,
                              })),
                              warnings: review.warnings,
                          }
                        : null
                );
                return;
            }
            case "publishImport":
                accepted(await deskClient.commitImport(action.reviewId));
                setImportReview(null);
                break;
            case "cancelImport":
                accepted(await deskClient.cancelImport(action.reviewId));
                setImportReview(null);
                return;
            case "deleteTranslation":
                if (state) {
                    accepted(
                        await deskClient.deleteTranslation(
                            state.activeWorkspaceId,
                            action.translationId,
                            true
                        )
                    );
                }
                break;
        }
        await refresh();
    }

    const dispatch = (action: DeskAction) => {
        setError("");
        setPending((count) => count + 1);
        void run(action)
            .catch((cause: unknown) => {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "The action could not be completed."
                );
            })
            .finally(() => setPending((count) => count - 1));
    };

    return {
        activeId: snapshot?.activeWorkspaceId ?? "",
        workspaces:
            snapshot?.workspaces.map((workspace): Workspace => {
                const id = workspace.workspaceId;
                const interaction = interactions[id] ?? initialInteraction;
                const current = workspace.currentVerse;
                const result = searches[id];
                const key = current
                    ? `${current.editionId}:${current.coordinate.bookNumber}:${current.coordinate.chapter}`
                    : "";
                const history = workspace.history.filter(
                    (entry) =>
                        !entry.recordOnConfirmation ||
                        entry.outcome === "projected"
                );
                return {
                    ...interaction,
                    id,
                    name: workspace.settings.name,
                    translation: workspace.settings.selectedTranslationId,
                    current: current ? viewVerse(current) : null,
                    preview: workspace.preview
                        ? viewVerse(workspace.preview.verse, {
                              candidateId: workspace.preview.candidateId,
                          })
                        : null,
                    status: workspace.audience,
                    information: workspace.bookInformationMode,
                    hideCursor: workspace.settings.hideCursor,
                    fullscreen: workspace.fullscreen,
                    alwaysOnTop: workspace.alwaysOnTop,
                    appearance: viewAppearance(
                        workspace.appearance,
                        current?.translationId ??
                            workspace.settings.selectedTranslationId,
                        resources
                    ),
                    history: history.map((entry) => ({
                        id: entry.actionId,
                        verse: viewVerse(entry.verse, {
                            historyActionId: entry.actionId,
                        }),
                        timestamp: entry.timestampMs ?? 0,
                        projected: entry.outcome === "projected",
                        outcome: entry.outcome,
                        action: entry.kind,
                    })),
                    searchResults:
                        result?.results.map((hit) =>
                            viewVerse(hit.verse, {
                                highlights: byteHighlights(
                                    hit.verse.text,
                                    hit.highlights
                                ),
                            })
                        ) ?? [],
                    searchTotal: result?.total ?? 0,
                    searchPages: result
                        ? Math.max(1, Math.ceil(result.total / result.pageSize))
                        : 1,
                    ntPage: result?.newTestamentPage,
                    chapterVerses: (chapters[key] ?? []).map((verse) =>
                        viewVerse(verse)
                    ),
                    books: (
                        books[workspace.settings.selectedTranslationId] ?? []
                    ).map((book) => ({
                        id: book.bookNumber,
                        name: book.name,
                    })),
                    metadata: viewInformation(
                        workspace.bookInformationMode
                            ? workspace.information
                            : information[id] &&
                                (!current ||
                                    (information[id]?.editionId ===
                                        current.editionId &&
                                        information[id]?.bookNumber ===
                                            current.coordinate.bookNumber))
                              ? information[id]
                              : null
                    ),
                    projectionOutcome: workspace.history.find(
                        (entry) => entry.actionId === workspace.outputActionId
                    )?.outcome,
                    canPrevious: navigation[id]?.canPrevious,
                    canNext: navigation[id]?.canNext,
                };
            }) ?? [],
        translations:
            snapshot?.translations.map((translation) => ({
                id: translation.translationId,
                name: translation.title,
                shortName: translation.bundled ? "WEB" : translation.title,
                description: translation.description,
                bundled: translation.bundled,
                importLabel: translation.source.importFilename ?? undefined,
                bookCount: translation.bookCount,
                verseCount: translation.verseCount,
            })) ?? [],
        pending: pending > 0,
        error: [
            error,
            ...(snapshot?.projectionFailures ?? [])
                .filter(
                    (notice) =>
                        !dismissedProjectionFailures.has(
                            projectionFailureId(notice)
                        )
                )
                .map(
                    (notice) =>
                        `${notice.failure.message} (${notice.owner.workspaceId}, action ${notice.acknowledgment.actionId}, revision ${notice.acknowledgment.revision})`
                ),
        ]
            .filter(Boolean)
            .join("\n"),
        importReview,
        referenceChoice,
        dismissError() {
            setError("");
            setDismissedProjectionFailures(
                (previous) =>
                    new Set([
                        ...previous,
                        ...(snapshot?.projectionFailures ?? []).map(
                            projectionFailureId
                        ),
                    ])
            );
        },
        dispatch,
    };
}
