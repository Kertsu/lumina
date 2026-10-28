import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type ApplicationSnapshot,
    client,
    createBrowserClient,
    deskClient,
    onApplicationChanged,
    type SearchRequest,
    type SearchResult,
} from "@/bridge/client";

const fixture = await createBrowserClient().getApplicationState();
if (fixture.status !== "ok") {
    throw new Error("Fixture unavailable");
}
const browserState = fixture.data;
const fixtureVerse = browserState.workspaces[0].currentVerse;
if (!fixtureVerse) {
    throw new Error("Fixture verse unavailable");
}
const browserReference = {
    verse: fixtureVerse,
};

import { useIntegratedDeskController } from "./use-integrated-desk";

vi.mock("@/bridge/client", async (original) => {
    const actual = await original<typeof import("@/bridge/client")>();
    return {
        ...actual,
        client: {
            ...actual.client,
            getApplicationState: vi.fn(),
        },
        deskClient: {
            ...actual.deskClient,
            searchVerses: vi.fn(),
            deleteTranslation: vi.fn(),
            navigationState: vi.fn(),
        },
        onApplicationChanged: vi.fn(),
    };
});
let state: ApplicationSnapshot;
let changed: () => void;
const id = "browser-workspace";
function result(request: SearchRequest): SearchResult {
    return {
        ...request,
        translationId: request.translationId ?? "browser-web",
        editionId:
            state.translations.find(
                (item) => item.translationId === request.translationId
            )?.editionId ?? "missing",
        libraryRevision: 1,
        results: [
            {
                verse: browserReference.verse,
                highlights: [],
            },
        ],
        total: 60,
        newTestamentPage: 2,
        broaderMatch: false,
        highlightEncoding: "utf8Bytes",
    };
}
beforeEach(() => {
    state = structuredClone(browserState);
    vi.mocked(client.getApplicationState).mockImplementation(async () => ({
        status: "ok",
        data: structuredClone(state),
    }));
    vi.mocked(onApplicationChanged).mockImplementation(async (listener) => {
        changed = listener;
        return () => {};
    });
    vi.mocked(deskClient.navigationState).mockResolvedValue({
        status: "ok",
        data: {
            canPrevious: false,
            canNext: true,
        },
    });
    vi.mocked(deskClient.searchVerses).mockImplementation(async (request) => ({
        status: "ok",
        data: result(request),
    }));
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
async function setup() {
    const hook = renderHook(useIntegratedDeskController);
    await waitFor(() => expect(hook.result.current.workspaces).toHaveLength(1));
    const patch = (values: Partial<import("./model").Workspace>) =>
        act(() =>
            hook.result.current.dispatch({
                type: "patchUi",
                workspaceId: id,
                patch: values,
            })
        );
    return {
        ...hook,
        patch,
    };
}
it("submits selector OT/NT scopes and keeps draft edits out of paging and ordering", async () => {
    const hook = await setup();
    hook.patch({
        query: "love",
        scope: "OT",
        mode: "phrase",
    });
    act(() =>
        hook.result.current.dispatch({
            type: "search",
            workspaceId: id,
        })
    );
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].searchTotal).toBe(60)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[0][0]).toMatchObject({
        query: "love",
        scope: "oldTestament",
        mode: "phrase",
    });
    hook.patch({
        query: "peace",
        scope: "NT",
        mode: "contains",
    });
    expect(hook.result.current.workspaces[0].searchTotal).toBe(60);
    hook.patch({
        page: 2,
    });
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(2)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[1][0]).toMatchObject({
        query: "love",
        scope: "oldTestament",
        mode: "phrase",
        page: 2,
    });
    hook.patch({
        order: "bible",
    });
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(3)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[2][0]).toMatchObject({
        query: "love",
        scope: "oldTestament",
        mode: "phrase",
        order: "bibleOrder",
    });
    act(() =>
        hook.result.current.dispatch({
            type: "search",
            workspaceId: id,
        })
    );
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(4)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[3][0]).toMatchObject({
        query: "peace",
        scope: "newTestament",
        mode: "containsText",
        page: 1,
    });
});
it("clears deleted-edition results and ignores in-flight searches while preserving drafts", async () => {
    state.translations.push({
        ...state.translations[0],
        translationId: "imported",
        editionId: "deleted-edition",
        bundled: false,
    });
    state.workspaces[0].settings.selectedTranslationId = "imported";
    const hook = await setup();
    hook.patch({
        query: "love",
        scope: "NT",
        mode: "phrase",
    });
    act(() =>
        hook.result.current.dispatch({
            type: "search",
            workspaceId: id,
        })
    );
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].searchTotal).toBe(60)
    );
    let resolve!: (
        value: Awaited<ReturnType<typeof deskClient.searchVerses>>
    ) => void;
    let pendingRequest!: SearchRequest;
    vi.mocked(deskClient.searchVerses).mockImplementationOnce((request) => {
        pendingRequest = request;
        return new Promise((done) => {
            resolve = done;
        });
    });
    hook.patch({
        page: 2,
    });
    vi.mocked(deskClient.deleteTranslation).mockImplementationOnce(async () => {
        state.translations.pop();
        state.workspaces[0].settings.selectedTranslationId = "browser-web";
        return {
            status: "ok",
            data: null,
        };
    });
    act(() =>
        hook.result.current.dispatch({
            type: "deleteTranslation",
            translationId: "imported",
        })
    );
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].translation).toBe(
            "browser-web"
        )
    );
    expect(hook.result.current.workspaces[0]).toMatchObject({
        query: "love",
        scope: "NT",
        mode: "phrase",
        searchTotal: 0,
        submittedQuery: "",
    });
    await act(async () =>
        resolve({
            status: "ok",
            data: {
                ...result(pendingRequest),
                translationId: "imported",
                editionId: "deleted-edition",
            },
        })
    );
    expect(hook.result.current.workspaces[0].searchResults).toEqual([]);
});
it("correlates outcome with the current action including hidden resume intents and keeps newest history first", async () => {
    const workspace = state.workspaces[0];
    const entry = {
        actionId: "old",
        workspaceId: id,
        verse: browserReference.verse,
        background: null,
        timestampMs: 1,
        kind: "sendLive" as const,
        outcome: "projected" as const,
        owner: null,
        revision: 1,
        recordOnConfirmation: false,
    };
    workspace.history = [
        {
            ...entry,
            actionId: "resume",
            outcome: "awaitingConfirmation",
            recordOnConfirmation: true,
        },
        {
            ...entry,
            actionId: "newer",
            outcome: "unconfirmed",
        },
        entry,
    ];
    workspace.outputActionId = "resume";
    const hook = await setup();
    expect(hook.result.current.workspaces[0].projectionOutcome).toBe(
        "awaitingConfirmation"
    );
    expect(
        hook.result.current.workspaces[0].history.map((item) => item.id)
    ).toEqual(["newer", "old"]);
    state.workspaces[0].outputActionId = "newer";
    act(() => changed());
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].projectionOutcome).toBe(
            "unconfirmed"
        )
    );
});

it("surfaces typed confirmation storage failure separately from an unconfirmed projection", async () => {
    state.projectionFailures = [
        {
            owner: {
                workspaceId: id,
                sessionId: "session-a",
                instanceId: "instance-a",
            },
            acknowledgment: {
                sessionId: "session-a",
                revision: 9,
                actionId: "action-9",
            },
            failure: {
                errorCode: "PROJECTION_STORAGE_UNCERTAIN",
                message:
                    "The audience applied this verse, but its history confirmation could not be saved.",
                data: {
                    workspaceId: id,
                    actionId: "action-9",
                },
            },
        },
    ];
    const hook = await setup();
    expect(hook.result.current.error).toContain(
        "history confirmation could not be saved"
    );
    expect(hook.result.current.error).toContain("action action-9, revision 9");
    expect(hook.result.current.workspaces[0].projectionOutcome).not.toBe(
        "projected"
    );
    act(() => hook.result.current.dismissError());
    expect(hook.result.current.error).toBe("");
    act(() => changed());
    await waitFor(() => expect(hook.result.current.error).toBe(""));
    state.projectionFailures[0].acknowledgment.revision = 10;
    act(() => changed());
    await waitFor(() =>
        expect(hook.result.current.error).toContain("revision 10")
    );
});

it("keeps accepted search paging usable when a new draft submission is rejected", async () => {
    const hook = await setup();
    hook.patch({
        query: "love",
        scope: "OT",
        mode: "phrase",
    });
    act(() =>
        hook.result.current.dispatch({
            type: "search",
            workspaceId: id,
        })
    );
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].searchTotal).toBe(60)
    );
    hook.patch({
        page: 2,
    });
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(2)
    );
    hook.patch({
        query: "   ",
        scope: "NT",
        mode: "contains",
    });
    vi.mocked(deskClient.searchVerses).mockResolvedValueOnce({
        status: "error",
        error: {
            errorCode: "INVALID_SEARCH",
            message: "Enter search text",
            data: {
                field: "query",
                reason: "empty",
            },
        },
    });
    act(() =>
        hook.result.current.dispatch({
            type: "search",
            workspaceId: id,
        })
    );
    await waitFor(() =>
        expect(hook.result.current.error).toBe("Enter search text")
    );
    expect(hook.result.current.workspaces[0]).toMatchObject({
        submittedQuery: "love",
        searchTotal: 60,
        page: 2,
    });
    hook.patch({
        page: 3,
    });
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(4)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[3][0]).toMatchObject({
        query: "love",
        mode: "phrase",
        scope: "oldTestament",
        page: 3,
    });
    hook.patch({
        order: "bible",
    });
    await waitFor(() =>
        expect(deskClient.searchVerses).toHaveBeenCalledTimes(5)
    );
    expect(vi.mocked(deskClient.searchVerses).mock.calls[4][0]).toMatchObject({
        query: "love",
        mode: "phrase",
        scope: "oldTestament",
        order: "bibleOrder",
    });
});

it("keeps cosmetic refresh separate from a pending verse intent without adding history", async () => {
    const workspace = state.workspaces[0];
    workspace.audience = "live";
    workspace.outputActionId = "projected-verse";
    workspace.history = [
        {
            actionId: "projected-verse",
            workspaceId: id,
            verse: browserReference.verse,
            background: null,
            timestampMs: 1,
            kind: "sendLive",
            outcome: "projected",
            owner: null,
            revision: 1,
            recordOnConfirmation: false,
        },
    ];
    const hook = await setup();
    expect(hook.result.current.workspaces[0].projectionOutcome).toBe(
        "projected"
    );
    state.workspaces[0].outputRevision += 1;
    state.workspaces[0].outputActionId = null;
    state.workspaces[0].appearance.bold = true;
    act(() => changed());
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].appearance.bold).toBe(true)
    );
    expect(hook.result.current.workspaces[0].projectionOutcome).toBeUndefined();
    expect(hook.result.current.workspaces[0].history).toHaveLength(1);
    state.workspaces[0].history = [];
    act(() => changed());
    await waitFor(() =>
        expect(hook.result.current.workspaces[0].history).toHaveLength(0)
    );
    expect(hook.result.current.workspaces[0].projectionOutcome).toBeUndefined();
});
