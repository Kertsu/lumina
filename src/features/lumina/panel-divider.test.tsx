import {
    cleanup,
    createEvent,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { useId, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { PanelDivider } from "./panel-divider";
import {
    CHAPTER_PANEL_MIN_WIDTH,
    SEARCH_PANEL_MIN_WIDTH,
} from "./use-panel-layout";

afterEach(() => {
    cleanup();
    window.getSelection()?.removeAllRanges();
});

const panels = [
    {
        side: "left" as const,
        width: 190,
        minWidth: CHAPTER_PANEL_MIN_WIDTH,
    },
    {
        side: "right" as const,
        width: 325,
        minWidth: SEARCH_PANEL_MIN_WIDTH,
    },
];

function setup(panel = panels[0]) {
    const onResize = vi.fn();
    const onCollapsedChange = vi.fn();
    function Harness() {
        const panelId = useId();
        const [width, setWidth] = useState(panel.width);
        const [collapsed, setCollapsed] = useState(false);
        return (
            <TooltipProvider>
                <p id={panelId} hidden={collapsed}>
                    Selectable panel text
                </p>
                <output aria-label="Panel width">{width}</output>
                <button type="button" onClick={() => setCollapsed(true)}>
                    Hide externally
                </button>
                <PanelDivider
                    side={panel.side}
                    label="test panel"
                    controls={panelId}
                    width={width}
                    minWidth={panel.minWidth}
                    maxWidth={420}
                    collapsed={collapsed}
                    onResize={(next) => {
                        onResize(next);
                        setWidth(next);
                    }}
                    onCollapsedChange={(next) => {
                        onCollapsedChange(next);
                        setCollapsed(next);
                    }}
                    className="test-divider"
                />
            </TooltipProvider>
        );
    }
    const view = render(<Harness />);
    const separator = screen.getByRole("separator");
    const captures = new Set<number>();
    separator.setPointerCapture = vi.fn((id) => {
        captures.add(id);
    });
    separator.hasPointerCapture = vi.fn((id) => captures.has(id));
    separator.releasePointerCapture = vi.fn((id) => {
        captures.delete(id);
    });
    const down = () => {
        const event = createEvent.pointerDown(separator, {
            pointerId: 7,
            isPrimary: true,
            button: 0,
            clientX: 500,
            cancelable: true,
        });
        fireEvent(separator, event);
        return event;
    };
    const moveTo = (width: number, pointerId = 7) =>
        fireEvent.pointerMove(separator, {
            pointerId,
            clientX:
                500 +
                (panel.side === "left"
                    ? width - panel.width
                    : panel.width - width),
        });
    return {
        ...view,
        separator,
        captures,
        down,
        moveTo,
        onResize,
        onCollapsedChange,
    };
}

it("prevents native selection and clears existing highlighted text when resizing starts", () => {
    const view = setup();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(screen.getByText("Selectable panel text"));
    selection?.addRange(range);
    expect(selection?.toString()).toBe("Selectable panel text");
    expect(view.down().defaultPrevented).toBe(true);
    expect(selection?.toString()).toBe("");
    expect(view.captures.has(7)).toBe(true);
});

it.each(
    panels
)("collapses the $side panel only at its closed position and restores its starting width on expansion", (panel) => {
    const view = setup(panel);
    view.down();
    view.moveTo(1);
    expect(view.onCollapsedChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Panel width").textContent).toBe(
        String(panel.minWidth)
    );
    view.moveTo(0);
    expect(view.onCollapsedChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.queryByRole("separator")).toBeNull();
    expect(view.captures.size).toBe(0);
    const expand = screen.getByRole("button", { name: "Expand test panel" });
    expect(document.activeElement).toBe(expand);
    fireEvent.click(expand);
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
        String(panel.width)
    );
    expect(view.onCollapsedChange.mock.calls).toEqual([[true], [false]]);
});

it.each(
    panels
)("keeps $side resizing clamped and supports keyboard resizing without collapsing", (panel) => {
    const view = setup(panel);
    view.down();
    view.moveTo(1000);
    expect(view.onResize).toHaveBeenLastCalledWith(420);
    fireEvent.pointerUp(view.separator, { pointerId: 7 });
    fireEvent.keyDown(view.separator, { key: "Home" });
    expect(view.onResize).toHaveBeenLastCalledWith(panel.minWidth);
    fireEvent.keyDown(view.separator, {
        key: panel.side === "left" ? "ArrowLeft" : "ArrowRight",
    });
    expect(view.onResize).toHaveBeenLastCalledWith(panel.minWidth);
    expect(view.onCollapsedChange).not.toHaveBeenCalled();
});

it.each([
    "pointerUp",
    "pointerCancel",
    "lostPointerCapture",
] as const)("ends resizing and releases capture on %s", (type) => {
    const view = setup();
    view.down();
    fireEvent[type](view.separator, { pointerId: 7 });
    expect(view.captures.size).toBe(0);
    view.moveTo(250);
    expect(view.onResize).not.toHaveBeenCalled();
    expect(document.querySelector(".panel-divider.is-dragging")).toBeNull();
});

it("ignores secondary presses and events from another pointer", () => {
    const view = setup();
    fireEvent.pointerDown(view.separator, {
        pointerId: 8,
        button: 2,
        isPrimary: true,
    });
    fireEvent.pointerDown(view.separator, {
        pointerId: 8,
        button: 0,
        isPrimary: false,
    });
    expect(view.captures.size).toBe(0);
    view.down();
    view.moveTo(260, 8);
    fireEvent.pointerUp(view.separator, { pointerId: 8 });
    expect(view.onResize).not.toHaveBeenCalled();
    expect(view.captures.has(7)).toBe(true);
    view.moveTo(240);
    expect(view.onResize).toHaveBeenLastCalledWith(240);
});

it.each([
    "blur",
    "collapse",
    "unmount",
] as const)("releases capture when %s interrupts the gesture", (reason) => {
    const view = setup();
    view.down();
    if (reason === "blur") {
        fireEvent(window, new Event("blur"));
    } else if (reason === "collapse") {
        fireEvent.click(
            screen.getByRole("button", { name: "Hide externally" })
        );
    } else {
        view.unmount();
    }
    expect(view.captures.size).toBe(0);
    expect(document.querySelector(".panel-divider.is-dragging")).toBeNull();
});
