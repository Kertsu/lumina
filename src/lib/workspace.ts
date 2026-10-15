import { defaultAppearance } from "./appearance";
import { bibleIndex, referenceLabel } from "./bible";
import type {
    Appearance,
    Background,
    HistoryEntry,
    QueueEntry,
    Selection,
    Translation,
    Workspace,
    WorkspaceCollection,
    WorkspaceEntry,
} from "./types";

export function initialWorkspace(): Workspace {
    return {
        queue: [],
        history: [],
        selectedTranslationId: "bundled-web",
        appearance: defaultAppearance(),
    };
}

export function addQueue(
    workspace: Workspace,
    selection: Selection
): Workspace {
    return {
        ...workspace,
        queue: [
            ...workspace.queue,
            {
                id: crypto.randomUUID(),
                translationId: selection.translationId,
                translationTitle: selection.translationTitle,
                bookName: selection.bookName,
                book: selection.book,
                chapter: selection.chapter,
                verse: selection.verse,
            },
        ],
    };
}

export function removeQueue(workspace: Workspace, id: string): Workspace {
    return {
        ...workspace,
        queue: workspace.queue.filter((entry) => entry.id !== id),
    };
}

export function moveQueue(
    workspace: Workspace,
    id: string,
    direction: -1 | 1
): Workspace {
    const index = workspace.queue.findIndex((entry) => entry.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= workspace.queue.length)
        return workspace;
    const queue = [...workspace.queue];
    [queue[index], queue[target]] = [queue[target], queue[index]];
    return {
        ...workspace,
        queue,
    };
}

export function recordHistory(
    workspace: Workspace,
    selection: Selection,
    action: HistoryEntry["action"]
): Workspace {
    return {
        ...workspace,
        history: [
            {
                id: crypto.randomUUID(),
                selection: {
                    ...selection,
                },
                action,
                timestamp: new Date().toISOString(),
            },
            ...workspace.history,
        ],
    };
}

export function resolveQueue(
    entry: Pick<QueueEntry, "translationId" | "book" | "chapter" | "verse">,
    library: Translation[]
): Selection | null {
    const translation = library.find(
        (translation) =>
            translation.id === entry.translationId && translation.available
    );
    return translation
        ? bibleIndex(translation).selectVerse(
              entry.book,
              entry.chapter,
              entry.verse
          )
        : null;
}

export function isSavedCopy(
    selection: Selection,
    library: Translation[]
): boolean {
    return !library.some(
        (translation) =>
            translation.available &&
            translation.id === selection.translationId &&
            translation.edition === selection.edition
    );
}

export function copyText(selection: Selection): string {
    return `${selection.text}\n${referenceLabel(selection)} — ${selection.translationTitle}`;
}

export function historyCsv(entries: HistoryEntry[]): string {
    const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
        ["Timestamp", "Action", "Reference", "Translation", "Edition", "Text"],
        ...entries.map((entry) => [
            entry.timestamp,
            entry.action === "live" ? "Sent Live" : "Preview",
            referenceLabel(entry.selection),
            entry.selection.translationTitle,
            entry.selection.edition,
            entry.selection.text,
        ]),
    ];
    return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function object(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coordinates(value: Record<string, unknown>): boolean {
    return (
        ["book", "chapter", "verse"].every(
            (key) =>
                typeof value[key] === "number" &&
                Number.isSafeInteger(value[key]) &&
                (value[key] as number) > 0
        ) && (value.book as number) <= 66
    );
}

function queueEntry(value: unknown): value is QueueEntry {
    return (
        object(value) &&
        coordinates(value) &&
        ["id", "translationId", "translationTitle", "bookName"].every(
            (key) => typeof value[key] === "string"
        )
    );
}

function selection(value: unknown): value is Selection {
    return (
        object(value) &&
        coordinates(value) &&
        [
            "translationId",
            "edition",
            "translationTitle",
            "abbreviation",
            "bookName",
            "text",
        ].every((key) => typeof value[key] === "string")
    );
}

function historyEntry(value: unknown): value is HistoryEntry {
    return (
        object(value) &&
        typeof value.id === "string" &&
        typeof value.timestamp === "string" &&
        Number.isFinite(Date.parse(value.timestamp)) &&
        (value.action === "preview" || value.action === "live") &&
        selection(value.selection)
    );
}

function restoreAppearance(value: unknown): Appearance {
    const defaults = defaultAppearance();
    if (!object(value)) return defaults;
    const backgrounds: Record<string, Background> = {};
    if (object(value.backgrounds)) {
        for (const [key, background] of Object.entries(value.backgrounds)) {
            if (
                !object(background) ||
                typeof background.color !== "string" ||
                (background.fit !== "fit" && background.fit !== "fill")
            )
                continue;
            backgrounds[key] = {
                color: background.color,
                image:
                    typeof background.image === "string"
                        ? background.image
                        : undefined,
                fit: background.fit,
            };
        }
    }
    const bands = Array.isArray(value.bands)
        ? value.bands
              .filter(
                  (band) =>
                      object(band) &&
                      typeof band.max === "number" &&
                      Number.isFinite(band.max) &&
                      band.max > 0 &&
                      typeof band.size === "number" &&
                      Number.isFinite(band.size) &&
                      band.size >= 16 &&
                      band.size <= 160
              )
              .map((band) => ({
                  max: band.max as number,
                  size: band.size as number,
              }))
        : [];
    return {
        family:
            typeof value.family === "string" ? value.family : defaults.family,
        color: typeof value.color === "string" ? value.color : defaults.color,
        bold: value.bold === true,
        italic: value.italic === true,
        underline: value.underline === true,
        strikeout: value.strikeout === true,
        bands: bands.length
            ? bands.sort((a, b) => a.max - b.max)
            : defaults.bands,
        backgrounds,
    };
}

export function restoreWorkspace(value: unknown): Workspace {
    if (!object(value)) return initialWorkspace();
    return {
        queue: Array.isArray(value.queue) ? value.queue.filter(queueEntry) : [],
        history: Array.isArray(value.history)
            ? value.history
                  .filter(historyEntry)
                  .sort(
                      (a, b) =>
                          Date.parse(b.timestamp) - Date.parse(a.timestamp)
                  )
            : [],
        selectedTranslationId:
            typeof value.selectedTranslationId === "string"
                ? value.selectedTranslationId
                : "",
        appearance: restoreAppearance(value.appearance),
    };
}

export function createWorkspaceEntry(name: string): WorkspaceEntry {
    return {
        id: crypto.randomUUID(),
        name,
        state: initialWorkspace(),
    };
}

export function initialWorkspaces(legacy?: unknown): WorkspaceCollection {
    const entry = createWorkspaceEntry("Audience 1");
    if (legacy !== undefined) {
        if (!object(legacy))
            throw new Error(
                "Legacy workspace is invalid; existing data was preserved."
            );
        entry.state = restoreWorkspace(legacy);
    }
    return {
        version: 2,
        activeWorkspaceId: entry.id,
        workspaces: [entry],
    };
}

export function restoreWorkspaces(value: unknown): WorkspaceCollection {
    if (
        !object(value) ||
        value.version !== 2 ||
        typeof value.activeWorkspaceId !== "string" ||
        !Array.isArray(value.workspaces) ||
        !value.workspaces.length
    )
        throw new Error(
            "Saved workspace collection is invalid; existing data was preserved."
        );
    const ids = new Set<string>();
    const workspaces = value.workspaces.map((entry): WorkspaceEntry => {
        if (
            !object(entry) ||
            typeof entry.id !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                entry.id
            ) ||
            ids.has(entry.id) ||
            typeof entry.name !== "string" ||
            !entry.name.trim() ||
            !object(entry.state)
        )
            throw new Error(
                "Saved workspace identity is invalid; existing data was preserved."
            );
        ids.add(entry.id);
        return {
            id: entry.id,
            name: entry.name,
            state: restoreWorkspace(entry.state),
        };
    });
    if (!ids.has(value.activeWorkspaceId))
        throw new Error(
            "Saved active workspace is missing; existing data was preserved."
        );
    return {
        version: 2,
        activeWorkspaceId: value.activeWorkspaceId,
        workspaces,
    };
}
