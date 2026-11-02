import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicationUpdater, AvailableUpdate } from "@/bridge/client";
import { ApplicationUpdate } from "./application-update";

function updateFixture(createUpdater: () => ApplicationUpdater) {
    return (
        <ApplicationUpdate createUpdater={createUpdater}>
            {({ update, openDetails }) =>
                update && (
                    <button type="button" onClick={openDetails}>
                        Update available
                    </button>
                )
            }
        </ApplicationUpdate>
    );
}

const release: AvailableUpdate = {
    currentVersion: "0.1.0-beta.1",
    version: "0.1.0-beta.2",
    notes: "Fixed projection recovery.",
};

function session() {
    return {
        check: vi.fn().mockResolvedValue(release),
        install: vi
            .fn<ApplicationUpdater["install"]>()
            .mockResolvedValue(undefined),
        dispose: vi.fn().mockResolvedValue(undefined),
    };
}

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("discovers silently, requires a click and confirmation, and allows Later", async () => {
    const updater = session();
    render(updateFixture(() => updater));
    const indicator = await screen.findByRole("button", {
        name: "Update available",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(updater.install).not.toHaveBeenCalled();
    fireEvent.click(indicator);
    expect(screen.getByRole("dialog").textContent).toContain(release.version);
    expect(screen.getByRole("dialog").textContent).toContain(
        "all audience windows"
    );
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(updater.install).not.toHaveBeenCalled();
    fireEvent.click(indicator);
    fireEvent.click(screen.getByRole("button", { name: "Update and restart" }));
    await waitFor(() => expect(updater.install).toHaveBeenCalledOnce());
    expect(updater.install).toHaveBeenCalledWith(
        release.version,
        expect.any(Function)
    );
});

it("keeps failed background checks invisible and retries when connectivity returns", async () => {
    const updater = session();
    updater.check.mockRejectedValueOnce(new Error("Offline"));
    render(updateFixture(() => updater));
    await waitFor(() => expect(updater.check).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent(window, new Event("online"));
    await screen.findByRole("button", { name: "Update available" });
    expect(updater.check).toHaveBeenCalledTimes(2);
});

it("shows installation failure inside the user-opened dialog and permits retry", async () => {
    const updater = session();
    updater.install.mockRejectedValueOnce(new Error("Invalid signature"));
    render(updateFixture(() => updater));
    fireEvent.click(
        await screen.findByRole("button", { name: "Update available" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Update and restart" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
        "could not be installed"
    );
    fireEvent.click(screen.getByRole("button", { name: "Update and restart" }));
    await waitFor(() => expect(updater.install).toHaveBeenCalledTimes(2));
});

it("keeps confirmation consistent when an in-flight check returns a newer release", async () => {
    const updater = session();
    const next = {
        ...release,
        version: "0.1.0-beta.3",
    };
    let resolve: (value: AvailableUpdate) => void = () => {};
    updater.check
        .mockResolvedValueOnce(release)
        .mockReturnValueOnce(new Promise((done) => (resolve = done)));
    render(updateFixture(() => updater));
    const indicator = await screen.findByRole("button", {
        name: "Update available",
    });
    fireEvent(window, new Event("online"));
    fireEvent.click(indicator);
    resolve(next);
    await waitFor(() =>
        expect(screen.getByRole("dialog").textContent).toContain(next.version)
    );
    fireEvent.click(screen.getByRole("button", { name: "Update and restart" }));
    await waitFor(() =>
        expect(updater.install).toHaveBeenCalledWith(
            next.version,
            expect.any(Function)
        )
    );
});

it("uses a fresh native session under Strict Mode and disposes both sessions", async () => {
    const first = session();
    const second = session();
    const factory = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
    const view = render(<StrictMode>{updateFixture(factory)}</StrictMode>);
    await screen.findByRole("button", { name: "Update available" });
    expect(first.dispose).toHaveBeenCalledOnce();
    view.unmount();
    expect(second.dispose).toHaveBeenCalledOnce();
});
