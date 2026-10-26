import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChapterPanel } from "./chapter-panel";
import {
    type DeskController,
    defaultAppearance,
    type Workspace,
} from "./model";
import { DeskRoot } from "./projection-desk";

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
    vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }))
    );
    Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function chapterController(): DeskController {
    const verses = [16, 17, 18].map((verse) => ({
        id: `john-3-${verse}`,
        book: "John",
        bookId: 43,
        chapter: 3,
        verse,
        text: `Verse ${verse}`,
        translation: "web",
    }));
    const workspace: Workspace = {
        id: "workspace-a",
        name: "Audience 1",
        translation: "web",
        current: verses[0],
        preview: null,
        status: "closed",
        information: false,
        hideCursor: true,
        appearance: defaultAppearance(),
        history: [],
        query: "",
        submittedQuery: "",
        mode: "all",
        scope: "Entire Bible",
        page: 1,
        order: "best",
        historyProjectedOnly: false,
        searchResults: [],
        searchTotal: 0,
        searchPages: 1,
        chapterVerses: verses,
        books: [],
        metadata: null,
    };
    return {
        activeId: workspace.id,
        workspaces: [workspace],
        translations: [
            {
                id: "web",
                name: "World English Bible",
                shortName: "WEB",
                bundled: true,
            },
        ],
        dispatch: vi.fn(),
    };
}

function measureStrip(layout: "horizontal" | "sidebar", outside: boolean) {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
        function (this: Element) {
            if (this.matches(".chapter-filmstrip, .chapter-sidebar-viewport")) {
                return new DOMRect(
                    0,
                    0,
                    layout === "horizontal" ? 500 : 190,
                    layout === "horizontal" ? 120 : 500
                );
            }
            if (this.matches(".verse-thumbnail")) {
                const next =
                    this.getAttribute("aria-label") === "Display John 3:17";
                const position = next ? (outside ? 550 : 180) : 20;
                return new DOMRect(
                    layout === "horizontal" ? position : 0,
                    layout === "sidebar" ? position : 0,
                    layout === "horizontal" ? 160 : 180,
                    110
                );
            }
            return new DOMRect();
        }
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
        function (this: HTMLElement) {
            return this.getBoundingClientRect().width;
        }
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
        function (this: HTMLElement) {
            return this.getBoundingClientRect().height;
        }
    );
}

function setupStrip(layout: "horizontal" | "sidebar", outside: boolean) {
    measureStrip(layout, outside);
    const model = chapterController();
    const view = (controller: DeskController) => (
        <DeskRoot controller={controller}>
            <ChapterPanel />
        </DeskRoot>
    );
    const rendered = render(view(model));
    if (layout === "sidebar") {
        fireEvent.click(
            screen.getByRole("button", {
                name: "Sidebar verse strip",
            })
        );
    }
    const strip = document.querySelector<HTMLElement>(
        layout === "horizontal"
            ? ".chapter-filmstrip"
            : ".chapter-sidebar-viewport"
    );
    if (!strip) {
        throw new Error("Missing strip viewport");
    }
    strip.scrollLeft = layout === "horizontal" ? 100 : 0;
    strip.scrollTop = layout === "sidebar" ? 100 : 0;
    const firstThumbnail = screen.getByRole("button", {
        name: "Display John 3:16",
    });
    const scroll = vi.fn();
    strip.scrollTo = scroll;
    const workspace = model.workspaces[0];
    rendered.rerender(
        view({
            ...model,
            workspaces: [
                {
                    ...workspace,
                    current: workspace.chapterVerses[1],
                },
            ],
        })
    );
    expect(
        screen.getByRole("button", {
            name: "Display John 3:16",
        })
    ).toBe(firstThumbnail);
    return scroll;
}

it.each([
    "horizontal",
    "sidebar",
] as const)("keeps the %s strip still when the next verse is already visible", (layout) => {
    const scroll = setupStrip(layout, false);
    expect(scroll).not.toHaveBeenCalled();
});

it.each([
    "horizontal",
    "sidebar",
] as const)("smoothly reveals offscreen verses in the %s strip", (layout) => {
    const scroll = setupStrip(layout, true);
    expect(scroll).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
            behavior: "smooth",
        })
    );
    const [options] = scroll.mock.calls[0];
    if (layout === "horizontal") {
        expect(options.left).toBeGreaterThan(100);
        expect(options.top).toBe(0);
    } else {
        expect(options.left).toBe(0);
        expect(options.top).toBeGreaterThan(100);
    }
});

it.each([
    "horizontal",
    "sidebar",
] as const)("respects reduced motion in the %s strip", (layout) => {
    vi.stubGlobal(
        "matchMedia",
        vi.fn((query: string) => ({
            matches: query === "(prefers-reduced-motion: reduce)",
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }))
    );
    expect(setupStrip(layout, true)).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
            behavior: "instant",
        })
    );
});

it.each([
    "horizontal",
    "sidebar",
] as const)("positions late chapter data before paint in the %s strip", (layout) => {
    measureStrip(layout, true);
    const model = chapterController();
    const workspace = model.workspaces[0];
    const loading = {
        ...model,
        workspaces: [
            {
                ...workspace,
                current: workspace.chapterVerses[1],
                chapterVerses: [],
            },
        ],
    };
    const scroll = vi.fn();
    Element.prototype.scrollTo = scroll;
    const beforePaint = vi.fn(() => scroll.mock.calls.length);
    const profilerId = `chapter-strip-${layout}`;
    const view = (controller: DeskController) => (
        <Profiler
            id={profilerId}
            onRender={() => {
                beforePaint();
            }}
        >
            <DeskRoot controller={controller}>
                <ChapterPanel />
            </DeskRoot>
        </Profiler>
    );
    const rendered = render(view(loading));
    if (layout === "sidebar") {
        fireEvent.click(
            screen.getByRole("button", {
                name: "Sidebar verse strip",
            })
        );
    }
    rendered.rerender(
        view({
            ...model,
            workspaces: [
                {
                    ...workspace,
                    current: workspace.chapterVerses[1],
                },
            ],
        })
    );
    expect(scroll).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
            behavior: "instant",
        })
    );
    expect(beforePaint.mock.results.at(-1)?.value).toBe(1);
});
