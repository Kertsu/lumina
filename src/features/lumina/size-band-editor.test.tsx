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
}: {
    initial?: Appearance["bands"];
}) {
    const [bands, setBands] = useState(initial);
    return (
        <SizeBandEditor bands={bands} currentLength={173} onChange={setBands} />
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
        screen.getByText("Current verse length: 173 characters")
    ).toBeTruthy();
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
