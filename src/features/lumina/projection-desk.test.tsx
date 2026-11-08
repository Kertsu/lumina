import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { Toaster } from "sonner";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { client, createBrowserClient, deskClient } from "@/bridge/client";
import { IntegratedOperator } from "./integrated-operator";
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
    vi.restoreAllMocks();
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
        dismissError: vi.fn(),
    };
}

it("closes an inactive workspace through confirmation without activating it", () => {
    const model = controller();
    model.workspaces.push({
        ...model.workspaces[0],
        id: "workspace-b",
        name: "Side screen",
    });
    render(<ProjectionDesk controller={model} />);
    const tab = screen.getByRole("tab", {
        name: "Side screen, audience Closed",
    });
    const close = screen.getByRole("button", {
        name: "Close Side screen",
    });
    expect(tab.contains(close)).toBe(false);
    fireEvent.mouseDown(close);
    fireEvent.click(close);
    expect(tab.getAttribute("aria-selected")).toBe("false");
    expect(model.dispatch).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
        within(dialog).getByRole("button", {
            name: "Close tab",
        })
    );
    expect(model.dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "remove",
        workspaceId: "workspace-b",
    });
});

it("keeps the last workspace open when its close button is clicked", () => {
    const model = controller();
    render(<ProjectionDesk controller={model} />);
    const close = screen.getByRole("button", {
        name: "Close Audience 1",
    });
    expect(close.hasAttribute("disabled")).toBe(true);
    fireEvent.click(close);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(model.dispatch).not.toHaveBeenCalled();
});

it.each<{
    status: Workspace["status"];
    outcome?: string;
    information?: boolean;
    label: string;
}>([
    {
        status: "closed",
        label: "Closed",
    },
    {
        status: "blank",
        outcome: "projected",
        label: "Blank",
    },
    {
        status: "live",
        outcome: "projected",
        label: "Live",
    },
    {
        status: "live",
        outcome: "awaitingConfirmation",
        label: "Awaiting",
    },
    {
        status: "live",
        outcome: "unconfirmed",
        label: "Unconfirmed",
    },
    {
        status: "live",
        label: "Requested",
    },
    {
        status: "live",
        outcome: "projected",
        information: true,
        label: "Requested",
    },
])("keeps the audience's $label state consistent in tab and stage", (example) => {
    const model = controller();
    Object.assign(model.workspaces[0], {
        status: example.status,
        projectionOutcome: example.outcome,
        information: example.information ?? false,
    });
    render(<ProjectionDesk controller={model} />);
    const tab = screen.getByRole("tab", {
        name: `Audience 1, audience ${example.label}`,
    });
    const stateClass = Array.from(
        tab.querySelector(".workspace-tab-state")?.classList ?? []
    ).find((name) => name.startsWith("status-"));
    expect(stateClass).toBeTruthy();
    expect(
        screen
            .getByRole("main")
            .querySelector(".stage-dot")
            ?.classList.contains(stateClass ?? "missing")
    ).toBe(true);
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

it("surfaces an application error without dismissing it", async () => {
    const model = controller();
    model.error = "Open the audience explicitly before sending live.";
    render(
        <>
            <ProjectionDesk controller={model} />
            <Toaster position="bottom-right" />
        </>
    );
    await screen.findByText(model.error);
    expect(model.dismissError).not.toHaveBeenCalled();
});

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

it("shows Bible import progress and allows retry after publication fails", async () => {
    const snapshot = await createBrowserClient().getApplicationState();
    if (snapshot.status !== "ok") {
        throw new Error("Fixture unavailable");
    }
    const state = structuredClone(snapshot.data);
    vi.spyOn(client, "getApplicationState").mockImplementation(async () => ({
        status: "ok",
        data: structuredClone(state),
    }));
    vi.spyOn(deskClient, "pickBibleImport").mockResolvedValue({
        status: "ok",
        data: {
            token: "import-review",
            filename: "Bible.sqlite",
            translations: [
                {
                    title: "Imported Bible",
                    description: "",
                    editionLabel: null,
                    sourceName: null,
                    sourceUrl: null,
                    rightsNotice: null,
                    bookCount: 66,
                    verseCount: 31_098,
                    books: [],
                },
            ],
            warnings: [],
        },
    });
    let failImport: (error: Error) => void = () => {};
    const commit = vi
        .spyOn(deskClient, "commitImport")
        .mockImplementationOnce(
            () =>
                new Promise((_, reject) => {
                    failImport = reject;
                })
        )
        .mockImplementationOnce(async () => {
            state.translations.push({
                ...state.translations[0],
                translationId: "imported-bible",
                editionId: "imported-edition",
                title: "Imported Bible",
                bundled: false,
            });
            return {
                status: "ok",
                data: {
                    translations: state.translations,
                    filename: "Bible.sqlite",
                    translationIds: ["imported-bible"],
                    libraryRevision: 1,
                },
            };
        });
    render(<IntegratedOperator />);
    fireEvent.pointerDown(
        await screen.findByRole("button", { name: "Lumina menu" }),
        {
            button: 0,
            ctrlKey: false,
            pointerType: "mouse",
        }
    );
    fireEvent.click(
        await screen.findByRole("menuitem", { name: "Bible library" })
    );
    const library = within(
        await screen.findByRole("dialog", { name: "Your Bible library" })
    );
    fireEvent.click(
        library.getByRole("button", { name: /Review a Bible import/ })
    );
    const publish = await library.findByRole<HTMLButtonElement>("button", {
        name: "Add translations",
    });
    fireEvent.click(publish);
    expect(commit).toHaveBeenCalledExactlyOnceWith("import-review");
    expect(publish.textContent).toBe("Adding translations…");
    expect(publish.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(library.getByRole("status").textContent).toBe(
        "Adding translations…"
    );
    expect(publish.disabled).toBe(true);
    expect(
        library.getByRole<HTMLButtonElement>("button", { name: "Cancel" })
            .disabled
    ).toBe(true);
    fireEvent.click(publish);
    expect(commit).toHaveBeenCalledTimes(1);

    await act(async () => failImport(new Error("Could not add translations.")));
    expect(publish.textContent).toBe("Add translations");
    expect(publish.querySelector("svg")).toBeNull();
    expect(publish.disabled).toBe(false);
    fireEvent.click(publish);
    await library.findByRole("heading", { name: "Imported Bible" });
    expect(
        library.queryByRole("heading", { name: "Ready to review" })
    ).toBeNull();
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

it("shows current confirmation state without claiming confirmed projection", () => {
    const model = controller();
    model.workspaces[0].status = "live";
    model.workspaces[0].projectionOutcome = "awaitingConfirmation";
    const { container, rerender } = render(
        <ProjectionDesk controller={model} />
    );
    expect(screen.queryByText("Audience is live")).toBeNull();
    expect(screen.queryByText("On audience")).toBeNull();
    expect(container.querySelector(".stage-dot.status-live")).toBeNull();
    expect(container.querySelector(".status-live")).toBeNull();
    expect(screen.getAllByText("Awaiting confirmation").length).toBeGreaterThan(
        0
    );
    model.workspaces[0].projectionOutcome = "unconfirmed";
    rerender(
        <ProjectionDesk
            controller={{
                ...model,
            }}
        />
    );
    expect(
        screen.getAllByText("Unconfirmed projection").length
    ).toBeGreaterThan(0);
    model.workspaces[0].projectionOutcome = "projected";
    rerender(
        <ProjectionDesk
            controller={{
                ...model,
            }}
        />
    );
    expect(screen.getByText("On audience")).toBeDefined();
    expect(container.querySelector(".stage-dot.status-live")).toBeTruthy();
});

it("identifies deleted-edition history by captured title and Saved copy", async () => {
    const model = controller();
    const verse = model.workspaces[0].history[0].verse;
    verse.translation = "deleted";
    verse.translationTitle = "Original edition title";
    render(<ProjectionDesk controller={model} />);
    fireEvent.click(
        screen.getByRole("button", {
            name: "Search / History",
        })
    );
    fireEvent.mouseDown(
        screen.getByRole("tab", {
            name: /History/,
        }),
        {
            button: 0,
            ctrlKey: false,
        }
    );
    expect(await screen.findByText("Original edition title")).toBeDefined();
    expect(screen.getByText("Saved copy")).toBeDefined();
});

it("uses neutral output labels after a cosmetic refresh or without a verse intent", () => {
    const model = controller();
    model.workspaces[0].status = "live";
    model.workspaces[0].projectionOutcome = "projected";
    const { rerender, container } = render(
        <ProjectionDesk controller={model} />
    );
    expect(screen.getByText("On audience")).toBeDefined();
    model.workspaces[0].projectionOutcome = undefined;
    rerender(
        <ProjectionDesk
            controller={{
                ...model,
            }}
        />
    );
    expect(
        screen.getAllByText("Audience output requested").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Awaiting confirmation")).toBeNull();
    expect(container.querySelector(".stage-dot.status-live")).toBeNull();
    expect(container.querySelector(".status-live")).toBeNull();
    model.workspaces[0].history = [];
    rerender(
        <ProjectionDesk
            controller={{
                ...model,
            }}
        />
    );
    expect(
        screen.getAllByText("Audience output requested").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Awaiting confirmation")).toBeNull();
});

it("shares lookup translation between search and quick reference without changing the display translation", () => {
    const model = controller();
    model.translations.push({
        id: "translation-asv",
        name: "American Standard Version",
        shortName: "ASV",
        bundled: false,
    });
    const rendered = render(<ProjectionDesk controller={model} />);
    fireEvent.click(
        screen.getByRole("button", {
            name: "Search / History",
        })
    );
    fireEvent.keyDown(
        screen.getByRole("combobox", {
            name: "Find in",
        }),
        {
            key: "ArrowDown",
        }
    );
    fireEvent.click(
        screen.getByRole("option", {
            name: "American Standard Version",
        })
    );
    expect(model.dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "changeSearchTranslation",
        workspaceId: "workspace-a",
        translationId: "translation-asv",
    });
    rendered.rerender(
        <ProjectionDesk
            controller={{
                ...model,
                workspaces: [
                    {
                        ...model.workspaces[0],
                        translation: "translation-asv",
                    },
                ],
            }}
        />
    );
    fireEvent.click(
        screen.getByRole("button", {
            name: "Close search and history",
        })
    );
    expect(
        screen.getByRole("combobox", {
            name: "Lookup translation",
        }).textContent
    ).toContain("Find in ASV");
    const display = screen.getByRole("combobox", {
        name: "Change current verse translation",
    });
    expect(display.textContent).toContain("WEB");
    fireEvent.keyDown(display, {
        key: "ArrowDown",
    });
    fireEvent.click(
        screen.getByRole("option", {
            name: "ASV",
        })
    );
    expect(model.dispatch).toHaveBeenLastCalledWith({
        type: "changeCurrentTranslation",
        workspaceId: "workspace-a",
        translationId: "translation-asv",
    });
});
