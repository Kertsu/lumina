import { Button } from "@/shared/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { useDeskContext } from "./desk-context";

export function ShortcutsDialog() {
    const { workspace, activeId, dispatch, helpOpen, setHelpOpen, patch } =
        useDeskContext();
    return (
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>Keep your hands on the keys</DialogTitle>
                    <DialogDescription>
                        A few shortcuts for a calmer gathering.
                    </DialogDescription>
                </DialogHeader>
                <div className="shortcut-list">
                    {[
                        ["Choose translation", "F1"],
                        ["Find a verse", "F3"],
                        ["Book information", "F7"],
                        ["Quick reference", "⌘ / Ctrl K"],
                        ["New tab", "⌘ / Ctrl T"],
                        ["Select tab 1–8", "⌘ / Ctrl 1–8"],
                        ["Select last tab", "⌘ / Ctrl 9"],
                        ["Close current tab", "⌘ / Ctrl W"],
                        ["Search workspaces", "⌘ / Ctrl Shift A"],
                        ["Tab options", "Right-click / Shift F10"],
                        ["Send preview live", "⌘ / Ctrl ↵"],
                        ["Previous / next verse", "← / →"],
                        ["Blank / resume audience", "B"],
                    ].map(([label, key]) => (
                        <div key={label}>
                            <span>{label}</span>
                            <kbd>{key}</kbd>
                        </div>
                    ))}
                </div>
                <div className="info-toggle-row">
                    <div>
                        <strong>Hide audience cursor</strong>
                        <p>Saved independently for {workspace.name}.</p>
                    </div>
                    <Switch
                        aria-label="Hide audience cursor"
                        checked={workspace.hideCursor}
                        onCheckedChange={(hideCursor) =>
                            patch({
                                hideCursor,
                            })
                        }
                    />
                </div>
                <div className="info-toggle-row">
                    <div>
                        <strong>Always on top</strong>
                        <p>Keep this audience above ordinary windows.</p>
                    </div>
                    <Switch
                        aria-label="Audience always on top"
                        checked={workspace.alwaysOnTop ?? false}
                        onCheckedChange={(enabled) =>
                            dispatch({
                                type: "alwaysOnTop",
                                workspaceId: activeId,
                                enabled,
                            })
                        }
                    />
                </div>
                <div className="info-toggle-row">
                    <div>
                        <strong>Fullscreen audience</strong>
                        <p>Use the whole audience display.</p>
                    </div>
                    <Switch
                        aria-label="Fullscreen audience"
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
                <p className="subtle">
                    Preferences apply independently to this audience.
                </p>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setHelpOpen(false)}
                    >
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
