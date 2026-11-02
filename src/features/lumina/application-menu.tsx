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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            ref={trigger}
                            variant="ghost"
                            className="app-menu-trigger"
                            aria-label={
                                update
                                    ? "Lumina menu, update available"
                                    : "Lumina menu"
                            }
                            title={
                                update
                                    ? "Lumina menu — update available"
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
                            <ChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Lumina</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={onSettings}>
                            <Settings /> App settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onLibrary}>
                            <BookOpen /> Bible library
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={onShortcuts}
                            aria-keyshortcuts="Meta+/ Control+/"
                        >
                            <Keyboard /> Keyboard shortcuts
                            <span className="ml-auto pl-4 text-xs text-muted-foreground">
                                {formatForDisplay(showShortcutsHotkey)}
                            </span>
                        </DropdownMenuItem>
                        {update && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={openDetails}>
                                    <Download className="text-primary" />
                                    <span className="app-update-menu-copy">
                                        <span>Update available</span>
                                        <span className="app-update-menu-version">
                                            Version {update.version}
                                        </span>
                                    </span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </ApplicationUpdate>
    );
}
