import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationId } from "./fixtures";
import type { Workspace } from "./model";
import { createWorkspace, initialWorkspace } from "./model";

const STORAGE_KEY = "lumina-vesper-prototype-v1";

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeId, setActiveId] = useState("");
    const [installed, setInstalled] = useState<TranslationId[]>(["web", "adb"]);
    const [storageError, setStorageError] = useState(false);
    const ready = useRef(false);

    useEffect(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "null"
            );
            if (
                saved?.workspaces?.length &&
                saved.workspaces.every(
                    (workspace: Workspace) =>
                        workspace.id &&
                        workspace.appearance?.bands &&
                        Array.isArray(workspace.history)
                )
            ) {
                const restored = saved.workspaces.map(
                    (workspace: Workspace, index: number) => ({
                        ...createWorkspace(index + 1),
                        ...workspace,
                        current: null,
                        preview: null,
                        status: "closed" as const,
                        information: false,
                        query: "",
                        submittedQuery: "",
                        page: 1,
                    })
                );
                setWorkspaces(restored);
                setActiveId(
                    restored.some(
                        (workspace: Workspace) =>
                            workspace.id === saved.activeId
                    )
                        ? saved.activeId
                        : restored[0].id
                );
                if (Array.isArray(saved.installed))
                    setInstalled(
                        saved.installed.filter(
                            (id: string) => id === "web" || id === "adb"
                        )
                    );
            } else {
                const workspace = initialWorkspace();
                setWorkspaces([workspace]);
                setActiveId(workspace.id);
            }
        } catch {
            const workspace = initialWorkspace();
            setWorkspaces([workspace]);
            setActiveId(workspace.id);
        }
        ready.current = true;
    }, []);

    useEffect(() => {
        if (!ready.current || !workspaces.length) return;
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    activeId,
                    installed,
                    workspaces: workspaces.map((workspace) => ({
                        ...workspace,
                        current: null,
                        preview: null,
                        information: false,
                        status: "closed",
                        query: "",
                        submittedQuery: "",
                        page: 1,
                    })),
                })
            );
            setStorageError(false);
        } catch {
            setStorageError(true);
        }
    }, [workspaces, activeId, installed]);

    const updateWorkspace = useCallback(
        (id: string, update: (workspace: Workspace) => Workspace) => {
            setWorkspaces((previous) =>
                previous.map((workspace) =>
                    workspace.id === id ? update(workspace) : workspace
                )
            );
        },
        []
    );

    return {
        workspaces,
        setWorkspaces,
        activeId,
        setActiveId,
        installed,
        setInstalled,
        storageError,
        updateWorkspace,
    };
}
