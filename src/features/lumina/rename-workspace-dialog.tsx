import { Button } from "@/shared/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { useDeskContext } from "./desk-context";

export function RenameWorkspaceDialog() {
    const {
        dispatch,
        renameId,
        setRenameId,
        rename,
        setRename,
        workspaceNameId,
    } = useDeskContext();
    return (
        <Dialog
            open={Boolean(renameId)}
            onOpenChange={(open) => {
                if (!open) {
                    setRenameId(null);
                }
            }}
        >
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Name this workspace</DialogTitle>
                    <DialogDescription>
                        A useful name helps you control the right audience.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!rename.trim() || !renameId) {
                            return;
                        }
                        dispatch({
                            type: "rename",
                            workspaceId: renameId,
                            name: rename.trim(),
                        });
                        setRenameId(null);
                    }}
                >
                    <label className="sr-only" htmlFor={workspaceNameId}>
                        Workspace name
                    </label>
                    <input
                        className="text-input"
                        id={workspaceNameId}
                        value={rename}
                        onChange={(event) => setRename(event.target.value)}
                        maxLength={48}
                    />
                    <DialogFooter className="mt-5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setRenameId(null)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!rename.trim()}>
                            Save name
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
