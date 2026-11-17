import { Monitor, Send } from "lucide-react";
import { useId } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { useDeskContext } from "./desk-context";
import { searchModeLabels, searchScopeLabel } from "./search-summary-labels";
import { SearchSummarySlide } from "./search-summary-slide";

export function SearchSummaryDialog() {
    const { controller, workspace, dispatch, openAudience } = useDeskContext();
    const audienceHint = useId();
    const capture = workspace.searchSummary;
    const audienceClosed = workspace.status === "closed";
    const dismiss = () =>
        dispatch({
            type: "dismissSearchSummary",
            workspaceId: workspace.id,
        });

    return (
        <Dialog
            open={Boolean(capture && controller.searchSummaryOpen)}
            onOpenChange={(open) => {
                if (!open) {
                    dismiss();
                }
            }}
            title="Search summary"
            description={<>Private preview for {workspace.name}.</>}
            className="search-summary-dialog"
            width={660}
            footer={
                <>
                    <Button variant="ghost" onClick={dismiss}>
                        Back to results
                    </Button>
                    <Button
                        icon={
                            audienceClosed ? (
                                <Monitor aria-hidden="true" />
                            ) : (
                                <Send aria-hidden="true" />
                            )
                        }
                        disabled={!capture || controller.pending}
                        aria-busy={controller.pending}
                        aria-describedby={audienceHint}
                        onClick={() => {
                            if (audienceClosed) {
                                openAudience();
                            } else if (capture) {
                                dispatch({
                                    type: "projectSearchSummary",
                                    workspaceId: workspace.id,
                                    candidateId: capture.candidateId,
                                });
                            }
                        }}
                    >
                        {audienceClosed ? "Open audience" : "Send Live"}
                    </Button>
                </>
            }
        >
            {capture && (
                <>
                    <SearchSummarySlide
                        summary={capture.summary}
                        appearance={capture.appearance}
                    />
                    <dl className="search-summary-details">
                        <div>
                            <dt>Translation</dt>
                            <dd>{capture.summary.translationTitle}</dd>
                        </div>
                        <div>
                            <dt>Scope</dt>
                            <dd>{searchScopeLabel(capture.summary)}</dd>
                        </div>
                        <div>
                            <dt>Match mode</dt>
                            <dd>{searchModeLabels[capture.summary.mode]}</dd>
                        </div>
                        <div>
                            <dt>Result pages</dt>
                            <dd>{capture.summary.pages.toLocaleString()}</dd>
                        </div>
                    </dl>
                </>
            )}
            <p
                id={audienceHint}
                className="search-summary-audience-note"
                role="status"
            >
                {audienceClosed
                    ? "The audience opens blank. Send the summary when you’re ready."
                    : workspace.status === "blank"
                      ? "Sending the summary will unblank the audience."
                      : "Sending the summary temporarily replaces the current output."}
            </p>
            {controller.error && (
                <p className="inline-error" role="alert">
                    {controller.error}
                </p>
            )}
        </Dialog>
    );
}
