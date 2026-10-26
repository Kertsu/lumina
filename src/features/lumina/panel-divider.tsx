import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function PanelDivider({
    side,
    label,
    controls,
    width,
    minWidth,
    maxWidth,
    collapsed,
    onResize,
    onCollapsedChange,
    className,
}: {
    side: "left" | "right";
    label: string;
    controls: string;
    width: number;
    minWidth: number;
    maxWidth: number;
    collapsed: boolean;
    onResize: (width: number) => void;
    onCollapsedChange: (collapsed: boolean) => void;
    className: string;
}) {
    const drag = useRef<{
        startX: number;
        startWidth: number;
        pointerId: number;
        target: HTMLDivElement;
    } | null>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const [dragging, setDragging] = useState(false);
    const resize = (next: number) =>
        onResize(Math.max(minWidth, Math.min(maxWidth, next)));
    const releaseResize = useCallback(() => {
        const active = drag.current;
        drag.current = null;
        if (active?.target.hasPointerCapture(active.pointerId)) {
            active.target.releasePointerCapture(active.pointerId);
        }
    }, []);
    const finishResize = useCallback(() => {
        releaseResize();
        setDragging(false);
    }, [releaseResize]);
    const finishPointerResize = (event: { pointerId: number }) => {
        if (drag.current?.pointerId === event.pointerId) {
            finishResize();
        }
    };

    useEffect(() => {
        if (!dragging) {
            return;
        }
        if (collapsed) {
            finishResize();
            return;
        }
        window.addEventListener("blur", finishResize);
        return () => {
            window.removeEventListener("blur", finishResize);
            releaseResize();
        };
    }, [collapsed, dragging, finishResize, releaseResize]);
    const toggleLabel = `${collapsed ? "Expand" : "Collapse"} ${label}`;
    const pointsLeft = side === "left" ? !collapsed : collapsed;

    return (
        <div
            className={`panel-divider ${className} ${dragging ? "is-dragging" : ""}`}
        >
            {!collapsed && (
                // biome-ignore lint/a11y/useSemanticElements: Interactive adjustable splitter follows the ARIA window splitter pattern.
                <div
                    className="panel-divider-resizer"
                    role="separator"
                    aria-label={`Resize ${label}`}
                    aria-controls={controls}
                    aria-orientation="vertical"
                    aria-valuemin={minWidth}
                    aria-valuemax={maxWidth}
                    aria-valuenow={Math.round(width)}
                    aria-valuetext={`${Math.round(width)} pixels`}
                    tabIndex={0}
                    onPointerDown={(event) => {
                        if (
                            drag.current ||
                            event.button !== 0 ||
                            !event.isPrimary
                        ) {
                            return;
                        }
                        event.preventDefault();
                        window.getSelection()?.removeAllRanges();
                        event.currentTarget.focus({
                            preventScroll: true,
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                        drag.current = {
                            startX: event.clientX,
                            startWidth: width,
                            pointerId: event.pointerId,
                            target: event.currentTarget,
                        };
                        setDragging(true);
                    }}
                    onPointerMove={(event) => {
                        if (drag.current?.pointerId !== event.pointerId) {
                            return;
                        }
                        event.preventDefault();
                        const active = drag.current;
                        const delta = event.clientX - active.startX;
                        const next =
                            active.startWidth +
                            (side === "left" ? delta : -delta);
                        // Zero content width puts the handle at its closed position.
                        if (next <= 0) {
                            finishResize();
                            // Keep the pre-drag width for the next expansion.
                            onResize(active.startWidth);
                            onCollapsedChange(true);
                            toggle.current?.focus({
                                preventScroll: true,
                            });
                            return;
                        }
                        resize(next);
                    }}
                    onPointerUp={finishPointerResize}
                    onPointerCancel={finishPointerResize}
                    onLostPointerCapture={finishPointerResize}
                    onKeyDown={(event) => {
                        const step = side === "left" ? 12 : -12;
                        let next: number;
                        if (event.key === "ArrowLeft") {
                            next = width - step;
                        } else if (event.key === "ArrowRight") {
                            next = width + step;
                        } else if (event.key === "Home") {
                            next = minWidth;
                        } else if (event.key === "End") {
                            next = maxWidth;
                        } else {
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        resize(next);
                    }}
                />
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        ref={toggle}
                        variant="ghost"
                        size="icon-sm"
                        className="panel-divider-toggle"
                        aria-label={toggleLabel}
                        aria-expanded={!collapsed}
                        aria-controls={controls}
                        onClick={() => onCollapsedChange(!collapsed)}
                    >
                        {pointsLeft ? <ChevronLeft /> : <ChevronRight />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side={side === "left" ? "right" : "left"}>
                    {toggleLabel}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
