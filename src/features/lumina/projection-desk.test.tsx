import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type DeskController,
    defaultAppearance,
    type Workspace,
} from "./model";
import { ProjectionDesk } from "./projection-desk";

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
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function controller(): DeskController {
    const workspace: Workspace = {
        id: "workspace-a",
        name: "Audience 1",
        translation: "translation-web",
        current: {
            id: "verse-john-3-16",
            book: "John",
            bookId: 43,
            chapter: 3,
            verse: 16,
            text: "For God so loved the world.",
            translation: "translation-web",
            translationTitle: "World English Bible",
        },
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
        chapterVerses: [],
        books: [
            {
                id: 43,
                name: "John",
            },
        ],
        metadata: null,
    };
    workspace.history = workspace.current
        ? [
              {
                  id: "action-original",
                  verse: {
                      ...workspace.current,
                      historyActionId: "action-original",
                  },
                  timestamp: 1_790_000_000_000,
                  projected: true,
                  action: "Sent Live",
              },
          ]
        : [];
    return {
        activeId: workspace.id,
        workspaces: [workspace],
        translations: [
            {
                id: "translation-web",
                name: "World English Bible",
                shortName: "WEB",
                bundled: true,
            },
        ],
        dispatch: vi.fn(),
    };
}

it("requests visible history copying through the workspace controller", () => {
    const model = controller();
    render(<ProjectionDesk controller={model} />);
    fireEvent.click(
        screen.getByRole("button", {
            name: "Search / History",
        })
    );
    const historyTab = screen.getByRole("tab", {
        name: /History/,
    });
    fireEvent.mouseDown(historyTab, {
        button: 0,
        ctrlKey: false,
    });
    fireEvent.click(
        screen.getByRole("button", {
            name: "Copy visible history",
        })
    );
    expect(model.dispatch).toHaveBeenCalledWith({
        type: "copyHistory",
        workspaceId: "workspace-a",
    });
    expect(model.workspaces[0].history).toHaveLength(1);
});

it("keeps verse navigation focus on the thumbnail, outside the workspace panel", () => {
    const model = controller();
    const verse = model.workspaces[0].current;
    if (!verse) {
        throw new Error("Missing test verse");
    }
    model.workspaces[0].chapterVerses = [verse];
    render(<ProjectionDesk controller={model} />);
    const thumbnail = screen.getByRole("button", {
        name: "Display John 3:16",
    });
    thumbnail.focus();
    fireEvent.click(thumbnail);
    fireEvent.keyDown(thumbnail, {
        key: "ArrowRight",
        code: "ArrowRight",
    });
    fireEvent.keyUp(thumbnail, {
        key: "ArrowRight",
        code: "ArrowRight",
    });
    expect(document.activeElement).toBe(thumbnail);
    expect(model.dispatch).toHaveBeenCalledWith({
        type: "navigate",
        workspaceId: model.activeId,
        direction: 1,
    });
    const panel = screen.getByRole("tabpanel");
    expect(panel.tabIndex).toBe(-1);
    expect(panel.classList.contains("focus-visible:ring-2")).toBe(false);
});
