import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createApplicationUpdater } from "./updater";

const native = vi.hoisted(() => ({
    isTauri: vi.fn(() => true),
    check: vi.fn(),
    relaunch: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
    isTauri: native.isTauri,
}));
vi.mock("@tauri-apps/plugin-updater", () => ({
    check: native.check,
}));
vi.mock("@tauri-apps/plugin-process", () => ({
    relaunch: native.relaunch,
}));

function candidate(version = "0.1.0-beta.2") {
    return {
        currentVersion: "0.1.0-beta.1",
        version,
        body: "A beta fix.",
        close: vi.fn().mockResolvedValue(undefined),
        downloadAndInstall: vi.fn().mockResolvedValue(undefined),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    native.isTauri.mockReturnValue(true);
    native.relaunch.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

it("does not call native APIs in browser mode", async () => {
    native.isTauri.mockReturnValue(false);
    const updater = createApplicationUpdater();
    expect(await updater.check()).toBeNull();
    expect(native.check).not.toHaveBeenCalled();
    await updater.dispose();
});

it("shares concurrent checks and releases superseded native resources", async () => {
    const first = candidate();
    const second = candidate("0.1.0-beta.3");
    native.check.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const updater = createApplicationUpdater();
    const check = updater.check();
    expect(updater.check()).toBe(check);
    expect(await check).toEqual({
        currentVersion: first.currentVersion,
        version: first.version,
        notes: first.body,
    });
    expect(first.downloadAndInstall).not.toHaveBeenCalled();
    await updater.check();
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).not.toHaveBeenCalled();
    await updater.dispose();
    expect(second.close).toHaveBeenCalledOnce();
});

it("releases a check result arriving after disposal", async () => {
    const next = candidate();
    let resolve: (value: typeof next) => void = () => {};
    native.check.mockReturnValue(new Promise((done) => (resolve = done)));
    const updater = createApplicationUpdater();
    const check = updater.check();
    await updater.dispose();
    resolve(next);
    expect(await check).toBeNull();
    expect(next.close).toHaveBeenCalledOnce();
});

it("refuses to install a different release than the one confirmed", async () => {
    const next = candidate("0.1.0-beta.3");
    native.check.mockResolvedValue(next);
    const updater = createApplicationUpdater();
    await updater.check();
    await expect(updater.install("0.1.0-beta.2", vi.fn())).rejects.toThrow(
        "unavailable"
    );
    expect(next.downloadAndInstall).not.toHaveBeenCalled();
    expect(native.relaunch).not.toHaveBeenCalled();
    await updater.dispose();
});

it("never restarts after a failed package installation and permits retry", async () => {
    const next = candidate();
    next.downloadAndInstall.mockRejectedValueOnce(
        new Error("Invalid signature")
    );
    native.check.mockResolvedValue(next);
    const updater = createApplicationUpdater();
    await updater.check();
    await expect(updater.install(next.version, vi.fn())).rejects.toThrow(
        "Invalid signature"
    );
    expect(native.relaunch).not.toHaveBeenCalled();
    await updater.install(next.version, vi.fn());
    expect(next.downloadAndInstall).toHaveBeenCalledTimes(2);
    expect(native.relaunch).toHaveBeenCalledOnce();
    await updater.dispose();
});

it("retries only restart if installation succeeded but relaunch failed", async () => {
    const next = candidate();
    native.check.mockResolvedValue(next);
    native.relaunch.mockRejectedValueOnce(new Error("Restart failed"));
    const updater = createApplicationUpdater();
    await updater.check();
    await expect(updater.install(next.version, vi.fn())).rejects.toThrow(
        "Restart failed"
    );
    const progress = vi.fn();
    await updater.install(next.version, progress);
    expect(next.downloadAndInstall).toHaveBeenCalledOnce();
    expect(native.relaunch).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledWith({
        phase: "restarting",
        downloaded: 0,
    });
    await updater.dispose();
});
