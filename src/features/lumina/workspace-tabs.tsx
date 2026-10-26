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
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { ArrowLeft, ArrowRight, Monitor, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { Workspace } from "./model";

const horizontalDrag: Modifier = ({ transform }) => ({
    ...transform,
    y: 0,
});

function WorkspaceLabel({ workspace }: { workspace: Workspace }) {
    return (
        <>
            <Monitor />
            <span>{workspace.name}</span>
            <span className={`output-status status-${workspace.status}`}>
                <span />
                {workspace.status === "live"
                    ? "Live"
                    : workspace.status === "blank"
                      ? "Blank"
                      : "Closed"}
            </span>
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
}: SortableTabProps) {
    const tab = useRef<HTMLDivElement>(null);
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

    useEffect(() => {
        if (workspace.id === activeId) {
            tab.current?.scrollIntoView({
                block: "nearest",
                inline: "nearest",
            });
        }
    }, [workspace.id, activeId]);

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={isDragging}>
                <div
                    ref={(node) => {
                        tab.current = node;
                        setNodeRef(node);
                    }}
                    className={`workspace-tab ${workspace.id === activeId ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
                    style={{
                        transform: CSS.Transform.toString(transform),
                        transition,
                    }}
                >
                    <TabsTrigger
                        ref={setActivatorNodeRef}
                        value={workspace.id}
                        aria-describedby={attributes["aria-describedby"]}
                        title="Drag to reposition. Right-click for tab options."
                        aria-keyshortcuts="Shift+F10"
                        onKeyDown={(event) => {
                            if (
                                event.key !== "ContextMenu" &&
                                !(event.shiftKey && event.key === "F10")
                            ) {
                                return;
                            }
                            event.preventDefault();
                            const bounds =
                                event.currentTarget.getBoundingClientRect();
                            event.currentTarget.dispatchEvent(
                                new MouseEvent("contextmenu", {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: bounds.left + 16,
                                    clientY: bounds.bottom,
                                })
                            );
                        }}
                        {...listeners}
                    >
                        <WorkspaceLabel workspace={workspace} />
                    </TabsTrigger>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => onRename(workspace)}>
                    <Pencil />
                    Rename workspace
                </ContextMenuItem>
                <ContextMenuItem
                    disabled={index === 0}
                    onSelect={() => onMove(workspace.id, -1)}
                >
                    <ArrowLeft />
                    Move left
                </ContextMenuItem>
                <ContextMenuItem
                    disabled={index === count - 1}
                    onSelect={() => onMove(workspace.id, 1)}
                >
                    <ArrowRight />
                    Move right
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    variant="destructive"
                    disabled={count === 1}
                    onSelect={() => onClose(workspace.id)}
                >
                    <X />
                    Close tab
                    {workspace.id === activeId && (
                        <ContextMenuShortcut>
                            {formatForDisplay("Mod+W")}
                        </ContextMenuShortcut>
                    )}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function WorkspaceTabs({
    workspaces,
    activeId,
    onReorder,
    onRename,
    onMove,
    onClose,
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
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
