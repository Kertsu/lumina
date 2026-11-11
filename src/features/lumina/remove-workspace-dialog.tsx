import { AlertDialog } from "@/shared/ui/alert-dialog";
import { useDeskContext } from "./desk-context";

export function RemoveWorkspaceDialog() {
    const { workspaces, dispatch, removeId, setRemoveId } = useDeskContext();
    return (
        <AlertDialog
            isOpen={Boolean(removeId)}
            onOpenChange={(open) => {
                if (!open) {
                    setRemoveId(null);
                }
            }}
            title={`Close ${workspaces.find((item) => item.id === removeId)?.name ?? "this tab"}?`}
            description="Its audience will close and its saved history and appearance will be removed."
            cancelLabel="Keep tab"
            actionLabel="Close tab"
            onAction={() => {
                if (!removeId || workspaces.length === 1) {
                    return;
                }
                dispatch({
                    type: "remove",
                    workspaceId: removeId,
                });
                setRemoveId(null);
            }}
        />
    );
}
