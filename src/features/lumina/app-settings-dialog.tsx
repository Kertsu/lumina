import { useId } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import type { AppTheme } from "./use-app-theme";

const themes = [
    {
        value: "system",
        label: "System",
    },
    {
        value: "light",
        label: "Light",
    },
    {
        value: "dark",
        label: "Dark",
    },
] as const;

function MiniatureDesk({ theme }: { theme: "light" | "dark" }) {
    const colors = {
        background: "var(--color-background-body)",
        toolbar: "var(--color-background-card)",
        tabbar: "var(--sidebar)",
        border: "var(--color-border)",
        muted: "var(--color-text-secondary)",
        foreground: "var(--color-text-primary)",
        primary: "var(--color-accent)",
    };

    return (
        <g
            style={{
                colorScheme: theme,
            }}
        >
            <rect width="176" height="116" fill={colors.background} />
            <path d="M0 0h176v12H0z" fill={colors.tabbar} />
            <path
                d="M6 12V7a3 3 0 0 1 3-3h44a3 3 0 0 1 3 3v5"
                fill={colors.toolbar}
            />
            <rect
                x="12"
                y="7"
                width="27"
                height="2"
                rx="1"
                fill={colors.muted}
            />
            <path d="M0 12h176v17H0z" fill={colors.toolbar} />
            <circle cx="10" cy="20" r="3" fill={colors.primary} />
            <rect
                x="18"
                y="18"
                width="28"
                height="4"
                rx="1"
                fill={colors.foreground}
            />
            <rect
                x="113"
                y="17"
                width="22"
                height="6"
                rx="2"
                fill={colors.primary}
            />
            <rect
                x="143"
                y="18"
                width="20"
                height="4"
                rx="1"
                fill={colors.muted}
            />
            <path d="M126 29v76M0 29h176M0 105h176" stroke={colors.border} />
            <rect x="8" y="36" width="110" height="56" rx="3" fill="#1d3640" />
            <path d="m8 73 29-22 27 24 22-20 32 28v9H8z" fill="#496464" />
            <path d="m8 82 22-12 27 15 37-17 24 15v9H8z" fill="#2a484b" />
            <rect x="35" y="49" width="57" height="2" rx="1" fill="#e5d4b2" />
            <rect x="29" y="56" width="69" height="2" rx="1" fill="#f1eadb" />
            <rect x="40" y="63" width="46" height="2" rx="1" fill="#f1eadb" />
            <rect
                x="8"
                y="97"
                width="28"
                height="2"
                rx="1"
                fill={colors.foreground}
            />
            <rect
                x="91"
                y="96"
                width="27"
                height="4"
                rx="1"
                fill={colors.muted}
            />
            <rect
                x="133"
                y="36"
                width="35"
                height="8"
                rx="2"
                fill={colors.toolbar}
                stroke={colors.border}
            />
            <rect
                x="133"
                y="51"
                width="24"
                height="2"
                rx="1"
                fill={colors.primary}
            />
            <rect
                x="133"
                y="58"
                width="33"
                height="2"
                rx="1"
                fill={colors.muted}
            />
            <rect
                x="133"
                y="64"
                width="27"
                height="2"
                rx="1"
                fill={colors.muted}
            />
            <path d="M133 72h35" stroke={colors.border} />
            <rect
                x="133"
                y="80"
                width="22"
                height="2"
                rx="1"
                fill={colors.primary}
            />
            <rect
                x="133"
                y="87"
                width="33"
                height="2"
                rx="1"
                fill={colors.muted}
            />
            <rect
                x="133"
                y="93"
                width="24"
                height="2"
                rx="1"
                fill={colors.muted}
            />
            <rect
                x="8"
                y="109"
                width="123"
                height="3"
                rx="1"
                fill={colors.toolbar}
                stroke={colors.border}
            />
            <rect
                x="138"
                y="109"
                width="30"
                height="3"
                rx="1"
                fill={colors.primary}
            />
        </g>
    );
}

function ThemePreview({ theme }: { theme: AppTheme }) {
    const clipId = useId();
    return (
        <svg
            viewBox="0 0 176 116"
            aria-hidden="true"
            className="block w-full rounded-lg border border-border shadow-sm"
        >
            <MiniatureDesk theme={theme === "dark" ? "dark" : "light"} />
            {theme === "system" && (
                <>
                    <defs>
                        <clipPath id={clipId}>
                            <rect x="88" width="88" height="116" />
                        </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                        <MiniatureDesk theme="dark" />
                    </g>
                </>
            )}
        </svg>
    );
}

export function AppSettingsDialog({
    open,
    onOpenChange,
    theme,
    onThemeChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: AppTheme;
    onThemeChange: (theme: AppTheme) => void;
}) {
    const themeName = useId();
    const descriptionId = useId();

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            width={540}
            title={<>App settings</>}
            description={<>Preferences apply to every workspace.</>}
            footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
        >
            <div>
                <fieldset
                    className="theme-options"
                    aria-describedby={descriptionId}
                >
                    <legend>Theme</legend>
                    {themes.map((option) => (
                        <label key={option.value} className="theme-option">
                            <input
                                className="sr-only"
                                type="radio"
                                name={themeName}
                                value={option.value}
                                checked={theme === option.value}
                                onChange={() => onThemeChange(option.value)}
                            />
                            <span>{option.label}</span>
                            <ThemePreview theme={option.value} />
                        </label>
                    ))}
                </fieldset>
                <p
                    id={descriptionId}
                    className="mt-4 text-xs leading-relaxed text-muted-foreground"
                >
                    System follows your device’s appearance automatically.
                </p>
            </div>
        </Dialog>
    );
}
