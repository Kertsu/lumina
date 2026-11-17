import type { ContextMenuPosition } from "@/bridge/client";

export const showShortcutsHotkey = "Mod+/";
export const workspaceTabOptionsHotkey = "Shift+F10";

export function keyboardMenuPosition(tab: HTMLElement): ContextMenuPosition {
    const bounds = tab.getBoundingClientRect();
    return {
        x: bounds.left + 16,
        y: bounds.bottom,
    };
}

export function openActiveWorkspaceTabMenu() {
    const tab = document.querySelector<HTMLButtonElement>(
        '.workspace-tabs [role="tab"][aria-selected="true"]'
    );
    if (!tab) {
        return false;
    }
    tab.focus();
    const { x, y } = keyboardMenuPosition(tab);
    tab.dispatchEvent(
        new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        })
    );
    return true;
}
