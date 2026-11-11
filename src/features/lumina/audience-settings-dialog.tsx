import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { useDeskContext } from "./desk-context";

export function AudienceSettingsDialog() {
    const {
        workspace,
        activeId,
        dispatch,
        audienceSettingsOpen,
        setAudienceSettingsOpen,
    } = useDeskContext();

    return (
        <Dialog
            open={audienceSettingsOpen}
            onOpenChange={setAudienceSettingsOpen}
            width={460}
            title={<>Audience settings</>}
            description={<>Saved independently for {workspace.name}.</>}
            footer={
                <Button onClick={() => setAudienceSettingsOpen(false)}>
                    Done
                </Button>
            }
        >
            <div className="space-y-3">
                <AudiencePreference
                    label="Hide audience cursor"
                    description="Keep the pointer out of the projection."
                    checked={workspace.hideCursor}
                    onCheckedChange={(enabled) =>
                        dispatch({
                            type: "hideCursor",
                            workspaceId: activeId,
                            enabled,
                        })
                    }
                />
                <AudiencePreference
                    label="Always on top"
                    description="Keep this audience above ordinary windows."
                    checked={workspace.alwaysOnTop ?? false}
                    onCheckedChange={(enabled) =>
                        dispatch({
                            type: "alwaysOnTop",
                            workspaceId: activeId,
                            enabled,
                        })
                    }
                />
                <AudiencePreference
                    label="Fullscreen audience"
                    description="Use the whole audience display."
                    checked={workspace.fullscreen ?? false}
                    onCheckedChange={(enabled) =>
                        dispatch({
                            type: "fullscreen",
                            workspaceId: activeId,
                            enabled,
                        })
                    }
                />
            </div>
        </Dialog>
    );
}

function AudiencePreference({
    label,
    description,
    checked,
    onCheckedChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="info-toggle-row">
            <div>
                <strong>{label}</strong>
                <p>{description}</p>
            </div>
            <Switch
                aria-label={label}
                checked={checked}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}
