import { useEffect, useRef, useState } from "react";
import {
    type ApplicationTheme,
    client,
    deskClient,
    isDesktopHost,
    onApplicationChanged,
} from "@/bridge/client";

export type AppTheme = ApplicationTheme;

// The browser's palette preview is session-only; confirmed desktop settings live in Rust.
let previewTheme: AppTheme = "system";
const previewListeners = new Set<() => void>();

export const initializeAppTheme = `(() => {
    document.documentElement.dataset.theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
})();`;

function applyTheme(theme: AppTheme) {
    document.documentElement.dataset.theme =
        theme === "system"
            ? window.matchMedia("(prefers-color-scheme: light)").matches
                ? "light"
                : "dark"
            : theme;
}

export function useAppTheme() {
    const [theme, setThemeState] = useState<AppTheme>(
        isDesktopHost ? "system" : previewTheme
    );
    const [themeError, setThemeError] = useState("");
    const preference = useRef(theme);
    const refreshPreference = useRef(async () => {});

    useEffect(() => {
        let active = true;
        let generation = 0;
        let unsubscribe: (() => void) | undefined;
        const system = window.matchMedia("(prefers-color-scheme: light)");
        const accept = (next: AppTheme) => {
            preference.current = next;
            applyTheme(next);
            setThemeState(next);
            setThemeError("");
        };
        const refresh = async () => {
            const request = ++generation;
            const result = await client.getApplicationState();
            if (!active || request !== generation) {
                return;
            }
            if (result.status === "ok") {
                accept(result.data.applicationTheme);
            } else {
                setThemeError(result.error.message);
            }
        };
        refreshPreference.current = refresh;
        const syncPreview = () => accept(previewTheme);
        const onSystemChange = () => {
            if (preference.current === "system") {
                applyTheme("system");
            }
        };
        if (isDesktopHost) {
            void onApplicationChanged(() => {
                void refresh();
            })
                .then((dispose) => {
                    if (active) {
                        unsubscribe = dispose;
                        void refresh();
                    } else {
                        dispose();
                    }
                })
                .catch((cause: unknown) => {
                    if (active) {
                        setThemeError(
                            cause instanceof Error
                                ? cause.message
                                : "Could not subscribe to application preferences."
                        );
                    }
                });
        } else {
            syncPreview();
            previewListeners.add(syncPreview);
        }
        system.addEventListener("change", onSystemChange);
        return () => {
            active = false;
            generation += 1;
            unsubscribe?.();
            previewListeners.delete(syncPreview);
            system.removeEventListener("change", onSystemChange);
        };
    }, []);

    const setTheme = (next: AppTheme) => {
        if (!isDesktopHost) {
            previewTheme = next;
            for (const listener of previewListeners) {
                listener();
            }
            return;
        }
        setThemeError("");
        void deskClient.setApplicationTheme(next).then(async (result) => {
            if (result.status === "error") {
                setThemeError(result.error.message);
            } else {
                await refreshPreference.current();
            }
        });
    };

    return {
        theme,
        setTheme,
        themeError,
    };
}
