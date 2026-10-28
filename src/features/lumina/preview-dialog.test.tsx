import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
    type DeskController,
    defaultAppearance,
    type Workspace,
} from "./model";
import { PreviewDialog } from "./preview-dialog";
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
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function previewController(): DeskController {
    const workspace: Workspace = {
        id: "workspace-a",
        name: "Audience 1",
        translation: "web",
        current: null,
        preview: {
            id: "john-3-16",
            candidateId: "candidate-a",
            book: "John",
            bookId: 43,
            chapter: 3,
            verse: 16,
            text: "For God so loved the world.",
            translation: "web",
        },
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
        dismissError: vi.fn(),
    };
}

function view(controller: DeskController) {
    return (
        <DeskRoot controller={controller}>
            <PreviewDialog />
        </DeskRoot>
    );
}

function sendShortcut() {
    fireEvent.keyDown(document, {
        key: "Enter",
        code: "Enter",
        ctrlKey: true,
    });
    fireEvent.keyUp(document, {
        key: "Enter",
        code: "Enter",
        ctrlKey: true,
    });
}

it("opens the audience without clearing or sending the preview, then requires an explicit send", () => {
    const model = previewController();
    const rendered = render(view(model));
    const send = screen.getByRole("button", {
        name: /Send Live/,
    });
    expect(send.hasAttribute("disabled")).toBe(true);
    fireEvent.click(send);
    sendShortcut();
    expect(model.dispatch).not.toHaveBeenCalled();
    fireEvent.click(
        screen.getByRole("button", {
            name: "Open audience",
        })
    );
    expect(model.dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "openAudience",
        workspaceId: "workspace-a",
    });
    expect(screen.getByRole("dialog").textContent).toContain("John 3:16");

    rendered.rerender(
        view({
            ...model,
            workspaces: [
                {
                    ...model.workspaces[0],
                    status: "blank",
                },
            ],
        })
    );
    expect(screen.getByRole("dialog").textContent).toContain("John 3:16");
    expect(model.dispatch).toHaveBeenCalledTimes(1);
    fireEvent.click(
        screen.getByRole("button", {
            name: /Send Live/,
        })
    );
    expect(model.dispatch).toHaveBeenLastCalledWith({
        type: "send",
        workspaceId: "workspace-a",
        verse: model.workspaces[0].preview,
    });
});

it("keeps an opening failure accessible inside the preview and offers retry", () => {
    const model = previewController();
    const rendered = render(view(model));
    fireEvent.click(
        screen.getByRole("button", {
            name: "Open audience",
        })
    );
    rendered.rerender(
        view({
            ...model,
            error: "The audience window could not open. Try again.",
        })
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("alert").textContent).toContain(
        "The audience window could not open. Try again."
    );
    expect(dialog.textContent).toContain("John 3:16");
    const retry = within(dialog).getByRole("button", {
        name: "Open audience",
    });
    expect(retry.hasAttribute("disabled")).toBe(false);
    fireEvent.click(retry);
    expect(model.dispatch).toHaveBeenCalledTimes(2);
    expect(model.dispatch).toHaveBeenLastCalledWith({
        type: "openAudience",
        workspaceId: "workspace-a",
    });
});

it.each<Workspace["status"]>([
    "closed",
    "blank",
])("blocks repeated actions while a %s audience request is pending", (status) => {
    const model = previewController();
    model.workspaces[0].status = status;
    model.pending = true;
    render(view(model));
    const send = screen.getByRole("button", {
        name: /Send Live/,
    });
    expect(send.hasAttribute("disabled")).toBe(true);
    fireEvent.click(send);
    if (status === "closed") {
        const open = screen.getByRole("button", {
            name: "Opening audience…",
        });
        expect(open.hasAttribute("disabled")).toBe(true);
        fireEvent.click(open);
    }
    sendShortcut();
    expect(model.dispatch).not.toHaveBeenCalled();
});

it("allows the send shortcut only after the audience has opened", () => {
    const model = previewController();
    const rendered = render(view(model));
    sendShortcut();
    expect(model.dispatch).not.toHaveBeenCalled();
    rendered.rerender(
        view({
            ...model,
            workspaces: [
                {
                    ...model.workspaces[0],
                    status: "blank",
                },
            ],
        })
    );
    sendShortcut();
    expect(model.dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "send",
        workspaceId: "workspace-a",
        verse: model.workspaces[0].preview,
    });
});
