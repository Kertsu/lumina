import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type AvailableUpdate = {
    currentVersion: string;
    version: string;
    notes: string;
};

export type UpdateProgress = {
    phase: "downloading" | "installing" | "restarting";
    downloaded: number;
    total?: number;
};

export interface ApplicationUpdater {
    check(): Promise<AvailableUpdate | null>;
    install(
        version: string,
        onProgress: (progress: UpdateProgress) => void
    ): Promise<void>;
    dispose(): Promise<void>;
}

/** Own native resources here; UI receives metadata and progress only. */
export function createApplicationUpdater(): ApplicationUpdater {
    let update: Update | null = null;
    let checking: Promise<AvailableUpdate | null> | null = null;
    let disposed = false;
    let installing = false;
    let installed = false;

    async function release(resource: Update | null) {
        if (!resource) {
            return;
        }
        try {
            await resource.close();
        } catch (cause) {
            // biome-ignore lint/suspicious/noConsole: Resource cleanup must not change an installed update's outcome.
            console.error("Lumina updater resource cleanup failed", cause);
        }
    }

    async function refresh(): Promise<AvailableUpdate | null> {
        if (!isTauri() || disposed) {
            return null;
        }
        const next = await check({
            timeout: 10_000,
        });
        if (disposed) {
            await release(next);
            return null;
        }
        const previous = update;
        update = next;
        await release(previous);
        return next
            ? {
                  currentVersion: next.currentVersion,
                  version: next.version,
                  notes: next.body ?? "",
              }
            : null;
    }

    return {
        check() {
            if (installing || installed) {
                return Promise.reject(
                    new Error("An update is already being installed.")
                );
            }
            checking ??= refresh().finally(() => {
                checking = null;
            });
            return checking;
        },
        async install(version, onProgress) {
            if (
                disposed ||
                !update ||
                update.version !== version ||
                checking ||
                installing
            ) {
                throw new Error(
                    "The update is unavailable. Check for updates again."
                );
            }
            installing = true;
            try {
                if (!installed) {
                    let downloaded = 0;
                    let total: number | undefined;
                    onProgress({
                        phase: "downloading",
                        downloaded,
                    });
                    await update.downloadAndInstall((event) => {
                        if (event.event === "Started") {
                            total = event.data.contentLength;
                        } else if (event.event === "Progress") {
                            downloaded += event.data.chunkLength;
                        }
                        onProgress({
                            phase:
                                event.event === "Finished"
                                    ? "installing"
                                    : "downloading",
                            downloaded,
                            total,
                        });
                    });
                    installed = true;
                }
                onProgress({
                    phase: "restarting",
                    downloaded: 0,
                });
                await relaunch();
            } finally {
                installing = false;
                if (disposed) {
                    await release(update);
                    update = null;
                }
            }
        },
        async dispose() {
            disposed = true;
            if (!installing) {
                const previous = update;
                update = null;
                await release(previous);
            }
        },
    };
}
