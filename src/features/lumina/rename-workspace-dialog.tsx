import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
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
            width={420}
            title={<>Name this workspace</>}
            description={
                <>A useful name helps you control the right audience.</>
            }
        >
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
                    data-autofocus
                    id={workspaceNameId}
                    value={rename}
                    onChange={(event) => setRename(event.target.value)}
                    maxLength={48}
                />
                <div className="app-dialog-actions mt-5">
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
                </div>
            </form>
        </Dialog>
    );
}
