import { Eye, Send } from "lucide-react";
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
import { referenceLabel } from "./fixtures";
import { VerseSlide } from "./verse-slide";

export function PreviewDialog() {
    const { workspace, translations, patch, isInstalled, sendLive } =
        useDeskContext();
    return (
        <Dialog
            open={Boolean(workspace.preview)}
            onOpenChange={(open) => {
                if (!open) {
                    patch({
                        preview: null,
                    });
                }
            }}
        >
            <DialogContent className="preview-dialog sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle>
                        <Eye className="inline size-5 text-primary mr-2" />
                        Verse preview
                    </DialogTitle>
                    <DialogDescription>
                        Private to you. {workspace.name} keeps its current
                        output.
                    </DialogDescription>
                </DialogHeader>
                {workspace.preview && (
                    <>
                        <VerseSlide
                            verse={workspace.preview}
                            appearance={workspace.appearance}
                        />
                        <div className="preview-reference">
                            <span>{referenceLabel(workspace.preview)}</span>
                            <span>
                                {
                                    translations.find(
                                        (item) =>
                                            item.id ===
                                            workspace.preview?.translation
                                    )?.name
                                }
                                {!isInstalled(workspace.preview) &&
                                    " · Saved copy"}
                            </span>
                        </div>
                    </>
                )}
                {workspace.status === "closed" && (
                    <p className="inline-error">
                        Audience closed. Dismiss this preview, open the
                        audience, then inspect and send when ready.
                    </p>
                )}
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            patch({
                                preview: null,
                            })
                        }
                    >
                        Dismiss
                    </Button>
                    <Button
                        onClick={() => {
                            if (workspace.preview) {
                                sendLive(workspace.preview);
                            }
                        }}
                    >
                        <Send />
                        Send Live<kbd>⌘ ↵</kbd>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
