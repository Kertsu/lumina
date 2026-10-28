import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DesktopQuitShortcut, QuitShortcut } from "./quit-shortcut";

let now = 0;
beforeEach(() => {
    now = 0;
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

function advance(ms: number) {
    now += ms;
    act(() => vi.advanceTimersByTime(ms));
}

function setup(platform: "mac" | "windows" | "linux" = "mac", operator = true) {
    const onQuit = vi.fn().mockResolvedValue({
        status: "ok",
        data: null,
    });
    const onRequestQuit = vi.fn().mockResolvedValue({
        status: "ok",
        data: null,
    });
    const view = render(
        <QuitShortcut
            platform={platform}
            operator={operator}
            onQuit={onQuit}
            onRequestQuit={onRequestQuit}
        />
    );
    const down = (
        options: KeyboardEventInit = {},
        target: Element | Window = window
    ) => {
        const event = new KeyboardEvent("keydown", {
            key: "q",
            metaKey: platform === "mac",
            ctrlKey: platform !== "mac",
            bubbles: true,
            cancelable: true,
            ...options,
        });
        fireEvent(target, event);
        return event;
    };
    const up = (key = "q") => fireEvent.keyUp(window, { key });
    const doublePress = () => {
        down();
        up();
        advance(300);
        down();
    };
    return { ...view, onQuit, onRequestQuit, down, up, doublePress };
}

it.each([
    "mac",
    "windows",
    "linux",
] as const)("protects a single %s quit press and lets the hint expire", (platform) => {
    const view = setup(platform);
    expect(view.down().defaultPrevented).toBe(true);
    expect(screen.getByRole("status").textContent).toContain(
        platform === "mac" ? "⌘Q" : "Ctrl+Q"
    );
    view.up();
    advance(1801);
    expect(view.onQuit).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
});

it.each([
    "mac",
    "windows",
] as const)("confirms two deliberate %s presses and quits once Q is released", (platform) => {
    const view = setup(platform);
    view.doublePress();
    expect(screen.getByRole("status").textContent).toContain("Release");
    expect(view.onQuit).not.toHaveBeenCalled();
    view.up();
    view.up();
    expect(view.onQuit).toHaveBeenCalledOnce();
});

it("does not count a later press or key repeat as a double press", () => {
    const view = setup();
    view.down();
    advance(100);
    view.down({ repeat: true });
    view.up();
    expect(view.onQuit).not.toHaveBeenCalled();
    advance(501);
    view.down();
    view.up();
    expect(view.onQuit).not.toHaveBeenCalled();
});

it("requires observed hold input and waits for Q release before exiting", () => {
    const view = setup();
    view.down();
    advance(600);
    view.down({ repeat: true });
    advance(600);
    view.down({ repeat: true });
    expect(screen.getByRole("status").textContent).toContain("Release");
    expect(view.onQuit).not.toHaveBeenCalled();
    view.up();
    expect(view.onQuit).toHaveBeenCalledOnce();
});

it("does not turn a missing keyup or disabled repeat into an automatic quit", () => {
    const view = setup();
    view.down();
    advance(1300);
    view.up("Meta");
    advance(2000);
    expect(view.onQuit).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
});

it("contains Q repeat if the modifier is released before Q", () => {
    const view = setup();
    view.doublePress();
    view.up("Meta");
    expect(view.down({ repeat: true, metaKey: false }).defaultPrevented).toBe(
        true
    );
    expect(view.onQuit).not.toHaveBeenCalled();
    view.up();
    expect(view.onQuit).toHaveBeenCalledOnce();
});

it.each([
    "escape",
    "other key",
    "blur",
    "hidden",
    "unmount",
] as const)("cancels a confirmed gesture on %s", (reason) => {
    const view = setup();
    view.doublePress();
    if (reason === "escape") {
        view.down({ key: "Escape", metaKey: false });
    } else if (reason === "other key") {
        view.down({ key: "x" });
    } else if (reason === "blur") {
        fireEvent(window, new Event("blur"));
    } else if (reason === "hidden") {
        vi.spyOn(document, "hidden", "get").mockReturnValue(true);
        fireEvent(document, new Event("visibilitychange"));
    } else {
        view.unmount();
    }
    view.up();
    advance(2000);
    expect(view.onQuit).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
});

it.each([
    { metaKey: false, ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { isComposing: true },
    { metaKey: false },
])("leaves non-quit chords and composition alone: %j", (options) => {
    const view = setup();
    expect(view.down(options).defaultPrevented).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    expect(view.onQuit).not.toHaveBeenCalled();
});

it("intercepts the quit chord even inside a text field", () => {
    const view = setup();
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    expect(view.down({}, input).defaultPrevented).toBe(true);
    input.remove();
    expect(view.onQuit).not.toHaveBeenCalled();
});

it("requests an operator-side confirmation from an audience without projecting a hint", () => {
    const view = setup("mac", false);
    view.down();
    view.down({ repeat: true });
    view.up();
    expect(view.onRequestQuit).toHaveBeenCalledOnce();
    expect(view.onQuit).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
});

it("shows command failure and allows another deliberate attempt", async () => {
    const view = setup();
    view.onQuit.mockResolvedValueOnce({
        status: "error",
        error: {
            errorCode: "INTERNAL",
            message: "Quit could not be requested.",
        },
    });
    view.doublePress();
    await act(async () => view.up());
    expect(screen.getByRole("alert").textContent).toContain(
        "Quit could not be requested."
    );
    view.down({ key: "Escape", metaKey: false });
    expect(screen.queryByRole("alert")).toBeNull();
    view.doublePress();
    view.up();
    expect(view.onQuit).toHaveBeenCalledTimes(2);
});

it("does not capture browser shortcuts outside the desktop host", () => {
    render(<DesktopQuitShortcut />);
    const event = new KeyboardEvent("keydown", {
        key: "q",
        metaKey: true,
        cancelable: true,
    });
    fireEvent(window, event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
});
