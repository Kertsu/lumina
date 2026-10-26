import { Check, X } from "lucide-react";
import { useDeskContext } from "./desk-context";
export function DeskStatus() {
    const { controller, notification, setNotification } = useDeskContext();
    return (
        <>
            {" "}
            {controller.error && (
                <div className="storage-warning" role="alert">
                    {controller.error}
                </div>
            )}
            {notification && (
                <div className="desk-toast" role="status">
                    <Check />
                    <span>{notification}</span>
                    <button
                        type="button"
                        aria-label="Dismiss message"
                        onClick={() => setNotification("")}
                    >
                        <X />
                    </button>
                </div>
            )}
        </>
    );
}
