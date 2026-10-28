import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type AudienceOutput,
    createBrowserClient,
    deskClient,
    onAudienceOutput,
} from "@/bridge/client";
import { AudienceReceiver } from "./audience-receiver";

vi.mock("@/bridge/client", async (original) => {
    const actual = await original<typeof import("@/bridge/client")>();
    return {
        ...actual,
        deskClient: {
            ...actual.deskClient,
            audienceState: vi.fn(),
            readAssetUri: vi.fn(),
            acknowledgeAudience: vi.fn(),
        },
        onAudienceOutput: vi.fn(),
    };
});
const fixture = await createBrowserClient().getApplicationState();
if (fixture.status !== "ok" || !fixture.data.workspaces[0].currentVerse) {
    throw new Error("Fixture verse unavailable");
}
const verse = fixture.data.workspaces[0].currentVerse;
const appearance = fixture.data.workspaces[0].appearance;
let receive: (output: AudienceOutput) => void;
let decode: () => Promise<void>;
let frames: FrameRequestCallback[];
function output(revision = 1): AudienceOutput {
    return {
        owner: {
            workspaceId: "workspace-a",
            instanceId: "instance-a",
            sessionId: "session-a",
        },
        revision,
        actionId: `action-${revision}`,
        content: {
            kind: "verse",
            verse: {
                ...verse,
                text: `Verse ${revision}`,
            },
        },
        background: null,
        appearance: {
            ...appearance,
            backgrounds: [
                {
                    translationId: "unrelated",
                    assetId: "unrelated-image",
                    fallbackColor: null,
                    fit: "fill",
                },
            ],
        },
        hideCursor: true,
    };
}
beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("matchMedia", () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
    frames = [];
    decode = vi.fn(async () => {});
    vi.stubGlobal(
        "Image",
        class {
            src = "";
            decode() {
                return decode();
            }
        }
    );
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(document, "fonts", {
        configurable: true,
        value: {
            ready: Promise.resolve(),
        },
    });
    vi.mocked(onAudienceOutput).mockImplementation(async (listener) => {
        receive = listener;
        return () => {};
    });
    vi.mocked(deskClient.audienceState).mockResolvedValue({
        status: "ok",
        data: null,
    });
    vi.mocked(deskClient.readAssetUri).mockResolvedValue({
        status: "ok",
        data: "data:image/png;base64,AA==",
    });
    vi.mocked(deskClient.acknowledgeAudience).mockResolvedValue({
        status: "ok",
        data: null,
    });
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});
async function start() {
    const view = render(<AudienceReceiver />);
    await waitFor(() => expect(deskClient.audienceState).toHaveBeenCalled());
    return view;
}
async function paint() {
    await act(async () => {
        frames.shift()?.(0);
    });
    await act(async () => {
        frames.shift()?.(0);
    });
}
it("loads only the active background and acknowledges the exact committed verse", async () => {
    await start();
    await act(async () => receive(output(3)));
    expect(screen.getByText("Verse 3")).toBeDefined();
    expect(deskClient.readAssetUri).not.toHaveBeenCalled();
    await paint();
    expect(deskClient.acknowledgeAudience).toHaveBeenCalledExactlyOnceWith({
        sessionId: "session-a",
        revision: 3,
        actionId: "action-3",
    });
});
it("applies blank immediately while an image is loading and never acknowledges the superseded verse", async () => {
    let decoded!: () => void;
    decode = () =>
        new Promise<void>((resolve) => {
            decoded = resolve;
        });
    const { container } = await start();
    const pending = output(1);
    pending.background = {
        translationId: verse.translationId,
        assetId: "active-image",
        fallbackColor: "#123456ff",
        fit: "fill",
    };
    await act(async () => receive(pending));
    await waitFor(() =>
        expect(deskClient.readAssetUri).toHaveBeenCalledWith("active-image")
    );
    await act(async () =>
        receive({
            ...output(2),
            actionId: null,
            content: {
                kind: "blank",
            },
        })
    );
    expect(container.querySelector(".audience-blank")).toBeTruthy();
    await act(async () => decoded());
    await paint();
    expect(container.querySelector(".audience-blank")).toBeTruthy();
    expect(screen.queryByText("Verse 1")).toBeNull();
    expect(deskClient.acknowledgeAudience).not.toHaveBeenCalled();
    expect(
        vi.mocked(deskClient.readAssetUri).mock.calls.map(([id]) => id)
    ).toEqual(["active-image"]);
});
it("uses a captured fallback for a missing image and reports failed outcome storage once", async () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deskClient.readAssetUri).mockResolvedValue({
        status: "error",
        error: {
            errorCode: "ASSET_REJECTED",
            message: "Missing image",
            data: {
                reason: "missing",
                assetId: "missing-image",
            },
        },
    });
    const failure = {
        errorCode: "PROJECTION_STORAGE_UNCERTAIN" as const,
        message: "History confirmation could not be saved",
        data: {
            workspaceId: "workspace-a",
            actionId: "action-4",
        },
    };
    vi.mocked(deskClient.acknowledgeAudience).mockResolvedValue({
        status: "error",
        error: failure,
    });
    const { container } = await start();
    const incoming = output(4);
    incoming.background = {
        translationId: verse.translationId,
        assetId: "missing-image",
        fallbackColor: "#123456ff",
        fit: "fill",
    };
    await act(async () => receive(incoming));
    expect(screen.getByText("Verse 4")).toBeDefined();
    expect(
        (container.querySelector(".verse-slide") as HTMLElement).style
            .backgroundColor
    ).toBe("rgb(18, 52, 86)");
    await paint();
    expect(deskClient.acknowledgeAudience).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
        "Audience confirmation could not be recorded",
        failure,
        {
            sessionId: "session-a",
            revision: 4,
            actionId: "action-4",
        }
    );
    expect(screen.queryByText(failure.message)).toBeNull();
});
