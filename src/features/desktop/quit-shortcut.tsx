import { detectPlatform } from "@tanstack/react-hotkeys";
import { useEffect, useState } from "react";
import {
    type ClientResult,
    desktopWindowLabel,
    quitApplication,
    requestQuitConfirmation,
} from "@/bridge/client";

const HOLD_MS = 1200;
const DOUBLE_PRESS_MS = 500;
const HINT_MS = 1800;

export function DesktopQuitShortcut() {
    const label = desktopWindowLabel();
    return label ? (
        <QuitShortcut
            platform={detectPlatform()}
            operator={label === "main"}
            onQuit={quitApplication}
            onRequestQuit={requestQuitConfirmation}
        />
    ) : null;
}

export function QuitShortcut({
    platform,
    operator,
    onQuit,
    onRequestQuit,
}: {
    platform: "mac" | "windows" | "linux";
    operator: boolean;
    onQuit: () => Promise<ClientResult<null>>;
    onRequestQuit: () => Promise<ClientResult<null>>;
}) {
    const [hint, setHint] = useState<"press" | "release" | "quitting" | null>(
        null
    );
    const [error, setError] = useState("");
    const shortcut = platform === "mac" ? "⌘Q" : "Ctrl+Q";

    useEffect(() => {
        let heldSince: number | null = null;
        let lastPress: number | null = null;
        let ready = false;
        let quitting = false;
        let disposed = false;
        let hasError = false;
        let hintTimer: ReturnType<typeof setTimeout> | undefined;
        const clearHintTimer = () => {
            clearTimeout(hintTimer);
            hintTimer = undefined;
        };
        const cancel = () => {
            clearHintTimer();
            heldSince = null;
            lastPress = null;
            ready = false;
            hasError = false;
            setError("");
            if (!quitting) {
                setHint(null);
            }
        };
        const keepHint = () => {
            clearHintTimer();
            hintTimer = setTimeout(cancel, HINT_MS);
        };
        const fail = (message: string) => {
            if (disposed) {
                return;
            }
            quitting = false;
            hasError = true;
            setHint(null);
            setError(message);
        };
        const quit = () => {
            if (quitting) {
                return;
            }
            cancel();
            quitting = true;
            setHint("quitting");
            void onQuit()
                .then((result) => {
                    if (result.status === "error") {
                        fail(result.error.message);
                    }
                })
                .catch((cause: unknown) => {
                    // biome-ignore lint/suspicious/noConsole: Retain the unexpected command rejection at the failure boundary.
                    console.error("Lumina quit request failed", cause);
                    fail(
                        "Could not quit Lumina. Try again or use the Quit menu."
                    );
                });
        };
        const modifierKey = platform === "mac" ? "Meta" : "Control";
        const down = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const modifier =
                platform === "mac"
                    ? event.metaKey && !event.ctrlKey
                    : event.ctrlKey && !event.metaKey;
            const matches =
                modifier &&
                key === "q" &&
                !event.altKey &&
                !event.shiftKey &&
                !event.isComposing;
            if (!matches) {
                // Keep Q repeats contained until the confirmed chord is released.
                if (ready && key === "q" && event.repeat) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    keepHint();
                } else if (event.key !== modifierKey) {
                    if (
                        event.key === "Escape" &&
                        (hintTimer !== undefined || hasError)
                    ) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                    }
                    cancel();
                }
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!operator) {
                // Keep quit UI off the audience display.
                if (!event.repeat) {
                    void onRequestQuit();
                }
                return;
            }
            if (quitting) {
                return;
            }
            setError("");
            hasError = false;
            const now = performance.now();
            if (!event.repeat) {
                ready =
                    lastPress !== null && now - lastPress <= DOUBLE_PRESS_MS;
                lastPress = now;
                heldSince = now;
            } else if (heldSince === null) {
                return;
            } else if (now - heldSince >= HOLD_MS) {
                // A repeat proves the key is still down; a timer alone does not.
                ready = true;
            }
            setHint(ready ? "release" : "press");
            keepHint();
        };
        const up = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "q") {
                heldSince = null;
                if (ready) {
                    quit();
                }
            } else if (event.key === modifierKey && !ready) {
                heldSince = null;
            }
        };
        const visibility = () => {
            if (document.hidden) {
                cancel();
            }
        };
        window.addEventListener("keydown", down, true);
        window.addEventListener("keyup", up, true);
        window.addEventListener("blur", cancel);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            disposed = true;
            clearHintTimer();
            window.removeEventListener("keydown", down, true);
            window.removeEventListener("keyup", up, true);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, [platform, operator, onQuit, onRequestQuit]);

    if (!operator || (!hint && !error)) {
        return null;
    }
    return (
        <div className="quit-shortcut-hint" role={error ? "alert" : "status"}>
            {error ||
                (hint === "quitting"
                    ? "Quitting Lumina…"
                    : hint === "release"
                      ? `Release ${shortcut} to quit`
                      : `Hold ${shortcut} or press twice to quit`)}
        </div>
    );
}
