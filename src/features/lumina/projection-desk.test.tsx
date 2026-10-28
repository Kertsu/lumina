import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
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

it("opens and filters shortcuts from the keyboard without projection actions", async () => {
    const model = controller();
    render(<ProjectionDesk controller={model} />);
    const reference = screen.getByPlaceholderText(/John 3:16/);
    reference.focus();
    fireEvent.keyDown(reference, {
        key: "/",
        code: "Slash",
        ctrlKey: true,
    });
    fireEvent.keyUp(reference, {
        key: "/",
        code: "Slash",
        ctrlKey: true,
    });
    const dialog = await screen.findByRole("dialog", {
        name: "Keyboard shortcuts",
    });
    const search = within(dialog).getByRole("combobox");
    fireEvent.change(search, {
        target: {
            value: "previous",
        },
    });
    expect(
        within(dialog).getByRole("option", {
            name: /Previous verse/,
        })
    ).toBeDefined();
    expect(
        within(dialog).queryByRole("option", {
            name: /Choose translation/,
        })
    ).toBeNull();
    expect(within(dialog).queryByRole("switch")).toBeNull();
    fireEvent.keyDown(search, {
        key: "b",
        code: "KeyB",
    });
    fireEvent.keyDown(search, {
        key: "ArrowRight",
        code: "ArrowRight",
    });
    expect(model.dispatch).not.toHaveBeenCalled();

    fireEvent.keyDown(search, {
        key: "/",
        code: "Slash",
        ctrlKey: true,
    });
    fireEvent.keyUp(search, {
        key: "/",
        code: "Slash",
        ctrlKey: true,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("keeps audience preferences scoped outside the shortcuts list", async () => {
    const model = controller();
    render(<ProjectionDesk controller={model} />);
    fireEvent.click(
        screen.getByRole("button", {
            name: "Audience settings for Audience 1",
        })
    );
    const dialog = screen.getByRole("dialog", {
        name: "Audience settings",
    });
    fireEvent.click(
        within(dialog).getByRole("switch", {
            name: "Hide audience cursor",
        })
    );
    expect(model.dispatch).toHaveBeenCalledWith({
        type: "hideCursor",
        workspaceId: "workspace-a",
        enabled: false,
    });
    const fullscreen = within(dialog).getByRole("switch", {
        name: "Fullscreen audience",
    });
    fullscreen.focus();
    fireEvent.keyDown(fullscreen, {
        key: "b",
        code: "KeyB",
    });
    expect(model.dispatch).toHaveBeenCalledTimes(1);
    expect(within(dialog).queryByRole("combobox")).toBeNull();
});

it("preserves the menu entry and hands focus to a selected shortcut action", async () => {
    render(<ProjectionDesk controller={controller()} />);
    const menuTrigger = screen.getByRole("button", {
        name: "Lumina menu",
    });
    fireEvent.pointerDown(menuTrigger, {
        button: 0,
        ctrlKey: false,
        pointerType: "mouse",
    });
    fireEvent.click(
        await screen.findByRole("menuitem", {
            name: /Keyboard shortcuts/,
        })
    );
    const dialog = await screen.findByRole("dialog", {
        name: "Keyboard shortcuts",
    });
    fireEvent.click(
        within(dialog).getByRole("option", {
            name: /Quick reference/,
        })
    );
    await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(document.activeElement).toBe(
            screen.getByPlaceholderText(/John 3:16/)
        );
    });
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
