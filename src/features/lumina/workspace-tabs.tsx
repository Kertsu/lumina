import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type Modifier,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    horizontalListSortingStrategy,
    SortableContext,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Circle, CircleAlert, Clock3, EyeOff, Radio, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { audienceStatus, type Workspace } from "./model";
import { WorkspaceTabMenu } from "./workspace-tab-menu";

const horizontalDrag: Modifier = ({ transform }) => ({
    ...transform,
    y: 0,
});

const stateIcons = {
    closed: Circle,
    blank: EyeOff,
    live: Radio,
    pending: Clock3,
    unconfirmed: CircleAlert,
};

function WorkspaceLabel({ workspace }: { workspace: Workspace }) {
    const status = audienceStatus(workspace);
    const StateIcon = stateIcons[status.className];
    return (
        <>
            <span
                className={`workspace-tab-state status-${status.className}`}
                aria-hidden="true"
            >
                <StateIcon />
            </span>
            <span className="workspace-tab-name">{workspace.name}</span>
            <span className="sr-only">, audience {status.label}</span>
        </>
    );
}

type WorkspaceTabsProps = {
    workspaces: Workspace[];
    activeId: string;
    onReorder: (sourceId: string, targetId: string) => void;
    onRename: (workspace: Workspace) => void;
    onMove: (id: string, direction: -1 | 1) => void;
    onClose: (id: string) => void;
    onMenuError: (message: string) => void;
};

type SortableTabProps = Omit<WorkspaceTabsProps, "workspaces" | "onReorder"> & {
    workspace: Workspace;
    index: number;
    count: number;
};

function SortableTab({
    workspace,
    activeId,
    index,
    count,
    onRename,
    onMove,
    onClose,
    onMenuError,
}: SortableTabProps) {
    const canClose = count > 1;
    const status = audienceStatus(workspace);
    const StateIcon = stateIcons[status.className];
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: workspace.id,
        disabled: count < 2,
    });

    return (
        <WorkspaceTabMenu
            disabled={isDragging}
            active={workspace.id === activeId}
            canMoveLeft={index > 0}
            canMoveRight={index < count - 1}
            canClose={canClose}
            onRename={() => onRename(workspace)}
            onMove={(direction) => onMove(workspace.id, direction)}
            onClose={() => onClose(workspace.id)}
            onError={onMenuError}
        >
            <div
                ref={setNodeRef}
                className={`workspace-tab ${workspace.id === activeId ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                }}
            >
                <TabsTrigger
                    className="workspace-tab-trigger"
                    ref={setActivatorNodeRef}
                    value={workspace.id}
                    label={`${workspace.name}, audience ${status.label}`}
                    isLabelHidden
                    icon={
                        <span
                            className={`workspace-tab-state status-${status.className}`}
                            aria-hidden="true"
                        >
                            <StateIcon />
                        </span>
                    }
                    endContent={
                        <span className="workspace-tab-name" aria-hidden="true">
                            {workspace.name}
                        </span>
                    }
                    aria-describedby={attributes["aria-describedby"]}
                    aria-keyshortcuts="Shift+F10"
                    title={`${workspace.name} · ${status.label}\nDrag to reposition. Right-click for tab options.`}
                    {...listeners}
                />
                {canClose && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="workspace-tab-close"
                        aria-label={`Close ${workspace.name}`}
                        title={`Close ${workspace.name}`}
                        tabIndex={workspace.id === activeId ? 0 : -1}
                        disabled={isDragging}
                        onClick={() => onClose(workspace.id)}
                    >
                        <X aria-hidden="true" />
                    </Button>
                )}
            </div>
        </WorkspaceTabMenu>
    );
}

export function WorkspaceTabs({
    workspaces,
    activeId,
    onReorder,
    onRename,
    onMove,
    onClose,
    onMenuError,
}: WorkspaceTabsProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );
    const draggedWorkspace = workspaces.find(
        (workspace) => workspace.id === draggedId
    );
    const finishDrag = ({ active, over }: DragEndEvent) => {
        setDraggedId(null);
        if (over && active.id !== over.id) {
            onReorder(String(active.id), String(over.id));
        }
    };
    const positionLabel = (id: string | number) => {
        const index = workspaces.findIndex((workspace) => workspace.id === id);
        return `${workspaces[index]?.name ?? "Workspace"}, position ${index + 1} of ${workspaces.length}`;
    };

    return (
        <DndContext
            sensors={sensors}
            modifiers={[horizontalDrag]}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setDraggedId(String(active.id))}
            onDragEnd={finishDrag}
            onDragCancel={() => setDraggedId(null)}
            accessibility={{
                screenReaderInstructions: {
                    draggable:
                        "Drag to reposition this workspace. Use the context menu’s Move left or Move right actions to reorder with a keyboard.",
                },
                announcements: {
                    onDragStart: ({ active }) =>
                        `Picked up ${positionLabel(active.id)}.`,
                    onDragOver: ({ active, over }) =>
                        over
                            ? `${positionLabel(active.id)} will move to position ${workspaces.findIndex((workspace) => workspace.id === over.id) + 1}.`
                            : undefined,
                    onDragEnd: ({ active, over }) =>
                        over
                            ? `${workspaces.find((workspace) => workspace.id === active.id)?.name ?? "Workspace"} moved to position ${workspaces.findIndex((workspace) => workspace.id === over.id) + 1}.`
                            : "Repositioning canceled.",
                    onDragCancel: () => "Repositioning canceled.",
                },
            }}
        >
            <SortableContext
                items={workspaces.map((workspace) => workspace.id)}
                strategy={horizontalListSortingStrategy}
            >
                <TabsList
                    className="workspace-tabs"
                    aria-label="Operator workspaces"
                >
                    {workspaces.map((workspace, index) => (
                        <SortableTab
                            key={workspace.id}
                            workspace={workspace}
                            activeId={activeId}
                            index={index}
                            count={workspaces.length}
                            onRename={onRename}
                            onMove={onMove}
                            onClose={onClose}
                            onMenuError={onMenuError}
                        />
                    ))}
                </TabsList>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
                {draggedWorkspace && (
                    <div
                        className="workspace-tab workspace-tab-overlay"
                        aria-hidden="true"
                    >
                        <div className="workspace-tab-label">
                            <WorkspaceLabel workspace={draggedWorkspace} />
                        </div>
                        <span className="workspace-tab-close">
                            <X />
                        </span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
