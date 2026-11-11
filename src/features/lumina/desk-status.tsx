import { useEffect } from "react";
import { useNotifications } from "@/shared/ui/notifications";
import { useDeskContext } from "./desk-context";

/** Surfaces persistent controller failures through the global toaster. */
export function DeskStatus() {
    const toast = useNotifications();
    const { controller } = useDeskContext();

    useEffect(() => {
        if (controller.error) {
            toast.error(controller.error, {
                id: "desk-controller-error",
            });
        }
    }, [controller.error, toast.error]);

    return null;
}
