import { useHotkey } from "@tanstack/react-hotkeys";
import { createFileRoute } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Verse } from "@/features/lumina/fixtures";
import type { Appearance } from "@/features/lumina/model";
import { VerseSlide } from "@/features/lumina/verse-slide";

type AudienceState = {
    current: Verse | null;
    appearance: Appearance;
    information: boolean;
    hideCursor: boolean;
    status: "closed" | "blank" | "live";
};

function Audience() {
    const [state, setState] = useState<AudienceState | null>(null);
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("workspace");
        const key = `lumina-output-${id}`;
        const update = () => {
            try {
                const value = localStorage.getItem(key);
                if (value) setState(JSON.parse(value));
            } catch {
                setState(null);
            }
        };
        update();
        const onStorage = (event: StorageEvent) => {
            if (event.key === key) update();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);
    const fullscreen = () => {
        if (!document.fullscreenElement)
            void document.documentElement
                .requestFullscreen()
                .catch(() => undefined);
        else void document.exitFullscreen().catch(() => undefined);
    };
    useHotkey("F", fullscreen);
    return (
        <main
            className={`audience-surface ${state?.hideCursor ? "hide-audience-cursor" : ""}`}
            onDoubleClick={fullscreen}
        >
            {state?.status === "live" && (
                <VerseSlide
                    verse={state.current}
                    appearance={state.appearance}
                    information={state.information}
                />
            )}
            <button
                type="button"
                className="audience-fullscreen"
                onClick={fullscreen}
                aria-label="Toggle audience fullscreen"
            >
                <Maximize2 />
            </button>
            <span className="sr-only">
                {state?.status === "live" ? "Audience live" : "Audience blank"}
            </span>
        </main>
    );
}

export const Route = createFileRoute("/audience")({
    component: Audience,
});
