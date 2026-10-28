import { useEffect, useRef, useState } from "react";
import {
    type AudienceOutput,
    deskClient,
    onAudienceOutput,
} from "@/bridge/client";
import { viewVerse } from "./accepted-view";
import { viewAppearance, viewInformation } from "./appearance-view";
import { useAppTheme } from "./use-app-theme";
import { VerseSlide } from "./verse-slide";

/** Only this receiver confirms a committed verse in its authenticated native window. */
export function AudienceReceiver() {
    useAppTheme();
    const [output, setOutput] = useState<AudienceOutput | null>(null);
    const [resources, setResources] = useState<Record<string, string>>({});
    const latest = useRef<AudienceOutput | null>(null);
    const resourceRef = useRef<Record<string, string>>({});

    useEffect(() => {
        let active = true;
        let unsubscribe: (() => void) | undefined;
        let generation = 0;
        const apply = async (incoming: AudienceOutput) => {
            const current = latest.current;
            if (
                current &&
                (incoming.owner.instanceId !== current.owner.instanceId ||
                    incoming.owner.sessionId !== current.owner.sessionId ||
                    incoming.revision <= current.revision)
            ) {
                return;
            }
            latest.current = incoming;
            const request = ++generation;
            // Blank supersedes pending image work without waiting for any resource.
            const translationId =
                incoming.content.kind === "verse"
                    ? incoming.content.verse.translationId
                    : incoming.content.kind === "bookInformation"
                      ? incoming.content.information.translationId
                      : null;
            const background =
                incoming.content.kind === "blank"
                    ? null
                    : (incoming.background ??
                      (incoming.content.kind === "bookInformation"
                          ? incoming.content.information.background
                          : null) ??
                      incoming.appearance.backgrounds.find(
                          (item) => item.translationId === translationId
                      ));
            const assetId = background?.assetId;
            if (assetId && !resourceRef.current[assetId]) {
                // Missing/corrupt assets use the captured color or visual default.
                try {
                    const result = await deskClient.readAssetUri(assetId);
                    if (result.status === "ok") {
                        const image = new Image();
                        image.src = result.data;
                        await image.decode();
                        resourceRef.current = {
                            ...resourceRef.current,
                            [assetId]: result.data,
                        };
                    }
                } catch (cause) {
                    // biome-ignore lint/suspicious/noConsole: missing images use the documented fallback while preserving diagnostics.
                    console.error("Audience background unavailable", cause);
                }
            }
            if (active && request === generation) {
                setResources(resourceRef.current);
                setOutput(incoming);
            }
        };
        const report = (cause: unknown) => {
            // biome-ignore lint/suspicious/noConsole: receiver failures retain diagnostics and never send a false acknowledgment.
            console.error("Audience could not apply output", cause);
        };
        void onAudienceOutput((incoming) => {
            void apply(incoming).catch(report);
        })
            .then(async (dispose) => {
                if (!active) {
                    dispose();
                    return;
                }
                unsubscribe = dispose;
                const initial = await deskClient.audienceState();
                if (initial.status === "ok" && initial.data) {
                    await apply(initial.data);
                }
            })
            .catch(report);
        return () => {
            active = false;
            generation += 1;
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!output || output.content.kind !== "verse" || !output.actionId) {
            return;
        }
        let active = true;
        let first = 0;
        let second = 0;
        void document.fonts.ready.then(() => {
            first = requestAnimationFrame(() => {
                second = requestAnimationFrame(() => {
                    if (
                        !active ||
                        latest.current?.revision !== output.revision ||
                        latest.current?.owner.instanceId !==
                            output.owner.instanceId ||
                        latest.current?.owner.sessionId !==
                            output.owner.sessionId
                    ) {
                        return;
                    }
                    const acknowledgment = {
                        sessionId: output.owner.sessionId,
                        revision: output.revision,
                        actionId: output.actionId ?? "",
                    };
                    void deskClient
                        .acknowledgeAudience(acknowledgment)
                        .then((result) => {
                            if (result.status === "error") {
                                // The native command publishes a typed operator notice. Never retry an uncertain write automatically.
                                // biome-ignore lint/suspicious/noConsole: keep audience diagnostics private to the operator/developer boundary.
                                console.error(
                                    "Audience confirmation could not be recorded",
                                    result.error,
                                    acknowledgment
                                );
                            }
                        });
                });
            });
        });
        return () => {
            active = false;
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, [output]);

    if (!output || output.content.kind === "blank") {
        return (
            <main
                className="audience-surface audience-blank"
                style={{
                    cursor: output?.hideCursor !== false ? "none" : "auto",
                }}
            />
        );
    }
    const verse = output.content.kind === "verse" ? output.content.verse : null;
    const information =
        output.content.kind === "bookInformation"
            ? output.content.information
            : null;
    const translationId =
        verse?.translationId ?? information?.translationId ?? "";
    const appearance = viewAppearance(
        output.appearance,
        translationId,
        resources
    );
    const background = output.background ?? information?.background;
    if (background) {
        appearance.backgrounds[translationId] =
            (background.assetId && resources[background.assetId]) ||
            background.fallbackColor ||
            appearance.background;
        appearance.background = appearance.backgrounds[translationId];
        appearance.fit = background.fit === "fit" ? "contain" : "cover";
    }
    return (
        <main
            className="audience-surface"
            style={{
                cursor: output.hideCursor ? "none" : "auto",
            }}
        >
            <VerseSlide
                verse={verse ? viewVerse(verse) : null}
                appearance={appearance}
                information={Boolean(information)}
                metadata={viewInformation(information)}
            />
        </main>
    );
}
