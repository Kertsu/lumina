import { Menu } from "@tauri-apps/api/menu";
import { afterEach, expect, it, vi } from "vitest";
import { popupNativeContextMenu } from "./context-menu";

vi.mock("@tauri-apps/api/menu", () => ({
    Menu: {
        new: vi.fn(),
    },
}));
afterEach(() => vi.clearAllMocks());

it("keeps native popup resources bounded and carries logical coordinates and availability", async () => {
    const first = {
        popup: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
    };
    const second = {
        popup: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Menu.new)
        .mockResolvedValueOnce(first as unknown as Menu)
        .mockResolvedValueOnce(second as unknown as Menu);
    const action = vi.fn();
    const item = {
        id: "workspace.close",
        text: "Close tab",
        enabled: false,
        accelerator: "CmdOrCtrl+W",
        action,
    };
    await popupNativeContextMenu([item, "separator"], {
        x: 100,
        y: 40,
    });
    expect(first.popup.mock.calls[0][0]).toMatchObject({
        type: "Logical",
        x: 100,
        y: 40,
    });
    const options = vi.mocked(Menu.new).mock.calls[0][0];
    expect(options?.items?.[1]).toEqual({
        item: "Separator",
    });
    const disabledItem = options?.items?.[0] as typeof item;
    disabledItem.action();
    expect(action).not.toHaveBeenCalled();
    await popupNativeContextMenu(
        [
            {
                ...item,
                enabled: true,
            },
        ],
        {
            x: 20,
            y: 30,
        }
    );
    expect(first.close).toHaveBeenCalledOnce();
    const enabledItem = vi.mocked(Menu.new).mock.calls[1][0]
        ?.items?.[0] as typeof item;
    enabledItem.action();
    expect(action).toHaveBeenCalledOnce();
    expect(second.close).not.toHaveBeenCalled();
});
