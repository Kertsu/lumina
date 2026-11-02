import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicationUpdater } from "@/bridge/client";
import { ApplicationMenu } from "./application-menu";

function session() {
    return {
        check: vi.fn<ApplicationUpdater["check"]>().mockResolvedValue(null),
        install: vi
            .fn<ApplicationUpdater["install"]>()
            .mockResolvedValue(undefined),
        dispose: vi.fn().mockResolvedValue(undefined),
    };
}

function renderMenu(updater: ApplicationUpdater) {
    return render(
        <ApplicationMenu
            onSettings={() => {}}
            onLibrary={() => {}}
            onShortcuts={() => {}}
            createUpdater={() => updater}
        />
    );
}

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it.each([
    "up-to-date",
    "offline",
])("keeps the app menu without an update dot when %s", async (state) => {
    const updater = session();
    if (state === "offline") {
        updater.check.mockRejectedValue(new Error("Offline"));
    }
    const { container } = renderMenu(updater);
    await waitFor(() => expect(updater.check).toHaveBeenCalledOnce());
    const trigger = screen.getByRole("button", { name: "Lumina menu" });
    expect(container.querySelector(".app-update-dot")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.pointerDown(trigger, {
        button: 0,
        ctrlKey: false,
        pointerType: "mouse",
    });
    await screen.findByRole("menuitem", { name: /App settings/ });
    expect(
        screen.queryByRole("menuitem", { name: /Update available/ })
    ).toBeNull();
});

it("signals a detected update, opens details from the menu, and restores focus after Later", async () => {
    const updater = session();
    updater.check.mockResolvedValue({
        currentVersion: "0.1.0-beta.2",
        version: "0.1.0-beta.3",
        notes: "Projection recovery fixes.",
    });
    const { container } = renderMenu(updater);
    const trigger = await screen.findByRole("button", {
        name: "Lumina menu, update available",
    });
    expect(container.querySelector(".app-update-dot")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(updater.install).not.toHaveBeenCalled();
    fireEvent.pointerDown(trigger, {
        button: 0,
        ctrlKey: false,
        pointerType: "mouse",
    });
    fireEvent.click(
        await screen.findByRole("menuitem", {
            name: /Update available.*0.1.0-beta.3/,
        })
    );
    await screen.findByRole("dialog", { name: "Update Lumina" });
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });
    expect(container.querySelector(".app-update-dot")).not.toBeNull();
    expect(updater.check).toHaveBeenCalledOnce();
    expect(updater.install).not.toHaveBeenCalled();
});
