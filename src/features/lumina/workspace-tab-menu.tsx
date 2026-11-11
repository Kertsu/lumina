import { formatForDisplay } from "@tanstack/react-hotkeys";
import { ArrowLeft, ArrowRight, Pencil, X } from "lucide-react";
import { cloneElement, type HTMLAttributes, type ReactElement } from "react";
import {
    type ContextMenuPosition,
    isDesktopHost,
    type NativeContextAction,
    popupNativeContextMenu,
} from "@/bridge/client";
import { ContextMenu } from "@/shared/ui/context-menu";

export function WorkspaceTabMenu({
    children,
    disabled,
    canMoveLeft,
    canMoveRight,
    canClose,
    active,
    onRename,
    onMove,
    onClose,
    onError,
}: {
    children: ReactElement<HTMLAttributes<HTMLElement>>;
    disabled: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    canClose: boolean;
    active: boolean;
    onRename: () => void;
    onMove: (direction: -1 | 1) => void;
    onClose: () => void;
    onError: (message: string) => void;
}) {
    const items: (
        | (NativeContextAction & { icon: ReactElement })
        | "separator"
    )[] = [
        {
            id: "lumina.workspace.rename",
            text: "Rename workspace",
            enabled: true,
            icon: <Pencil />,
            action: onRename,
        },
        {
            id: "lumina.workspace.move-left",
            text: "Move left",
            enabled: canMoveLeft,
            icon: <ArrowLeft />,
            action: () => onMove(-1),
        },
        {
            id: "lumina.workspace.move-right",
            text: "Move right",
            enabled: canMoveRight,
            icon: <ArrowRight />,
            action: () => onMove(1),
        },
        "separator",
        {
            id: "lumina.workspace.close",
            text: "Close tab",
            enabled: canClose,
            accelerator: active ? "CmdOrCtrl+W" : undefined,
            icon: <X />,
            action: onClose,
        },
    ];
    const openNative = (position: ContextMenuPosition) => {
        void popupNativeContextMenu(
            items.map((item) => {
                if (item === "separator") {
                    return item;
                }
                const { icon: _, ...nativeItem } = item;
                return nativeItem;
            }),
            position
        ).catch(() =>
            onError("The workspace menu could not be opened. Try again.")
        );
    };

    if (isDesktopHost) {
        return cloneElement(children, {
            onKeyDown: (event) => {
                if (
                    disabled ||
                    (event.key !== "ContextMenu" &&
                        !(event.shiftKey && event.key === "F10"))
                ) {
                    return;
                }
                event.preventDefault();
                const bounds = event.currentTarget.getBoundingClientRect();
                openNative({
                    x: bounds.left + 16,
                    y: bounds.bottom,
                });
            },
            onContextMenu: (event) => {
                event.preventDefault();
                if (!disabled) {
                    openNative({
                        x: event.clientX,
                        y: event.clientY,
                    });
                }
            },
        });
    }
    return (
        <ContextMenu
            isDisabled={disabled}
            label="Workspace options"
            onKeyDown={(event) => {
                if (
                    !disabled &&
                    (event.key === "ContextMenu" ||
                        (event.shiftKey && event.key === "F10"))
                ) {
                    event.preventDefault();
                    event.currentTarget.dispatchEvent(
                        new MouseEvent("contextmenu", {
                            bubbles: true,
                            cancelable: true,
                        })
                    );
                }
            }}
            className="workspace-tab-menu"
            items={items.map((item) =>
                item === "separator"
                    ? {
                          type: "divider",
                      }
                    : {
                          id: item.id,
                          label: item.text,
                          icon: item.icon,
                          isDisabled: !item.enabled,
                          variant:
                              item.id === "lumina.workspace.close"
                                  ? "destructive"
                                  : "default",
                          onClick: item.action,
                          endContent: item.accelerator ? (
                              <kbd>{formatForDisplay("Mod+W")}</kbd>
                          ) : undefined,
                      }
            )}
        >
            {children}
        </ContextMenu>
    );
}
