import { type ReactNode, useEffect, useRef, useState } from "react";
import {
    type ApplicationUpdater,
    type AvailableUpdate,
    createApplicationUpdater,
    type UpdateProgress,
} from "@/bridge/client";
import { Button } from "@/shared/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function ApplicationUpdate({
    createUpdater = createApplicationUpdater,
    restoreFocus,
    children,
}: {
    createUpdater?: () => ApplicationUpdater;
    restoreFocus?: () => void;
    children: (controls: {
        update: AvailableUpdate | null;
        openDetails: () => void;
    }) => ReactNode;
}) {
    const [available, setAvailable] = useState<AvailableUpdate | null>(null);
    const [open, setOpen] = useState(false);
    const [progress, setProgress] = useState<UpdateProgress | null>(null);
    const [error, setError] = useState("");
    const updater = useRef<ApplicationUpdater | null>(null);
    const paused = useRef(false);
    const installing = useRef(false);

    useEffect(() => {
        const session = createUpdater();
        let active = true;
        updater.current = session;
        const refresh = async () => {
            if (paused.current || installing.current) {
                return;
            }
            try {
                const candidate = await session.check();
                if (active && !installing.current) {
                    setAvailable(candidate);
                    if (!candidate) {
                        paused.current = false;
                        setOpen(false);
                    }
                }
            } catch (cause) {
                // biome-ignore lint/suspicious/noConsole: Keep background failures diagnostic-only; offline projection must remain uninterrupted.
                console.error("Lumina update check failed", cause);
            }
        };
        const check = () => {
            void refresh();
        };
        check();
        const interval = window.setInterval(check, CHECK_INTERVAL_MS);
        window.addEventListener("online", check);
        return () => {
            active = false;
            updater.current = null;
            window.clearInterval(interval);
            window.removeEventListener("online", check);
            void session.dispose();
        };
    }, [createUpdater]);

    const changeOpen = (next: boolean) => {
        if (installing.current) {
            return;
        }
        paused.current = next;
        setOpen(next);
    };

    const install = async () => {
        const session = updater.current;
        if (installing.current || !session || !available) {
            return;
        }
        installing.current = true;
        setError("");
        const attempt: {
            phase: UpdateProgress["phase"];
        } = {
            phase: "downloading",
        };
        try {
            await session.install(available.version, (next) => {
                attempt.phase = next.phase;
                if (updater.current === session) {
                    setProgress(next);
                }
            });
        } catch (cause) {
            // biome-ignore lint/suspicious/noConsole: Preserve native diagnostics while giving the operator a recoverable error.
            console.error("Lumina update installation failed", cause);
            if (updater.current === session) {
                setProgress(null);
                setError(
                    attempt.phase === "restarting"
                        ? "The update is installed, but Lumina could not restart. Quit and reopen Lumina, or try again."
                        : "The update could not be installed. Try again, or report the problem through GitHub Issues."
                );
            }
        } finally {
            installing.current = false;
        }
    };

    const percent =
        progress?.total && progress.phase === "downloading"
            ? Math.min(
                  100,
                  Math.round((progress.downloaded / progress.total) * 100)
              )
            : undefined;
    const action = progress
        ? progress.phase === "downloading"
            ? `Downloading${percent === undefined ? "…" : ` ${percent}%…`}`
            : progress.phase === "installing"
              ? "Installing…"
              : "Restarting…"
        : "Update and restart";

    return (
        <>
            {children({
                update: available,
                openDetails: () => changeOpen(true),
            })}
            {available && (
                <Dialog open={open} onOpenChange={changeOpen}>
                    <DialogContent
                        showCloseButton={!progress}
                        onCloseAutoFocus={(event) => {
                            if (restoreFocus) {
                                event.preventDefault();
                                restoreFocus();
                            }
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>Update Lumina</DialogTitle>
                            <DialogDescription>
                                Version {available.version} is ready. You’re
                                using {available.currentVersion}.
                            </DialogDescription>
                        </DialogHeader>
                        {available.notes && (
                            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                                {available.notes}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Updating closes Lumina and all audience windows.
                            Your saved data will be kept. Lumina will restart
                            when the update is complete.
                        </p>
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {error}
                            </p>
                        )}
                        {progress && (
                            <p
                                role="status"
                                className="text-sm"
                                aria-live="polite"
                            >
                                {action}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                variant="ghost"
                                disabled={Boolean(progress)}
                                onClick={() => changeOpen(false)}
                            >
                                Later
                            </Button>
                            <Button
                                disabled={Boolean(progress)}
                                onClick={() => void install()}
                            >
                                {action}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
