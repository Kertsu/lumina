import { useEffect } from "react";
import { toast } from "sonner";
import { useDeskContext } from "./desk-context";

/** Surfaces persistent controller failures through the global toaster. */
export function DeskStatus() {
    const { controller } = useDeskContext();

    useEffect(() => {
        if (controller.error) {
            toast.error(controller.error, {
                id: "desk-controller-error",
            });
        }
    }, [controller.error]);

    return null;
}
