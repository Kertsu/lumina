import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
    observeOperatorFullscreen,
    usesOverlayTitlebar,
} from "@/bridge/client";
import { useNotifications } from "@/shared/ui/notifications";
import { ApplicationMenu } from "./application-menu";
import { useDeskContext } from "./desk-context";
import { IconButton } from "./icon-button";
import { WorkspaceSearch } from "./workspace-search";
import { WorkspaceTabs } from "./workspace-tabs";
export function WorkspaceBar() {
    const toast = useNotifications();
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
    } = useDeskContext();
    return (
        <div
            className="workspace-bar"
            data-native-titlebar={integratedTitlebar || undefined}
            data-window-fullscreen={fullscreen || undefined}
            data-tauri-drag-region={integratedTitlebar || undefined}
        >
            <ApplicationMenu
                onSettings={() => setSettingsOpen(true)}
                onLibrary={() => setLibraryOpen(true)}
                onShortcuts={() => setHelpOpen(true)}
            />
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
                onMenuError={toast.error}
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
