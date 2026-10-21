import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getRouter } from "./router";

beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

function renderRouter(initialPath = "/") {
    const router = getRouter();
    router.update({
        history: createMemoryHistory({
            initialEntries: [initialPath],
        }),
    });
    render(<RouterProvider router={router} />);
    return router;
}

it("shows not found for the playground outside development", async () => {
    vi.stubEnv("DEV", false);
    renderRouter("/playground");

    expect(await screen.findByText("Not Found")).toBeTruthy();
    expect(screen.queryByText('Hello "/playground"!')).toBeNull();
});

it("renders the welcome screen in the client application", async () => {
    renderRouter();

    expect(
        await screen.findByRole("heading", {
            name: "Lumina",
        })
    ).toBeTruthy();
    expect(
        screen.getByText(
            "Verse projection for the room, without exposing the operator's screen."
        )
    ).toBeTruthy();
    expect(screen.getByAltText("Lumina in-app icon").getAttribute("src")).toBe(
        "/lumina-mark-loading.svg"
    );
});

it("navigates to the development playground and back to welcome", async () => {
    const router = renderRouter();
    await screen.findByRole("heading", {
        name: "Lumina",
    });

    await act(() =>
        router.navigate({
            to: "/playground",
        })
    );
    expect(await screen.findByText('Hello "/playground"!')).toBeTruthy();

    act(() => router.history.back());
    expect(
        await screen.findByRole("heading", {
            name: "Lumina",
        })
    ).toBeTruthy();
    expect(screen.queryByText('Hello "/playground"!')).toBeNull();
});
