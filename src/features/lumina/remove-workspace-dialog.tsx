import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useDeskContext } from "./desk-context";

export function RemoveWorkspaceDialog() {
    const { workspaces, dispatch, removeId, setRemoveId } = useDeskContext();
    return (
        <AlertDialog
            open={Boolean(removeId)}
            onOpenChange={(open) => {
                if (!open) {
                    setRemoveId(null);
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Close{" "}
                        {workspaces.find((item) => item.id === removeId)
                            ?.name ?? "this tab"}
                        ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Its audience will close and its saved history and
                        appearance will be removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep tab</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            if (!removeId || workspaces.length === 1) {
                                return;
                            }
                            dispatch({
                                type: "remove",
                                workspaceId: removeId,
                            });
                            setRemoveId(null);
                        }}
                    >
                        Close tab
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
