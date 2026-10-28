import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getRouter } from "./router";

beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })
    );
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

it("renders the integrated operator through the browser adapter", async () => {
    renderRouter();
    expect(
        await screen.findByRole("textbox", { name: "Quick reference" })
    ).toBeTruthy();
    expect(screen.getByText("Current verse")).toBeTruthy();
    expect(screen.getAllByText("John 3:16").length).toBeGreaterThan(0);
});

it("navigates to the development playground and back to the operator", async () => {
    const router = renderRouter();
    await screen.findByRole("textbox", { name: "Quick reference" });
    await act(() => router.navigate({ to: "/playground" }));
    expect(await screen.findByText('Hello "/playground"!')).toBeTruthy();
    act(() => router.history.back());
    expect(
        await screen.findByRole("textbox", { name: "Quick reference" })
    ).toBeTruthy();
    expect(screen.queryByText('Hello "/playground"!')).toBeNull();
});
