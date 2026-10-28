import { Command, CornerDownLeft, Eye, Monitor, Send } from "lucide-react";
import { useId } from "react";
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
    const {
        controller,
        workspace,
        translations,
        patch,
        isInstalled,
        openAudience,
        canSendPreview,
        sendPreview,
    } = useDeskContext();
    const audienceHintId = useId();
    const audienceClosed = workspace.status === "closed";
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
                        <Eye className="inline size-5 text-muted-foreground mr-2" />
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
                {audienceClosed && (
                    <div className="preview-audience-setup flex flex-wrap items-center justify-between gap-3">
                        <p id={audienceHintId} className="subtle">
                            Audience closed. Open it blank, then send this
                            preview when ready.
                        </p>
                        <Button
                            variant="outline"
                            onClick={openAudience}
                            disabled={controller.pending}
                            aria-busy={controller.pending}
                        >
                            <Monitor />
                            {controller.pending
                                ? "Opening audience…"
                                : "Open audience"}
                        </Button>
                    </div>
                )}
                {controller.error && (
                    <p className="inline-error" role="alert">
                        {controller.error}
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
                        onClick={sendPreview}
                        disabled={!canSendPreview}
                        aria-describedby={
                            audienceClosed ? audienceHintId : undefined
                        }
                    >
                        <Send />
                        Send Live
                        <kbd
                            className="preview-send-shortcut"
                            aria-label="Command + Return"
                        >
                            <Command />
                            <CornerDownLeft />
                        </kbd>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
