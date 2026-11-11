import { useToast } from "@astryxdesign/core/Toast";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { createElement, useMemo } from "react";

/** App feedback retains success/warning meaning using Astryx's two toast surfaces. */
export function useNotifications() {
    const show = useToast();
    return useMemo(() => {
        const notify = (
            message: string,
            kind: "success" | "warning" | "error",
            options?: { id?: string }
        ) => {
            const icon = kind === "success" ? CircleCheck : TriangleAlert;
            return show({
                body:
                    kind === "error"
                        ? message
                        : createElement(
                              "span",
                              {
                                  className: `notification-message notification-${kind}`,
                              },
                              createElement(icon, {
                                  "aria-hidden": true,
                                  size: 18,
                              }),
                              message
                          ),
                type: kind === "error" ? "error" : "info",
                uniqueID: options?.id,
                isAutoHide: true,
                autoHideDuration: 4500,
            });
        };
        return {
            error: (message: string, options?: { id?: string }) =>
                notify(message, "error", options),
            success: (message: string) => notify(message, "success"),
            warning: (message: string) => notify(message, "warning"),
        };
    }, [show]);
}
