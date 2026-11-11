import { formatForDisplay } from "@tanstack/react-hotkeys";
import {
    BookOpen,
    ChevronDown,
    Download,
    Keyboard,
    Settings,
} from "lucide-react";
import { useRef } from "react";
import type { ApplicationUpdater } from "@/bridge/client";
import { ApplicationUpdate } from "@/features/updates";
import { Button } from "@/shared/ui/button";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { showShortcutsHotkey } from "./keyboard-shortcuts";

export function ApplicationMenu({
    onSettings,
    onLibrary,
    onShortcuts,
    createUpdater,
}: {
    onSettings: () => void;
    onLibrary: () => void;
    onShortcuts: () => void;
    createUpdater?: () => ApplicationUpdater;
}) {
    const trigger = useRef<HTMLButtonElement>(null);
    return (
        <ApplicationUpdate
            createUpdater={createUpdater}
            restoreFocus={() => trigger.current?.focus()}
        >
            {({ update, openDetails }) => (
                <DropdownMenu
                    header="Lumina"
                    alignment="start"
                    items={[
                        {
                            label: "App settings",
                            icon: <Settings />,
                            onClick: onSettings,
                        },
                        {
                            label: "Bible library",
                            icon: <BookOpen />,
                            onClick: onLibrary,
                        },
                        {
                            type: "divider",
                        },
                        {
                            label: "Keyboard shortcuts",
                            icon: <Keyboard />,
                            onClick: onShortcuts,
                            endContent: (
                                <kbd>
                                    {formatForDisplay(showShortcutsHotkey)}
                                </kbd>
                            ),
                        },
                        ...(update
                            ? [
                                  {
                                      type: "divider" as const,
                                  },
                                  {
                                      label: "Update available",
                                      description: `Version ${update.version}`,
                                      icon: <Download />,
                                      onClick: openDetails,
                                  },
                              ]
                            : []),
                    ]}
                    renderTrigger={(props) => (
                        <Button
                            {...props}
                            ref={(node) => {
                                trigger.current = node;
                                props.ref(node);
                            }}
                            variant="ghost"
                            className="app-menu-trigger"
                            endContent={<ChevronDown aria-hidden="true" />}
                            aria-label={
                                update
                                    ? "Lumina menu, update available"
                                    : "Lumina menu"
                            }
                        >
                            <span className="app-menu-mark">
                                <img src="/lumina-mark.svg" alt="" />
                                {update && (
                                    <span
                                        className="app-update-dot"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                        </Button>
                    )}
                />
            )}
        </ApplicationUpdate>
    );
}
