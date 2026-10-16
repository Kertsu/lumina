import {
    type Dispatch,
    type KeyboardEvent,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { closeAudience, isDesktop } from "../lib/audience";
import { loadLibrary, loadWorkspaces, saveWorkspaces } from "../lib/storage";
import type {
    Translation,
    Workspace,
    WorkspaceCollection,
    WorkspaceEntry,
} from "../lib/types";
import { initialWorkspace } from "../lib/workspace";
import { Operator } from "./Operator";

type Status = "Live" | "Blank" | "Closed";

export function OperatorShell() {
    const [collection, setCollection] = useState<WorkspaceCollection | null>(
        null
    );
    const collectionRef = useRef<WorkspaceCollection | null>(null);
    const [library, setLibrary] = useState<Translation[]>([]);
    const [statuses, setStatuses] = useState<Record<string, Status>>({});
    const [message, setMessage] = useState("");
    const [top, setTop] = useState(false);
    const [rename, setRename] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [removalBusy, setRemovalBusy] = useState(false);
    const saveChain = useRef(Promise.resolve());
    const closing = useRef(false);
    const tabs = useRef(new Map<string, HTMLButtonElement>());
    const workspaceOrder = collection?.workspaces
        .map((entry) => entry.id)
        .join();

    useEffect(() => {
        if (!collection?.activeWorkspaceId || !workspaceOrder) return;
        tabs.current.get(collection.activeWorkspaceId)?.scrollIntoView({
            block: "nearest",
            inline: "nearest",
        });
    }, [collection?.activeWorkspaceId, workspaceOrder]);

    const persist = useCallback((next: WorkspaceCollection) => {
        const operation = saveChain.current
            .catch(() => {})
            .then(() => saveWorkspaces(next));
        saveChain.current = operation;
        void operation.catch((error: unknown) =>
            setMessage(`Workspaces could not be saved: ${String(error)}`)
        );
        return operation;
    }, []);
    const updateCollection = useCallback(
        (update: (current: WorkspaceCollection) => WorkspaceCollection) => {
            const current = collectionRef.current;
            if (!current) return;
            const next = update(current);
            collectionRef.current = next;
            setCollection(next);
            void persist(next);
        },
        [persist]
    );
    const updateWorkspace = useCallback(
        (id: string, update: SetStateAction<Workspace>) => {
            updateCollection((current) => ({
                ...current,
                workspaces: current.workspaces.map((entry) =>
                    entry.id === id
                        ? {
                              ...entry,
                              state:
                                  typeof update === "function"
                                      ? update(entry.state)
                                      : update,
                          }
                        : entry
                ),
            }));
        },
        [updateCollection]
    );
    const reportStatus = useCallback((id: string, status: Status) => {
        setStatuses((current) =>
            current[id] === status
                ? current
                : {
                      ...current,
                      [id]: status,
                  }
        );
    }, []);
    useEffect(() => {
        let cancelled = false;
        void Promise.all([loadLibrary(), loadWorkspaces()])
            .then(([loaded, saved]) => {
                if (cancelled) return;
                collectionRef.current = saved;
                setLibrary(loaded);
                setCollection(saved);
            })
            .catch((error: unknown) => setMessage(String(error)));
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        if (!isDesktop()) return;
        let stop: (() => void) | undefined;
        let cancelled = false;
        void import("@tauri-apps/api/window")
            .then(async ({ getCurrentWindow }) => {
                const win = getCurrentWindow();
                const cleanup = await win.onCloseRequested((event) => {
                    event.preventDefault();
                    if (closing.current) return;
                    closing.current = true;
                    void (async () => {
                        try {
                            const current = collectionRef.current;
                            if (current) {
                                await persist(current);
                                await Promise.all(
                                    current.workspaces.map((entry) =>
                                        closeAudience(entry.id)
                                    )
                                );
                            }
                            await win.destroy();
                        } catch (error) {
                            closing.current = false;
                            setMessage(
                                `Could not close operator: ${String(error)}`
                            );
                        }
                    })();
                });
                if (cancelled) cleanup();
                else stop = cleanup;
            })
            .catch((error: unknown) => setMessage(String(error)));
        return () => {
            cancelled = true;
            stop?.();
        };
    }, [persist]);

    function selectWorkspace(id: string) {
        updateCollection((current) => ({
            ...current,
            activeWorkspaceId: id,
        }));
    }
    function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, id: string) {
        if (!collection) return;
        const entries = collection.workspaces;
        const index = entries.findIndex((entry) => entry.id === id);
        let target: number;
        switch (event.key) {
            case "ArrowLeft":
                target = (index - 1 + entries.length) % entries.length;
                break;
            case "ArrowRight":
                target = (index + 1) % entries.length;
                break;
            case "Home":
                target = 0;
                break;
            case "End":
                target = entries.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        selectWorkspace(entries[target].id);
        tabs.current.get(entries[target].id)?.focus();
    }
    function createWorkspace() {
        updateCollection((current) => {
            let number = 1;
            while (
                current.workspaces.some(
                    (entry) => entry.name === `Audience ${number}`
                )
            )
                number += 1;
            const state = initialWorkspace();
            state.selectedTranslationId =
                library.find((item) => item.bundled && item.available)?.id ??
                "";
            const entry: WorkspaceEntry = {
                id: crypto.randomUUID(),
                name: `Audience ${number}`,
                state,
            };
            return {
                ...current,
                activeWorkspaceId: entry.id,
                workspaces: [...current.workspaces, entry],
            };
        });
    }
    function moveWorkspace(id: string, direction: -1 | 1) {
        updateCollection((current) => {
            const workspaces = [...current.workspaces];
            const index = workspaces.findIndex((entry) => entry.id === id);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= workspaces.length)
                return current;
            [workspaces[index], workspaces[target]] = [
                workspaces[target],
                workspaces[index],
            ];
            return {
                ...current,
                workspaces,
            };
        });
    }
    async function removeWorkspace(id: string) {
        const current = collectionRef.current;
        if (!current || current.workspaces.length < 2 || removalBusy) return;
        setRemovalBusy(true);
        try {
            await closeAudience(id);
            updateCollection((latest) => {
                if (latest.workspaces.length < 2) return latest;
                const workspaces = latest.workspaces.filter(
                    (entry) => entry.id !== id
                );
                return {
                    ...latest,
                    workspaces,
                    activeWorkspaceId:
                        latest.activeWorkspaceId === id
                            ? workspaces[0].id
                            : latest.activeWorkspaceId,
                };
            });
            setRemoving(null);
        } catch (error) {
            setMessage(`Could not remove workspace: ${String(error)}`);
        } finally {
            setRemovalBusy(false);
        }
    }
    const active = collection?.workspaces.find(
        (entry) => entry.id === collection.activeWorkspaceId
    );
    const anyAudienceOpen =
        collection?.workspaces.some(
            (entry) =>
                statuses[entry.id] !== undefined &&
                statuses[entry.id] !== "Closed"
        ) ?? false;
    return (
        <div className="operator-app">
            {collection && (
                <>
                    <nav
                        className="workspace-tabs"
                        aria-label="Operator workspaces"
                    >
                        <div
                            className="workspace-tab-list"
                            role="tablist"
                            aria-label="Audiences"
                        >
                            {collection.workspaces.map((entry) => (
                                <div
                                    className={`workspace-tab-item ${entry.id === collection.activeWorkspaceId ? "active" : ""}`}
                                    key={entry.id}
                                    role="presentation"
                                >
                                    <button
                                        ref={(element) => {
                                            if (element)
                                                tabs.current.set(
                                                    entry.id,
                                                    element
                                                );
                                            else tabs.current.delete(entry.id);
                                        }}
                                        type="button"
                                        role="tab"
                                        id={`tab-${entry.id}`}
                                        aria-controls={`workspace-${entry.id}`}
                                        aria-selected={
                                            entry.id ===
                                            collection.activeWorkspaceId
                                        }
                                        tabIndex={
                                            entry.id ===
                                            collection.activeWorkspaceId
                                                ? 0
                                                : -1
                                        }
                                        className="workspace-tab"
                                        title={entry.name}
                                        onClick={() =>
                                            selectWorkspace(entry.id)
                                        }
                                        onKeyDown={(event) =>
                                            navigateTabs(event, entry.id)
                                        }
                                    >
                                        <span className="workspace-tab-name">
                                            {entry.name}
                                        </span>
                                        <small
                                            className={`tab-status ${(statuses[entry.id] ?? "Closed").toLowerCase()}`}
                                        >
                                            {statuses[entry.id] ?? "Closed"}
                                        </small>
                                    </button>
                                    <button
                                        type="button"
                                        className="workspace-tab-close"
                                        aria-label={`Remove workspace ${entry.name}`}
                                        title={`Remove workspace ${entry.name}`}
                                        disabled={
                                            collection.workspaces.length ===
                                                1 || removalBusy
                                        }
                                        onClick={() => setRemoving(entry.id)}
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="workspace-tab-add"
                            aria-label="New workspace"
                            title="New workspace"
                            onClick={createWorkspace}
                        >
                            <span aria-hidden="true">+</span>
                        </button>
                        <fieldset className="workspace-tab-tools">
                            <legend className="sr-only">
                                Selected workspace
                            </legend>
                            <button
                                type="button"
                                className="text-button"
                                disabled={!active}
                                onClick={() =>
                                    active &&
                                    setRename({
                                        id: active.id,
                                        name: active.name,
                                    })
                                }
                            >
                                Rename
                            </button>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Move workspace left"
                                disabled={
                                    !active ||
                                    collection.workspaces[0].id === active.id
                                }
                                onClick={() =>
                                    active && moveWorkspace(active.id, -1)
                                }
                            >
                                ←
                            </button>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Move workspace right"
                                disabled={
                                    !active ||
                                    collection.workspaces.at(-1)?.id ===
                                        active.id
                                }
                                onClick={() =>
                                    active && moveWorkspace(active.id, 1)
                                }
                            >
                                →
                            </button>
                        </fieldset>
                    </nav>
                    {collection.workspaces.map((entry) => (
                        <WorkspaceController
                            key={entry.id}
                            entry={entry}
                            shortcutsEnabled={!rename && !removing}
                            active={entry.id === collection.activeWorkspaceId}
                            library={library}
                            setLibrary={setLibrary}
                            updateWorkspace={updateWorkspace}
                            anyAudienceOpen={anyAudienceOpen}
                            reportStatus={reportStatus}
                            top={top}
                            setTop={setTop}
                        />
                    ))}
                </>
            )}
            {message && (
                <div className="shell-message" role="alert">
                    {message}
                    <button
                        type="button"
                        className="text-button"
                        onClick={() => setMessage("")}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {!collection && !message && (
                <div className="loading-overlay">
                    <span>Opening your workspaces…</span>
                </div>
            )}
            {rename && (
                <div className="modal-backdrop">
                    <form
                        className="modal workspace-dialog"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const name = rename.name.trim();
                            if (!name) return;
                            updateCollection((current) => ({
                                ...current,
                                workspaces: current.workspaces.map((entry) =>
                                    entry.id === rename.id
                                        ? {
                                              ...entry,
                                              name,
                                          }
                                        : entry
                                ),
                            }));
                            setRename(null);
                        }}
                    >
                        <h2>Rename workspace</h2>
                        <label>
                            Workspace name
                            <input
                                value={rename.name}
                                required
                                onChange={(event) =>
                                    setRename({
                                        ...rename,
                                        name: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="button"
                                onClick={() => setRename(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="button primary"
                                disabled={!rename.name.trim()}
                            >
                                Save name
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {removing && (
                <div className="modal-backdrop">
                    <section
                        className="modal workspace-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="Remove workspace"
                    >
                        <h2>Remove workspace?</h2>
                        <p>
                            Close{" "}
                            {
                                collection?.workspaces.find(
                                    (entry) => entry.id === removing
                                )?.name
                            }
                            ’s audience and delete only this workspace’s saved
                            queue, history, and appearance?
                        </p>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="button"
                                disabled={removalBusy}
                                onClick={() => setRemoving(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="button primary"
                                disabled={removalBusy}
                                onClick={() => void removeWorkspace(removing)}
                            >
                                {removalBusy
                                    ? "Closing audience…"
                                    : "Remove workspace"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function WorkspaceController({
    entry,
    updateWorkspace,
    ...props
}: {
    entry: WorkspaceEntry;
    updateWorkspace: (id: string, update: SetStateAction<Workspace>) => void;
    active: boolean;
    shortcutsEnabled: boolean;
    library: Translation[];
    setLibrary: Dispatch<SetStateAction<Translation[]>>;
    anyAudienceOpen: boolean;
    reportStatus: (id: string, status: Status) => void;
    top: boolean;
    setTop: Dispatch<SetStateAction<boolean>>;
}) {
    const setWorkspace = useCallback(
        (update: SetStateAction<Workspace>) =>
            updateWorkspace(entry.id, update),
        [entry.id, updateWorkspace]
    );
    return (
        <div
            id={`workspace-${entry.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${entry.id}`}
            hidden={!props.active}
            className="workspace-controller"
        >
            <Operator
                {...props}
                workspaceId={entry.id}
                name={entry.name}
                workspace={entry.state}
                setWorkspace={setWorkspace}
            />
        </div>
    );
}
