import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useEffectEvent } from "react";

type NativeTabAction = "close" | "new";

export function useNativeTabShortcuts(
    onClose: () => void,
    onNew: () => void,
    onError: () => void
) {
    const handleAction = useEffectEvent((action: NativeTabAction) => {
        if (action === "close") onClose();
        else if (action === "new") onNew();
    });
    const reportError = useEffectEvent(onError);

    useEffect(() => {
        if (!isTauri()) return;
        let disposed = false;
        let unlisten: UnlistenFn | undefined;
        void listen<NativeTabAction>("lumina:tab-shortcut", ({ payload }) =>
            handleAction(payload)
        )
            .then((cleanup) => {
                if (disposed) cleanup();
                else unlisten = cleanup;
            })
            .catch(() => {
                if (!disposed) reportError();
            });
        return () => {
            disposed = true;
            unlisten?.();
        };
    }, []);
}
