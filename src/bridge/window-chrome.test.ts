import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, expect, it, vi } from "vitest";
import {
    observeOperatorFullscreen,
    usesOverlayTitlebar,
} from "./window-chrome";

function setup(read: () => boolean | Promise<boolean>) {
    vi.stubGlobal("isTauri", true);
    vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    mockWindows("main");
    const native = vi.fn((command: string) => {
        if (command === "plugin:window|is_fullscreen") {
            return read();
        }
        throw new Error(`Unexpected native command: ${command}`);
    });
    mockIPC(native, {
        shouldMockEvents: true,
    });
    return native;
}

function resize() {
    return emit("tauri://resize", {
        width: 1440,
        height: 900,
    });
}

afterEach(() => {
    clearMocks();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

it.each([
    "browser",
    "audience",
    "windows",
])("leaves %s chrome alone without invoking native window APIs", (host) => {
    const native = setup(() => false);
    if (host === "browser") {
        vi.stubGlobal("isTauri", false);
    } else if (host === "audience") {
        mockWindows("audience-1");
    } else {
        vi.stubGlobal("navigator", {
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        });
    }
    const listener = vi.fn();
    expect(usesOverlayTitlebar()).toBe(false);
    observeOperatorFullscreen(listener)();
    expect(native).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
});

it("reports initial native fullscreen and transitions, then unsubscribes", async () => {
    let fullscreen = false;
    const native = setup(() => fullscreen);
    const listener = vi.fn();
    const dispose = observeOperatorFullscreen(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(false));
    fullscreen = true;
    await resize();
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(true));
    fullscreen = false;
    await resize();
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(false));
    dispose();
    native.mockClear();
    listener.mockClear();
    await resize();
    expect(native).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
});

it("ignores stale state reads and reads completed after disposal", async () => {
    const pending: ((value: boolean) => void)[] = [];
    setup(() => new Promise((resolve) => pending.push(resolve)));
    const listener = vi.fn();
    const dispose = observeOperatorFullscreen(listener);
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    await resize();
    pending[1](true);
    await vi.waitFor(() =>
        expect(listener).toHaveBeenCalledExactlyOnceWith(true)
    );
    pending[0](false);
    await resize();
    dispose();
    pending[2](false);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledExactlyOnceWith(true);
});

it("retains safe spacing on failure and recovers on the next native resize", async () => {
    const failure = new Error("Window unavailable");
    let fail = true;
    setup(() => (fail ? Promise.reject(failure) : true));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const listener = vi.fn();
    const dispose = observeOperatorFullscreen(listener);
    await vi.waitFor(() =>
        expect(diagnostic).toHaveBeenCalledWith(
            "Lumina could not read native fullscreen state",
            failure
        )
    );
    expect(listener).not.toHaveBeenCalled();
    fail = false;
    await resize();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(true));
    dispose();
});
