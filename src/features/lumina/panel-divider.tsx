import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function PanelDivider({
    side,
    label,
    controls,
    width,
    minWidth,
    maxWidth,
    collapsed,
    onResize,
    onToggle,
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
    onToggle: () => void;
    className: string;
}) {
    const drag = useRef<{ x: number; width: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const resize = (next: number) =>
        onResize(Math.max(minWidth, Math.min(maxWidth, next)));
    const finishResize = () => {
        drag.current = null;
        setDragging(false);
    };
    const toggleLabel = `${collapsed ? "Expand" : "Collapse"} ${label}`;
    const pointsLeft = side === "left" ? !collapsed : collapsed;

    return (
        <div
            className={`panel-divider ${className} ${dragging ? "is-dragging" : ""}`}
        >
            {!collapsed && (
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
                        if (event.button !== 0 || !event.isPrimary) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        drag.current = {
                            x: event.clientX,
                            width,
                        };
                        setDragging(true);
                    }}
                    onPointerMove={(event) => {
                        if (!drag.current) return;
                        const delta = event.clientX - drag.current.x;
                        resize(
                            drag.current.width +
                                (side === "left" ? delta : -delta)
                        );
                    }}
                    onPointerUp={(event) => {
                        finishResize();
                        if (
                            event.currentTarget.hasPointerCapture(
                                event.pointerId
                            )
                        )
                            event.currentTarget.releasePointerCapture(
                                event.pointerId
                            );
                    }}
                    onPointerCancel={finishResize}
                    onLostPointerCapture={finishResize}
                    onKeyDown={(event) => {
                        const step = side === "left" ? 12 : -12;
                        let next: number;
                        if (event.key === "ArrowLeft") next = width - step;
                        else if (event.key === "ArrowRight")
                            next = width + step;
                        else if (event.key === "Home") next = minWidth;
                        else if (event.key === "End") next = maxWidth;
                        else return;
                        event.preventDefault();
                        event.stopPropagation();
                        resize(next);
                    }}
                />
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="panel-divider-toggle"
                        aria-label={toggleLabel}
                        aria-expanded={!collapsed}
                        aria-controls={controls}
                        onClick={onToggle}
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
