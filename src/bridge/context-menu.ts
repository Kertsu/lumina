import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu } from "@tauri-apps/api/menu";

export type NativeContextAction = {
    id: string;
    text: string;
    enabled: boolean;
    accelerator?: string;
    action: () => void;
};

export type ContextMenuPosition = {
    x: number;
    y: number;
};

// Retain one popup until the next request: GTK's popup returns before dismissal.
// Inline items belong to the menu; stable action IDs bound native event channels.
let previousMenu: Menu | undefined;
let opening = false;

export async function popupNativeContextMenu(
    items: (NativeContextAction | "separator")[],
    position: ContextMenuPosition
): Promise<void> {
    if (opening) {
        return;
    }
    opening = true;
    try {
        await previousMenu?.close();
        previousMenu = undefined;
        const menu = await Menu.new({
            items: items.map((item) =>
                item === "separator"
                    ? {
                          item: "Separator" as const,
                      }
                    : {
                          ...item,
                          action: () => {
                              if (item.enabled) {
                                  item.action();
                              }
                          },
                      }
            ),
        });
        previousMenu = menu;
        // DOM client coordinates are logical pixels relative to this webview.
        await menu.popup(new LogicalPosition(position.x, position.y));
    } catch (cause) {
        // biome-ignore lint/suspicious/noConsole: Preserve native failures at the bridge diagnostic boundary.
        console.error("Native context menu failed.", cause);
        throw cause;
    } finally {
        opening = false;
    }
}
