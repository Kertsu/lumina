import { Slot } from "@radix-ui/react-slot";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { ArrowLeft, ArrowRight, Pencil, X } from "lucide-react";
import type { ReactElement } from "react";
import {
    type ContextMenuPosition,
    isDesktopHost,
    type NativeContextAction,
    popupNativeContextMenu,
} from "@/bridge/client";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/shared/ui/context-menu";

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
    children: ReactElement;
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

    const trigger = (
        <Slot
            onKeyDown={(event) => {
                if (
                    disabled ||
                    (event.key !== "ContextMenu" &&
                        !(event.shiftKey && event.key === "F10"))
                ) {
                    return;
                }
                event.preventDefault();
                const bounds = event.currentTarget.getBoundingClientRect();
                if (isDesktopHost) {
                    openNative({
                        x: bounds.left + 16,
                        y: bounds.bottom,
                    });
                } else {
                    event.currentTarget.dispatchEvent(
                        new MouseEvent("contextmenu", {
                            bubbles: true,
                            cancelable: true,
                            clientX: bounds.left + 16,
                            clientY: bounds.bottom,
                        })
                    );
                }
            }}
            onContextMenu={
                isDesktopHost
                    ? (event) => {
                          event.preventDefault();
                          if (!disabled) {
                              openNative({
                                  x: event.clientX,
                                  y: event.clientY,
                              });
                          }
                      }
                    : undefined
            }
        >
            {children}
        </Slot>
    );
    if (isDesktopHost) {
        return trigger;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={disabled}>
                {trigger}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {items.map((item) =>
                    item === "separator" ? (
                        <ContextMenuSeparator key="separator" />
                    ) : (
                        <ContextMenuItem
                            key={item.id}
                            disabled={!item.enabled}
                            variant={
                                item.id === "lumina.workspace.close"
                                    ? "destructive"
                                    : "default"
                            }
                            onSelect={item.action}
                        >
                            {item.icon}
                            {item.text}
                            {item.accelerator && (
                                <ContextMenuShortcut>
                                    {formatForDisplay("Mod+W")}
                                </ContextMenuShortcut>
                            )}
                        </ContextMenuItem>
                    )
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
