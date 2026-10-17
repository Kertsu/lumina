import {
    type Dispatch,
    type KeyboardEvent,
    type SetStateAction,
    useCallback,
    useEffect,
    useLayoutEffect,
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
    const tabList = useRef<HTMLDivElement>(null);
    const tabNavigation = useRef<HTMLDivElement>(null);
    const previousTabs = useRef<HTMLButtonElement>(null);
    const nextTabs = useRef<HTMLButtonElement>(null);
    const overview = useRef<HTMLDetailsElement>(null);
    const overviewItems = useRef(new Map<string, HTMLButtonElement>());
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [tabScroll, setTabScroll] = useState({
        overflow: false,
        start: true,
        end: true,
    });
    const workspaceOrder = collection?.workspaces
        .map((entry) => entry.id)
        .join();

    useEffect(() => {
        if (!collection?.activeWorkspaceId || !workspaceOrder) return;
        tabs.current
            .get(collection.activeWorkspaceId)
            ?.parentElement?.scrollIntoView({
                block: "nearest",
                inline: "nearest",
            });
    }, [collection?.activeWorkspaceId, workspaceOrder]);

    useLayoutEffect(() => {
        const list = tabList.current;
        const navigation = tabNavigation.current;
        if (!list || !navigation || !workspaceOrder) return;
        function measure() {
            if (!list || !navigation) return;
            const gap =
                Number.parseFloat(getComputedStyle(navigation).gap) || 0;
            const controlsWidth =
                previousTabs.current && nextTabs.current
                    ? previousTabs.current.offsetWidth +
                      nextTabs.current.offsetWidth +
                      2 * gap
                    : 0;
            const next = {
                overflow:
                    list.scrollWidth > list.clientWidth + controlsWidth + 1,
                start: list.scrollLeft <= 1,
                end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
            };
            setTabScroll((current) =>
                current.overflow === next.overflow &&
                current.start === next.start &&
                current.end === next.end
                    ? current
                    : next
            );
        }
        const observer = new ResizeObserver(() => {
            const id = collectionRef.current?.activeWorkspaceId;
            if (id)
                tabs.current.get(id)?.parentElement?.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                });
            measure();
        });
        observer.observe(list);
        observer.observe(navigation);
        list.addEventListener("scroll", measure, {
            passive: true,
        });
        measure();
        return () => {
            observer.disconnect();
            list.removeEventListener("scroll", measure);
        };
    }, [workspaceOrder]);

    useEffect(() => {
        function dismissOverview(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                !overview.current?.contains(event.target)
            ) {
                if (overview.current) overview.current.open = false;
            }
        }
        document.addEventListener("pointerdown", dismissOverview);
        return () =>
            document.removeEventListener("pointerdown", dismissOverview);
    }, []);

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
        if (!collection || event.altKey || event.ctrlKey || event.metaKey)
            return;
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
    function scrollTabs(direction: -1 | 1) {
        const list = tabList.current;
        if (!list) return;
        list.scrollBy({
            left: direction * Math.max(144, list.clientWidth * 0.75),
            behavior: "smooth",
        });
    }
    function navigateOverview(event: KeyboardEvent<HTMLElement>) {
        const menu = overview.current;
        if (!menu) return;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            menu.open = false;
            menu.querySelector("summary")?.focus();
            return;
        }
        if (
            !menu.open ||
            !collection ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
        )
            return;
        const entries = collection.workspaces;
        const index = entries.findIndex(
            (entry) =>
                overviewItems.current.get(entry.id) === document.activeElement
        );
        let target: number;
        switch (event.key) {
            case "ArrowDown":
                target = (index + 1) % entries.length;
                break;
            case "ArrowUp":
                target = index <= 0 ? entries.length - 1 : index - 1;
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
        event.stopPropagation();
        overviewItems.current.get(entries[target].id)?.focus();
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
                            className="workspace-tabs-navigation"
                            ref={tabNavigation}
                        >
                            {tabScroll.overflow && (
                                <button
                                    ref={previousTabs}
                                    type="button"
                                    className="workspace-tab-scroll"
                                    aria-label="Scroll workspaces left"
                                    disabled={tabScroll.start}
                                    onClick={() => scrollTabs(-1)}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                    >
                                        <path d="m15 5-7 7 7 7" />
                                    </svg>
                                </button>
                            )}
                            <div
                                ref={tabList}
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
                                                else
                                                    tabs.current.delete(
                                                        entry.id
                                                    );
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
                                            onClick={() =>
                                                setRemoving(entry.id)
                                            }
                                        >
                                            <span aria-hidden="true">×</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {tabScroll.overflow && (
                                <button
                                    ref={nextTabs}
                                    type="button"
                                    className="workspace-tab-scroll"
                                    aria-label="Scroll workspaces right"
                                    disabled={tabScroll.end}
                                    onClick={() => scrollTabs(1)}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                    >
                                        <path d="m9 5 7 7-7 7" />
                                    </svg>
                                </button>
                            )}
                            <button
                                type="button"
                                className="workspace-tab-add"
                                aria-label="New workspace"
                                title="New workspace"
                                onClick={createWorkspace}
                            >
                                <span aria-hidden="true">+</span>
                            </button>
                        </div>
                        <fieldset className="workspace-tab-tools">
                            <legend className="sr-only">
                                Selected workspace
                            </legend>
                            <details
                                className="workspace-tab-overview"
                                ref={overview}
                                onToggle={(event) => {
                                    const open = event.currentTarget.open;
                                    setOverviewOpen(open);
                                    if (open && collection.activeWorkspaceId)
                                        overviewItems.current
                                            .get(collection.activeWorkspaceId)
                                            ?.focus();
                                }}
                                onKeyDown={navigateOverview}
                                onBlur={(event) => {
                                    if (
                                        event.relatedTarget instanceof Node &&
                                        !event.currentTarget.contains(
                                            event.relatedTarget
                                        )
                                    )
                                        event.currentTarget.open = false;
                                }}
                            >
                                <summary
                                    aria-label="All workspaces"
                                    title="All workspaces"
                                >
                                    <svg
                                        width="19"
                                        height="19"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        aria-hidden="true"
                                    >
                                        <path d="M4 4h16M4 9h9M4 14h6" />
                                        <circle cx="16" cy="15" r="4" />
                                        <path d="m19 18 3 3" />
                                    </svg>
                                </summary>
                                <section
                                    className="workspace-tab-overview-menu"
                                    aria-label="All workspaces"
                                >
                                    <p>Workspaces</p>
                                    <ul>
                                        {collection.workspaces.map((entry) => (
                                            <li key={entry.id}>
                                                <button
                                                    ref={(element) => {
                                                        if (element)
                                                            overviewItems.current.set(
                                                                entry.id,
                                                                element
                                                            );
                                                        else
                                                            overviewItems.current.delete(
                                                                entry.id
                                                            );
                                                    }}
                                                    type="button"
                                                    aria-current={
                                                        entry.id ===
                                                        collection.activeWorkspaceId
                                                            ? "true"
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        if (overview.current)
                                                            overview.current.open = false;
                                                        selectWorkspace(
                                                            entry.id
                                                        );
                                                        tabs.current
                                                            .get(entry.id)
                                                            ?.focus();
                                                    }}
                                                >
                                                    <span className="workspace-tab-name">
                                                        {entry.name}
                                                    </span>
                                                    <small
                                                        className={`tab-status ${(statuses[entry.id] ?? "Closed").toLowerCase()}`}
                                                    >
                                                        {statuses[entry.id] ??
                                                            "Closed"}
                                                    </small>
                                                    {entry.id ===
                                                        collection.activeWorkspaceId && (
                                                        <span aria-hidden="true">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </details>
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
                            shortcutsEnabled={
                                !rename && !removing && !overviewOpen
                            }
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
