import { invoke } from "@tauri-apps/api/core";
import type {
    ImportChoice,
    ImportReview,
    Translation,
    Workspace,
    WorkspaceCollection,
    WorkspaceEntry,
} from "./types";
import {
    initialWorkspace,
    initialWorkspaces,
    restoreWorkspace,
    restoreWorkspaces,
} from "./workspace";

const WORKSPACE_KEY = "lumina.workspace.v1";
let writeChain = Promise.resolve();

function desktop(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function requireDesktop(): void {
    if (!desktop())
        throw new Error(
            "Local SQLite imports and managed images require the desktop app."
        );
}

export async function loadLibrary(): Promise<Translation[]> {
    if (desktop()) return invoke<Translation[]>("load_library");
    const response = await fetch("/bibles/web.json");
    if (!response.ok)
        throw new Error(
            "The bundled WEB Bible could not be loaded. Reload or use the desktop app."
        );
    const value = await response.json();
    return Array.isArray(value) ? value : [value];
}

export async function reviewImport(path: string): Promise<ImportReview> {
    requireDesktop();
    return invoke<ImportReview>("review_import", {
        path,
    });
}

export async function acceptImport(
    path: string,
    choices: ImportChoice[]
): Promise<Translation[]> {
    requireDesktop();
    return invoke<Translation[]>("accept_import", {
        path,
        choices,
    });
}

export async function removeTranslation(
    id: string,
    confirmed: boolean
): Promise<Translation[]> {
    requireDesktop();
    return invoke<Translation[]>("remove_translation", {
        id,
        confirmed,
    });
}

export async function pickImport(): Promise<string | null> {
    requireDesktop();
    return invoke<string | null>("pick_import");
}

export async function pickBackground(): Promise<string | null> {
    requireDesktop();
    return invoke<string | null>("pick_background");
}

export async function loadWorkspace(): Promise<Workspace> {
    if (desktop())
        return restoreWorkspace(await invoke<unknown>("load_workspace"));
    if (typeof window === "undefined") return initialWorkspace();
    try {
        return restoreWorkspace(
            JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? "null")
        );
    } catch {
        return initialWorkspace();
    }
}

export function saveWorkspace(workspace: Workspace): Promise<void> {
    // Capture this revision immediately; queued writes cannot observe later mutations.
    const snapshot = JSON.parse(JSON.stringify(workspace)) as Workspace;
    const pending = writeChain
        .catch(() => {})
        .then(async () => {
            if (desktop())
                await invoke("save_workspace", {
                    workspace: snapshot,
                });
            else localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
        });
    writeChain = pending;
    return pending;
}

function browserDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("lumina.workspaces", 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore("entries", {
                keyPath: "id",
            });
            request.result.createObjectStore("metadata");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
            reject(
                new Error(
                    "Close older Lumina browser tabs to restore workspaces."
                )
            );
    });
}

function completed(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () =>
            reject(
                transaction.error ?? new Error("Workspace save was cancelled.")
            );
    });
}

async function readBrowserWorkspaces(): Promise<WorkspaceCollection | null> {
    const database = await browserDatabase();
    try {
        const transaction = database.transaction(
            ["entries", "metadata"],
            "readonly"
        );
        const done = completed(transaction);
        const metadata = transaction.objectStore("metadata").get("collection");
        const entries = transaction.objectStore("entries").getAll();
        await done;
        if (metadata.result === undefined) {
            if (entries.result.length)
                throw new Error(
                    "Workspace metadata is missing; existing data was preserved."
                );
            return null;
        }
        const byId = new Map<string, WorkspaceEntry>(
            entries.result.map((entry: WorkspaceEntry) => [entry.id, entry])
        );
        const value = metadata.result;
        if (!Array.isArray(value.order) || value.order.length !== byId.size)
            throw new Error(
                "Workspace order is invalid; existing data was preserved."
            );
        return restoreWorkspaces({
            version: value.version,
            activeWorkspaceId: value.activeWorkspaceId,
            workspaces: value.order.map((id: string) => byId.get(id)),
        });
    } finally {
        database.close();
    }
}

async function writeBrowserWorkspaces(
    collection: WorkspaceCollection
): Promise<void> {
    const database = await browserDatabase();
    try {
        const transaction = database.transaction(
            ["entries", "metadata"],
            "readwrite"
        );
        const done = completed(transaction);
        const entries = transaction.objectStore("entries");
        entries.clear();
        for (const entry of collection.workspaces) entries.put(entry);
        transaction.objectStore("metadata").put(
            {
                version: 2,
                activeWorkspaceId: collection.activeWorkspaceId,
                order: collection.workspaces.map((entry) => entry.id),
            },
            "collection"
        );
        await done;
    } finally {
        database.close();
    }
}

export function loadWorkspaces(): Promise<WorkspaceCollection> {
    const pending = writeChain
        .catch(() => {})
        .then(async () => {
            if (desktop())
                return restoreWorkspaces(
                    await invoke<unknown>("load_workspaces")
                );
            if (typeof window === "undefined") return initialWorkspaces();
            const stored = await readBrowserWorkspaces();
            if (stored) return stored;
            const legacy = localStorage.getItem(WORKSPACE_KEY);
            // Do not replace corrupt legacy data with empty preparation.
            const collection = initialWorkspaces(
                legacy === null ? undefined : JSON.parse(legacy)
            );
            await writeBrowserWorkspaces(collection);
            // Keep the legacy key as a recovery copy after migration succeeds.
            return collection;
        });
    writeChain = pending.then(
        () => {},
        () => {}
    );
    return pending;
}

export function saveWorkspaces(collection: WorkspaceCollection): Promise<void> {
    // Capture at invocation: delayed saves must never observe a later active tab.
    const snapshot = restoreWorkspaces(JSON.parse(JSON.stringify(collection)));
    const pending = writeChain
        .catch(() => {})
        .then(async () => {
            if (desktop())
                await invoke("save_workspaces", {
                    collection: snapshot,
                });
            else await writeBrowserWorkspaces(snapshot);
        });
    writeChain = pending;
    return pending;
}
