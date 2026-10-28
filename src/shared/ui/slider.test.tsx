import { cleanup, render, screen } from "@testing-library/react";
import { useId } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Slider } from "./slider";

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

// biome-ignore lint/style/useComponentExportOnlyModules: Private accessibility fixture.
function LabeledSlider({ values }: { values: number[] }) {
    const labelId = useId();
    const helpId = useId();
    return (
        <>
            <span id={labelId}>Allowed range</span>
            <p id={helpId}>Choose the lower and upper limits.</p>
            <Slider
                aria-labelledby={labelId}
                aria-describedby={helpId}
                defaultValue={values}
            />
        </>
    );
}

it("names the interactive thumb from an external label", () => {
    render(<LabeledSlider values={[40]} />);
    expect(
        screen.getByRole("slider", {
            name: "Allowed range",
        })
    ).toBeTruthy();
});

it("keeps range thumbs distinguishable while sharing their description", () => {
    render(<LabeledSlider values={[20, 80]} />);
    const help = screen.getByText("Choose the lower and upper limits.");
    for (const name of ["Minimum", "Maximum"]) {
        const thumb = screen.getByRole("slider", {
            name,
        });
        expect(thumb.getAttribute("aria-describedby")).toBe(help.id);
    }
});
