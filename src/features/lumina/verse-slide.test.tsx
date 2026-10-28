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

it("renders captured translation and optional metadata provenance without placeholders", () => {
    const { rerender } = render(
        <VerseSlide
            verse={null}
            appearance={defaultAppearance()}
            information
            metadata={{
                name: "Genesis",
                translationTitle: "Original translation",
                attribution: "Editorial team",
                sourceUrl: "https://example.com/metadata",
                rightsNotice: "Used with permission",
            }}
        />
    );
    expect(screen.getByText("Original translation")).toBeTruthy();
    expect(screen.getByText("Editorial team")).toBeTruthy();
    expect(screen.getByText("Used with permission")).toBeTruthy();
    expect(
        screen
            .getByRole("link", {
                name: "https://example.com/metadata",
            })
            .getAttribute("href")
    ).toBe("https://example.com/metadata");
    rerender(
        <VerseSlide
            verse={null}
            appearance={defaultAppearance()}
            information
            metadata={{
                name: "Genesis",
            }}
        />
    );
    expect(screen.queryByText("Original translation")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Author")).toBeNull();
    expect(screen.queryByText("Information unavailable")).toBeNull();
});
