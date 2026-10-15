import { useEffect, useState } from "react";
import { defaultAppearance } from "../lib/appearance";
import {
    type AudiencePayload,
    isDesktop,
    receiveAudience,
} from "../lib/audience";
import { VerseSlide } from "./VerseSlide";

export function Audience() {
    const [payload, setPayload] = useState<AudiencePayload | null>(null);
    const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const workspaceId = new URL(window.location.href).searchParams.get(
            "workspaceId"
        );
        document.title = `Lumina — Audience ${workspaceId ?? "unknown"}`;
        let disposed = false;
        let stop: (() => void) | undefined;
        void receiveAudience(setPayload, (value) => {
            if (value) setFullscreenPrompt(true);
            else {
                setFullscreenPrompt(false);
                if (document.fullscreenElement) {
                    void document
                        .exitFullscreen()
                        .catch((reason: unknown) => setError(String(reason)));
                }
            }
        })
            .then((cleanup) => {
                if (disposed) cleanup();
                else stop = cleanup;
            })
            .catch((reason: unknown) => setError(String(reason)));
        return () => {
            disposed = true;
            stop?.();
        };
    }, []);

    const selection = payload?.selection;
    const appearance = payload?.appearance;

    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setFullscreenPrompt(false);
            setError("");
        } catch (reason) {
            setError(String(reason));
        }
    };

    return (
        <main
            aria-label="Audience output"
            style={{
                position: "fixed",
                inset: 0,
                cursor: "none",
                overflow: "hidden",
                background: "#000000",
            }}
        >
            <VerseSlide
                selection={selection ?? null}
                appearance={appearance ?? defaultAppearance()}
                blank={!payload || payload.blank}
                audience
            />
            {!isDesktop() && fullscreenPrompt && (
                <button
                    type="button"
                    onClick={() => void enterFullscreen()}
                    style={{
                        position: "fixed",
                        top: 16,
                        right: 16,
                        cursor: "pointer",
                    }}
                >
                    Enter fullscreen (browser preview)
                </button>
            )}
            {error && (
                <p
                    role="alert"
                    style={{
                        position: "fixed",
                        bottom: 16,
                        left: 16,
                        color: "white",
                        fontSize: 14,
                    }}
                >
                    {error}
                </p>
            )}
        </main>
    );
}
