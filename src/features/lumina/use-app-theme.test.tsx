import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type ApplicationSnapshot,
    type ClientResult,
    client,
    createBrowserClient,
    deskClient,
    onApplicationChanged,
} from "@/bridge/client";
import { useAppTheme } from "./use-app-theme";

vi.mock("@/bridge/client", async (original) => {
    const actual = await original<typeof import("@/bridge/client")>();
    return {
        ...actual,
        isDesktopHost: true,
        client: {
            ...actual.client,
            getApplicationState: vi.fn(),
        },
        deskClient: {
            ...actual.deskClient,
            setApplicationTheme: vi.fn(),
        },
        onApplicationChanged: vi.fn(),
    };
});
const fixture = await createBrowserClient().getApplicationState();
if (fixture.status !== "ok") {
    throw new Error("Fixture unavailable");
}
const initialState = fixture.data;
let state: ApplicationSnapshot;
let listeners: (() => void)[];
let systemChanged: () => void;
let media: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
    vi.clearAllMocks();
    state = structuredClone(initialState);
    state.applicationTheme = "dark";
    listeners = [];
    media = {
        matches: true,
        addEventListener: vi.fn((_event, listener) => {
            systemChanged = listener;
        }),
        removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", () => media);
    vi.mocked(client.getApplicationState).mockImplementation(async () => ({
        status: "ok",
        data: structuredClone(state),
    }));
    vi.mocked(onApplicationChanged).mockImplementation(async (listener) => {
        listeners.push(listener);
        return () => {};
    });
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});
it("applies shared accepted preferences on both surfaces and follows system changes", async () => {
    const operator = renderHook(useAppTheme);
    const audience = renderHook(useAppTheme);
    await waitFor(() => expect(operator.result.current.theme).toBe("dark"));
    await waitFor(() => expect(audience.result.current.theme).toBe("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    state.applicationTheme = "light";
    act(() =>
        listeners.forEach((listener) => {
            listener();
        })
    );
    await waitFor(() => expect(audience.result.current.theme).toBe("light"));
    expect(operator.result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    state.applicationTheme = "system";
    act(() =>
        listeners.forEach((listener) => {
            listener();
        })
    );
    await waitFor(() => expect(audience.result.current.theme).toBe("system"));
    expect(document.documentElement.dataset.theme).toBe("light");
    media.matches = false;
    act(() => systemChanged());
    expect(document.documentElement.dataset.theme).toBe("dark");
});
it("keeps the accepted theme while a write is pending or rejected", async () => {
    let settle!: (value: ClientResult<null>) => void;
    vi.mocked(deskClient.setApplicationTheme).mockImplementation(
        () =>
            new Promise((resolve) => {
                settle = resolve;
            })
    );
    const hook = renderHook(useAppTheme);
    await waitFor(() => expect(hook.result.current.theme).toBe("dark"));
    act(() => hook.result.current.setTheme("light"));
    expect(deskClient.setApplicationTheme).toHaveBeenCalledWith("light");
    expect(hook.result.current.theme).toBe("dark");
    await act(async () =>
        settle({
            status: "error",
            error: {
                errorCode: "STORAGE_FAILURE",
                message: "Theme could not be saved",
            },
        })
    );
    expect(hook.result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(hook.result.current.themeError).toBe("Theme could not be saved");
});
