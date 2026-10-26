import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { defaultAppearance } from "./model";
import { VerseSlide } from "./verse-slide";

afterEach(cleanup);

it("renders captured book information before a verse has been selected", () => {
    render(
        <VerseSlide
            verse={null}
            appearance={defaultAppearance()}
            information
            metadata={{
                name: "Genesis",
                author: "Moses",
            }}
        />
    );
    expect(
        screen.getByRole("heading", {
            name: "Genesis",
        })
    ).toBeTruthy();
    expect(screen.getByText("Moses")).toBeTruthy();
    expect(screen.queryByText("Find a verse to begin")).toBeNull();
});

it("applies a confirmed solid background color", () => {
    const appearance = defaultAppearance();
    appearance.background = "#123456";
    const { container } = render(
        <VerseSlide verse={null} appearance={appearance} />
    );
    expect(
        (container.firstElementChild as HTMLElement).style.backgroundColor
    ).toBe("rgb(18, 52, 86)");
});
