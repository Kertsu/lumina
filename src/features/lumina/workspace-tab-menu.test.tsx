import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type NativeContextAction,
    popupNativeContextMenu,
} from "@/bridge/client";
import { WorkspaceTabMenu } from "./workspace-tab-menu";

const host = vi.hoisted(() => ({
    desktop: true,
}));
vi.mock("@/bridge/client", () => ({
    get isDesktopHost() {
        return host.desktop;
    },
    popupNativeContextMenu: vi.fn(),
}));
beforeEach(() => {
    host.desktop = true;
    vi.mocked(popupNativeContextMenu).mockResolvedValue(undefined);
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function setup(disabled = false) {
    const actions = {
        onRename: vi.fn(),
        onMove: vi.fn(),
        onClose: vi.fn(),
        onError: vi.fn(),
    };
    render(
        <WorkspaceTabMenu
            disabled={disabled}
            active
            canMoveLeft={false}
            canMoveRight
            canClose
            {...actions}
        >
            <button type="button">Audience 1</button>
        </WorkspaceTabMenu>
    );
    return actions;
}

it("opens a native popup at the pointer with the selected tab's actions and availability", () => {
    const actions = setup();
    fireEvent.contextMenu(screen.getByRole("button"), {
        clientX: 120,
        clientY: 45,
    });
    const [items, position] = vi.mocked(popupNativeContextMenu).mock.calls[0];
    expect(position).toEqual({
        x: 120,
        y: 45,
    });
    expect(
        items.map((item) =>
            item === "separator" ? item : [item.text, item.enabled]
        )
    ).toEqual([
        ["Rename workspace", true],
        ["Move left", false],
        ["Move right", true],
        "separator",
        ["Close tab", true],
    ]);
    (items[0] as NativeContextAction).action();
    (items[2] as NativeContextAction).action();
    (items[4] as NativeContextAction).action();
    expect(actions.onRename).toHaveBeenCalledOnce();
    expect(actions.onMove).toHaveBeenCalledWith(1);
    expect(actions.onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
});

it("anchors Shift+F10 to the focused tab", () => {
    setup();
    const trigger = screen.getByRole("button");
    trigger.getBoundingClientRect = () => new DOMRect(50, 10, 100, 30);
    fireEvent.keyDown(trigger, {
        key: "F10",
        shiftKey: true,
    });
    expect(vi.mocked(popupNativeContextMenu).mock.calls[0][1]).toEqual({
        x: 66,
        y: 40,
    });
});

it("does not open a menu while the tab is being dragged", () => {
    setup(true);
    const trigger = screen.getByRole("button");
    fireEvent.contextMenu(trigger);
    fireEvent.keyDown(trigger, {
        key: "ContextMenu",
    });
    expect(popupNativeContextMenu).not.toHaveBeenCalled();
});

it("reports a native popup failure", async () => {
    vi.mocked(popupNativeContextMenu).mockRejectedValue(
        new Error("Unavailable")
    );
    const actions = setup();
    fireEvent.contextMenu(screen.getByRole("button"));
    await waitFor(() =>
        expect(actions.onError).toHaveBeenCalledWith(
            "The workspace menu could not be opened. Try again."
        )
    );
});

it("retains keyboard and mouse context menus in the browser preview", async () => {
    host.desktop = false;
    const actions = setup();
    fireEvent.keyDown(screen.getByRole("button"), {
        key: "F10",
        shiftKey: true,
    });
    const rename = await screen.findByRole("menuitem", {
        name: "Rename workspace",
    });
    fireEvent.click(rename);
    expect(actions.onRename).toHaveBeenCalledOnce();
    expect(popupNativeContextMenu).not.toHaveBeenCalled();
});
