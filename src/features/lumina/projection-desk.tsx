import type { ReactNode } from "react";
import { Tabs } from "@/shared/ui/tabs";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { DeskContext, useDeskContext } from "./desk-context";
import { DeskDialogs } from "./desk-dialogs";
import { DeskStatus } from "./desk-status";
import type { DeskController, Workspace } from "./model";
import { QuickReferenceBar } from "./quick-reference-bar";
import { useDeskView } from "./use-desk-view";
import { WorkspaceBar } from "./workspace-bar";
import { WorkspaceBody } from "./workspace-body";

export function DeskRoot({
    controller,
    children,
}: {
    controller: DeskController;
    children: ReactNode;
}) {
    const workspace =
        controller.workspaces.find((item) => item.id === controller.activeId) ??
        controller.workspaces[0];
    if (!workspace) {
        return (
            <div className="startup" role="status">
                <img src="/lumina-mark.svg" alt="" />
                <h1>Lumina</h1>
                <span>{controller.error ?? "Opening your workspace…"}</span>
            </div>
        );
    }
    return (
        <ReadyDeskRoot controller={controller} workspace={workspace}>
            {children}
        </ReadyDeskRoot>
    );
}

function ReadyDeskRoot({
    controller,
    workspace,
    children,
}: {
    controller: DeskController;
    workspace: Workspace;
    children: ReactNode;
}) {
    const model = useDeskView(controller, workspace);
    return (
        <DeskContext.Provider value={model}>
            <TooltipProvider delayDuration={350}>{children}</TooltipProvider>
        </DeskContext.Provider>
    );
}

export function DeskSurface({ children }: { children: ReactNode }) {
    const { activeId, setActiveId } = useDeskContext();
    return (
        <Tabs
            value={activeId}
            onValueChange={setActiveId}
            className="projection-desk gap-0"
        >
            {children}
        </Tabs>
    );
}

/** Explicit assembly; roots expose controlled state and parts own their presentation. */
export function ProjectionDesk({ controller }: { controller: DeskController }) {
    return (
        <DeskRoot controller={controller}>
            <DeskSurface>
                <WorkspaceBar />
                <WorkspaceBody />
                <QuickReferenceBar />
                <DeskStatus />
            </DeskSurface>
            <DeskDialogs />
        </DeskRoot>
    );
}
