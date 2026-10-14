import { useEffect, useState } from "react";
import { backgroundStyle, verseStyle } from "../lib/appearance";
import {
    type AudiencePayload,
    isDesktop,
    receiveAudience,
} from "../lib/audience";

export function Audience() {
    const [payload, setPayload] = useState<AudiencePayload | null>(null);
    const [width, setWidth] = useState(1920);
    const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        document.title = "Lumina — Audience";
        let disposed = false;
        let stop: (() => void) | undefined;
        const resized = () => setWidth(window.innerWidth);
        resized();
        window.addEventListener("resize", resized);
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
            window.removeEventListener("resize", resized);
        };
    }, []);

    const selection = payload?.selection;
    const appearance = payload?.appearance;
    const visible = selection && appearance && !payload.blank;
    const scale = width / 1920;

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
                ...(visible
                    ? backgroundStyle(selection.translationId, appearance)
                    : {
                          backgroundColor: "#000000",
                      }),
                cursor: "none",
                overflow: "hidden",
                color: appearance?.color ?? "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: `${80 * scale}px ${128 * scale}px`,
                boxSizing: "border-box",
            }}
        >
            {visible && (
                <>
                    <p
                        style={{
                            margin: 0,
                            ...verseStyle(selection.text, appearance, scale),
                            whiteSpace: "pre-wrap",
                            overflowWrap: "break-word",
                            textAlign: "center",
                            textShadow: "0 2px 12px #0008",
                        }}
                    >
                        {selection.text}
                    </p>
                    <footer
                        style={{
                            marginTop: 48 * scale,
                            fontFamily: '"Inter Variable", Arial, sans-serif',
                            fontWeight: 600,
                            fontStyle: "normal",
                            textDecoration: "none",
                            color: "#ffffff",
                            textAlign: "center",
                            textShadow: "0 2px 12px #0008",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 32 * scale,
                            }}
                        >
                            {selection.bookName} {selection.chapter}:
                            {selection.verse}
                        </div>
                        <div
                            style={{
                                fontSize: 22 * scale,
                                marginTop: 12 * scale,
                            }}
                        >
                            {selection.translationTitle} ·{" "}
                            {selection.abbreviation}
                        </div>
                    </footer>
                </>
            )}
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
