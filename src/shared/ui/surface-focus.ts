import { useEffect, useRef } from "react";

/** Run feature focus requests after Astryx's native modal effect. */
export function useSurfaceFocus(
    open: boolean,
    onOpened?: () => void,
    onClosed?: () => void
) {
    const previous = useRef(false);
    const callbacks = useRef({
        onOpened,
        onClosed,
    });
    callbacks.current = {
        onOpened,
        onClosed,
    };
    useEffect(() => {
        if (open !== previous.current) {
            previous.current = open;
            (open
                ? callbacks.current.onOpened
                : callbacks.current.onClosed)?.();
        }
    }, [open]);
}
