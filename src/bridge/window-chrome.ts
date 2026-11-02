import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** Matches the macOS-only overlay configured for the native operator window. */
export function usesOverlayTitlebar(): boolean {
    return (
        isTauri() &&
        getCurrentWindow().label === "main" &&
        navigator.userAgent.includes("Macintosh")
    );
}

/** Observe native fullscreen, which does not use the browser Fullscreen API. */
export function observeOperatorFullscreen(
    listener: (fullscreen: boolean) => void
): () => void {
    if (!usesOverlayTitlebar()) {
        return () => {};
    }
    const window = getCurrentWindow();
    let disposed = false;
    let revision = 0;
    let unlisten: (() => void) | undefined;
    const report = (cause: unknown) => {
        if (!disposed) {
            // biome-ignore lint/suspicious/noConsole: Preserve native chrome diagnostics; retain safe windowed spacing on failure.
            console.error(
                "Lumina could not read native fullscreen state",
                cause
            );
        }
    };
    const refresh = () => {
        const currentRevision = ++revision;
        void window
            .isFullscreen()
            .then((fullscreen) => {
                if (!disposed && currentRevision === revision) {
                    listener(fullscreen);
                }
            })
            .catch(report);
    };
    void window
        .onResized(refresh)
        .then((dispose) => {
            if (disposed) {
                dispose();
            } else {
                unlisten = dispose;
                refresh();
            }
        })
        .catch(report);
    return () => {
        disposed = true;
        unlisten?.();
    };
}
