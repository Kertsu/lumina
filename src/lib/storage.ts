import { invoke } from "@tauri-apps/api/core";
import type {
    ImportChoice,
    ImportReview,
    Translation,
    Workspace,
} from "./types";
import { initialWorkspace, restoreWorkspace } from "./workspace";

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
