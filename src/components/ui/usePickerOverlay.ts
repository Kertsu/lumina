import { useEffect, useState } from "react";

export function usePickerOverlay(active: boolean) {
    const [isOpen, setOpen] = useState(false);
    useEffect(() => {
        if (!active) setOpen(false);
    }, [active]);
    return {
        isOpen: active && isOpen,
        onOpenChange: setOpen,
    };
}
