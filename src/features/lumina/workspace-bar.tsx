import { arrayMove } from "@dnd-kit/sortable";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { BookOpen, ChevronDown, Keyboard, Plus, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import {
    observeOperatorFullscreen,
    usesOverlayTitlebar,
} from "@/bridge/client";
import { Button } from "@/shared/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useDeskContext } from "./desk-context";
import { IconButton } from "./icon-button";
import { showShortcutsHotkey } from "./keyboard-shortcuts";
import { WorkspaceSearch } from "./workspace-search";
import { WorkspaceTabs } from "./workspace-tabs";
export function WorkspaceBar() {
    const integratedTitlebar = usesOverlayTitlebar();
    const [fullscreen, setFullscreen] = useState(false);
    useEffect(() => observeOperatorFullscreen(setFullscreen), []);
    const {
        workspaces,
        activeId,
        dispatch,
        setActiveId,
        setSettingsOpen,
        setLibraryOpen,
        setHelpOpen,
        workspaceSearchOpen,
        setWorkspaceSearchOpen,
        setRemoveId,
        setRenameId,
        setRename,
        addWorkspace,
        moveWorkspace,
        notify,
    } = useDeskContext();
    return (
        <div
            className="workspace-bar"
            data-native-titlebar={integratedTitlebar || undefined}
            data-window-fullscreen={fullscreen || undefined}
            data-tauri-drag-region={integratedTitlebar || undefined}
        >
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="app-menu-trigger"
                        aria-label="Lumina menu"
                    >
                        <img src="/lumina-mark.svg" alt="" />
                        <ChevronDown />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Lumina</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                        <Settings /> App settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLibraryOpen(true)}>
                        <BookOpen /> Bible library
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setHelpOpen(true)}
                        aria-keyshortcuts="Meta+/ Control+/"
                    >
                        <Keyboard /> Keyboard shortcuts
                        <span className="ml-auto pl-4 text-xs text-muted-foreground">
                            {formatForDisplay(showShortcutsHotkey)}
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <WorkspaceTabs
                workspaces={workspaces}
                activeId={activeId}
                onReorder={(sourceId, targetId) => {
                    const source = workspaces.findIndex(
                        (item) => item.id === sourceId
                    );
                    const target = workspaces.findIndex(
                        (item) => item.id === targetId
                    );
                    if (source >= 0 && target >= 0) {
                        dispatch({
                            type: "reorder",
                            workspaceIds: arrayMove(
                                workspaces.map((item) => item.id),
                                source,
                                target
                            ),
                        });
                    }
                }}
                onRename={(item) => {
                    setRenameId(item.id);
                    setRename(item.name);
                }}
                onMove={moveWorkspace}
                onClose={setRemoveId}
                onMenuError={notify}
            />
            <IconButton
                className="workspace-add"
                label="Add workspace"
                onClick={addWorkspace}
            >
                <Plus />
            </IconButton>
            {integratedTitlebar && (
                <div
                    className="workspace-window-drag-region"
                    data-tauri-drag-region
                    aria-hidden="true"
                />
            )}
            <WorkspaceSearch
                workspaces={workspaces}
                activeId={activeId}
                open={workspaceSearchOpen}
                onOpenChange={setWorkspaceSearchOpen}
                onSelect={setActiveId}
            />
        </div>
    );
}
