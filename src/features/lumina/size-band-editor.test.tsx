import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { type Appearance, defaultAppearance, getBand } from "./model";
import { SizeBandEditor } from "./size-band-editor";

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

// biome-ignore lint/style/useComponentExportOnlyModules: Private stateful harness for the controlled editor.
function Editor({
    initial = defaultAppearance().bands,
    currentLength = 173,
}: {
    initial?: Appearance["bands"];
    currentLength?: number | null;
}) {
    const [bands, setBands] = useState(initial);
    return (
        <SizeBandEditor
            bands={bands}
            currentLength={currentLength}
            onChange={setBands}
        />
    );
}

it("covers every verse length with reference sizes, including the omitted range and long verses", () => {
    const appearance = defaultAppearance();
    const samples = [
        [1, 60],
        [50, 60],
        [51, 58],
        [100, 58],
        [101, 57],
        [150, 57],
        [151, 59],
        [200, 59],
        [201, 51],
        [250, 51],
        [251, 53],
        [300, 53],
        [301, 48],
        [400, 48],
        [401, 38],
        [450, 38],
        [451, 34],
        [500, 34],
        [501, 33],
        [550, 33],
        [551, 24],
        [600, 24],
        [601, 24],
        [650, 24],
        [651, 30],
        [999, 30],
        [1000, 30],
    ];
    for (const [length, size] of samples) {
        const matches = appearance.bands.filter(
            (band) => length >= band.min && length <= band.max
        );
        expect(matches).toHaveLength(1);
        expect(matches[0].size).toBe(size);
    }
    expect(
        getBand(
            {
                id: "unicode",
                book: "John",
                bookId: 43,
                chapter: 3,
                verse: 16,
                translation: "web",
                text: "a\u0301".repeat(50),
            },
            appearance
        )?.size
    ).toBe(60);
});

it("shows the current length and keeps edited boundaries contiguous without losing input focus", () => {
    render(<Editor />);
    expect(
        screen.getByText(
            "Current verse: 173 characters · 151–200 character range."
        )
    ).toBeTruthy();
    fireEvent.click(
        screen.getByText("Advanced sizing", { selector: "summary" })
    );
    const boundary = screen.getByRole("spinbutton", {
        name: "Maximum characters for size band 1",
    });
    boundary.focus();
    fireEvent.change(boundary, {
        target: {
            value: "55",
        },
    });
    expect(document.activeElement).toBe(boundary);
    expect(
        screen.getByRole("spinbutton", {
            name: "Font size for 1 to 55 characters",
        })
    ).toBeTruthy();
    expect(
        screen.getByRole("spinbutton", {
            name: "Font size for 56 to 100 characters",
        })
    ).toBeTruthy();
});

it("preserves a saved custom profile until the operator resets bands", () => {
    render(
        <Editor
            initial={[
                {
                    min: 0,
                    max: Number.POSITIVE_INFINITY,
                    size: 42,
                },
            ]}
        />
    );
    fireEvent.click(
        screen.getByText("Advanced sizing", { selector: "summary" })
    );
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(25);
    expect(
        (
            screen.getByRole("spinbutton", {
                name: "Font size for 151 to 200 characters",
            }) as HTMLInputElement
        ).value
    ).toBe("59");
});

it("offers current verse sizing before revealing the complete profile", () => {
    render(<Editor />);
    const advanced = screen
        .getByText("Advanced sizing", { selector: "summary" })
        .closest("details") as HTMLDetailsElement;
    expect(advanced.open).toBe(false);
    expect(screen.getByText("59 px")).toBeTruthy();
    const slider = screen.getByRole("slider", {
        name: "Current verse size",
    });
    expect(
        document.getElementById(slider.getAttribute("aria-describedby") ?? "")
            ?.textContent
    ).toBe("Current verse: 173 characters · 151–200 character range.");
    slider.focus();
    fireEvent.keyDown(slider, {
        key: "ArrowRight",
    });
    expect(screen.getByText("60 px")).toBeTruthy();
    expect(slider.getAttribute("aria-valuenow")).toBe("60");
    fireEvent.click(
        screen.getByText("Advanced sizing", { selector: "summary" })
    );
    expect(advanced.open).toBe(true);
    const currentRange = screen.getByRole("spinbutton", {
        name: "Font size for 151 to 200 characters",
    }) as HTMLInputElement;
    expect(currentRange.value).toBe("60");
    fireEvent.change(currentRange, {
        target: {
            value: "43",
        },
    });
    expect(screen.getByText("43 px")).toBeTruthy();
    expect(slider.getAttribute("aria-valuenow")).toBe("43");
});

it("explains how to configure sizes without a selected verse", () => {
    render(<Editor currentLength={null} />);
    expect(screen.getByText("No verse selected")).toBeTruthy();
    expect(
        screen.getByText(
            "Select a verse to adjust its size. Use Advanced sizing to edit all ranges."
        )
    ).toBeTruthy();
    fireEvent.click(
        screen.getByText("Advanced sizing", { selector: "summary" })
    );
    expect(screen.getAllByRole("spinbutton")).toHaveLength(25);
});
