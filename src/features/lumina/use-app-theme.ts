import { useEffect, useRef, useState } from "react";

export type AppTheme = "system" | "light" | "dark";

const STORAGE_KEY = "lumina-app-theme";

export const initializeAppTheme = `(() => {
    let theme;
    try { theme = localStorage.getItem("${STORAGE_KEY}"); } catch {}
    if (theme !== "light" && theme !== "dark") {
        theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.dataset.theme = theme;
})();`;

function getSavedTheme(): AppTheme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
        return "system";
    }
}

function applyTheme(theme: AppTheme) {
    document.documentElement.dataset.theme =
        theme === "system"
            ? window.matchMedia("(prefers-color-scheme: light)").matches
                ? "light"
                : "dark"
            : theme;
}

export function useAppTheme() {
    const [theme, setThemeState] = useState<AppTheme>("system");
    const preference = useRef<AppTheme>("system");

    useEffect(() => {
        const system = window.matchMedia("(prefers-color-scheme: light)");
        const syncPreference = () => {
            preference.current = getSavedTheme();
            applyTheme(preference.current);
            setThemeState(preference.current);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY || event.key === null) {
                syncPreference();
            }
        };
        const onSystemChange = () => {
            if (preference.current === "system") {
                applyTheme("system");
            }
        };

        syncPreference();
        window.addEventListener("storage", onStorage);
        system.addEventListener("change", onSystemChange);
        return () => {
            window.removeEventListener("storage", onStorage);
            system.removeEventListener("change", onSystemChange);
        };
    }, []);

    const setTheme = (next: AppTheme) => {
        preference.current = next;
        applyTheme(next);
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Keep the selected theme for this session if storage is unavailable.
        }
    };

    return {
        theme,
        setTheme,
    };
}
