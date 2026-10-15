import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";
import { characterCount, sizeBand } from "../lib/appearance";
import {
    closeAudience,
    openAudience,
    publishAudience,
    setAudienceFullscreen,
    setCursorRestriction,
    setOperatorOnTop,
    watchAudience,
    watchCursorRestriction,
} from "../lib/audience";
import { bibleIndex, referenceLabel } from "../lib/bible";
import {
    acceptImport,
    pickBackground,
    pickImport,
    removeTranslation,
    reviewImport,
} from "../lib/storage";
import type {
    Appearance,
    Background,
    ImportChoice,
    ImportReview,
    SearchMode,
    SearchOrder,
    SearchResult,
    SearchScope,
    Selection,
    Translation,
    Workspace,
} from "../lib/types";
import {
    addQueue,
    copyText,
    historyCsv,
    isSavedCopy,
    moveQueue,
    recordHistory,
    removeQueue,
    resolveQueue,
} from "../lib/workspace";
import { Icon } from "./Icon";
import { VerseSlide } from "./VerseSlide";

const PAGE_SIZE = 12;
const modes: { value: SearchMode; label: string; hint: string }[] = [
    {
        value: "all-words",
        label: "All words",
        hint: "Every complete word, in any order",
    },
    {
        value: "phrase",
        label: "Phrase",
        hint: "Consecutive words, in entered order",
    },
    {
        value: "word-starts",
        label: "Word starts",
        hint: "Every entered prefix, in any order",
    },
    {
        value: "contains",
        label: "Contains text",
        hint: "A literal, contiguous substring",
    },
];
const scopes = [
    {
        value: "all",
        label: "Entire Bible",
    },
    {
        value: "ot",
        label: "Old Testament",
    },
    {
        value: "nt",
        label: "New Testament",
    },
    {
        value: "moses",
        label: "Books of Moses",
    },
    {
        value: "gospels",
        label: "Gospels",
    },
    {
        value: "paul",
        label: "Epistles of Paul",
    },
];

interface OperatorProps {
    workspaceId: string;
    name: string;
    active: boolean;
    shortcutsEnabled: boolean;
    workspace: Workspace;
    setWorkspace: Dispatch<SetStateAction<Workspace>>;
    library: Translation[];
    setLibrary: Dispatch<SetStateAction<Translation[]>>;
    anyAudienceOpen: boolean;
    reportStatus: (id: string, status: "Live" | "Blank" | "Closed") => void;
    top: boolean;
    setTop: Dispatch<SetStateAction<boolean>>;
}

export function Operator({
    workspaceId,
    name,
    active,
    shortcutsEnabled,
    workspace,
    setWorkspace,
    library,
    setLibrary,
    anyAudienceOpen,
    reportStatus,
    top,
    setTop,
}: OperatorProps) {
    const quickId = useId();
    const bandKeys = useRef(["short", "medium", "long", "extended"]);
    const [previewSelection, setPreviewSelection] = useState<Selection | null>(
        null
    );
    const [live, setLive] = useState<Selection | null>(null);
    const [audienceOpen, setAudienceOpen] = useState(false);
    const [blank, setBlank] = useState(true);
    const [panel, setPanel] = useState<"search" | "history">("search");
    const [query, setQuery] = useState("");
    const [mode, setMode] = useState<SearchMode>("all-words");
    const [scope, setScope] = useState<SearchScope>("all");
    const [order, setOrder] = useState<SearchOrder>("best");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [submitted, setSubmitted] = useState<{
        query: string;
        mode: SearchMode;
        scope: SearchScope;
    } | null>(null);
    const [page, setPage] = useState(1);
    const [quick, setQuick] = useState("");
    const [candidates, setCandidates] = useState<
        {
            bookName: string;
            chapter: number;
            verse: number;
            selection: Selection | null;
        }[]
    >([]);
    const [message, setMessage] = useState("");
    const [sentOnly, setSentOnly] = useState(false);
    const [modal, setModal] = useState<
        "appearance" | "library" | "information" | "help" | null
    >(null);
    const [draft, setDraft] = useState<Appearance | null>(null);
    const [backgroundBusy, setBackgroundBusy] = useState(false);
    const appearanceRevision = useRef(0);
    const [review, setReview] = useState<ImportReview | null>(null);
    const [choices, setChoices] = useState<ImportChoice[]>([]);
    const [busy, setBusy] = useState(false);
    const [confirmation, setConfirmation] = useState<{
        text: string;
        run: () => Promise<void> | void;
    } | null>(null);
    const [restricted, setRestricted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const translationRef = useRef<HTMLSelectElement>(null);
    const selected =
        library.find(
            (item) =>
                item.id === workspace.selectedTranslationId && item.available
        ) ?? library.find((item) => item.available);
    const index = useMemo(
        () => (selected ? bibleIndex(selected) : null),
        [selected]
    );
    const indexes = useMemo(
        () =>
            new Map(
                library
                    .filter((item) => item.available)
                    .map((item) => [item.id, bibleIndex(item)])
            ),
        [library]
    );
    const preview = previewSelection;
    const history = workspace.history.filter(
        (item) => !sentOnly || item.action === "live"
    );
    const privateIndex =
        preview &&
        library.some(
            (item) =>
                item.id === preview.translationId &&
                item.edition === preview.edition &&
                item.available
        )
            ? indexes.get(preview.translationId)
            : null;
    const chapter =
        preview && privateIndex
            ? privateIndex.chapter(preview.book, preview.chapter)
            : [];
    const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

    const attempt = useCallback(async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        }
    }, []);
    useEffect(() => {
        const available = library.find(
            (item) =>
                item.id === workspace.selectedTranslationId && item.available
        );
        if (!available) {
            const fallback = library.find(
                (item) => item.bundled && item.available
            );
            if (fallback)
                setWorkspace((current) => ({
                    ...current,
                    selectedTranslationId: fallback.id,
                }));
        }
        setResults([]);
        setSubmitted(null);
        setPage(1);
        setCandidates([]);
    }, [library, workspace.selectedTranslationId, setWorkspace]);
    useEffect(() => {
        reportStatus(
            workspaceId,
            audienceOpen ? (blank ? "Blank" : "Live") : "Closed"
        );
    }, [workspaceId, audienceOpen, blank, reportStatus]);
    useEffect(() => {
        let stop: (() => void) | undefined;
        let cancelled = false;
        void watchAudience(workspaceId, (open) => {
            setAudienceOpen(open);
            if (!open) {
                setBlank(true);
                setLive(null);
                setFullscreen(false);
                setRestricted(false);
            }
        })
            .then((cleanup) => {
                if (cancelled) cleanup();
                else stop = cleanup;
            })
            .catch((error: unknown) => setMessage(String(error)));
        return () => {
            cancelled = true;
            stop?.();
        };
    }, [workspaceId]);
    useEffect(() => {
        let stop: (() => void) | undefined;
        let cancelled = false;
        void watchCursorRestriction(workspaceId, (enabled, feedback) => {
            setRestricted(enabled);
            if (feedback) setMessage(feedback);
        })
            .then((cleanup) => {
                if (cancelled) cleanup();
                else stop = cleanup;
            })
            .catch((error: unknown) => setMessage(String(error)));
        return () => {
            cancelled = true;
            stop?.();
        };
    }, [workspaceId]);
    function prepare(selection: Selection) {
        setPreviewSelection(selection);
        setWorkspace((current) => recordHistory(current, selection, "preview"));
    }
    async function send(requested?: Selection | null) {
        const candidate = requested === undefined ? preview : requested;
        const selection =
            requested === undefined
                ? candidate
                : candidate && resolveQueue(candidate, library);
        if (!selection) {
            throw new Error(
                previewSelection
                    ? "Verse unavailable. Select a verse or a saved copy first."
                    : "Select a verse to preview first."
            );
        }
        if (!audienceOpen) {
            throw new Error("Open Audience before sending a verse live.");
        }
        await publishAudience(workspaceId, {
            selection,
            appearance: workspace.appearance,
            blank: false,
        });
        setLive(selection);
        setBlank(false);
        setMessage("");
        setWorkspace((current) => recordHistory(current, selection, "live"));
    }
    async function navigate(target: "private" | "live", direction: -1 | 1) {
        const selection = target === "private" ? preview : live;
        if (!selection) return;
        const translation = library.find(
            (item) =>
                item.id === selection.translationId &&
                item.edition === selection.edition &&
                item.available
        );
        const next =
            translation &&
            indexes.get(translation.id)?.adjacent(selection, direction);
        if (!next) {
            setMessage("Adjacent verse unavailable in this edition.");
            return;
        }
        if (target === "private") prepare(next);
        else await send(next);
    }
    function search() {
        if (!index) return;
        if (!query.trim()) {
            setMessage("Enter words or text to search.");
            return;
        }
        setResults(index.search(query, mode, scope, order));
        setSubmitted({
            query,
            mode,
            scope,
        });
        setPage(1);
        setMessage("");
    }
    function selectTranslation(id: string) {
        setWorkspace((current) => ({
            ...current,
            selectedTranslationId: id,
        }));
        setResults([]);
        setSubmitted(null);
        setPage(1);
        setCandidates([]);
    }
    async function quickReference() {
        if (!index) return;
        const resolved = index.resolveRef(quick);
        setCandidates([]);
        if (resolved.status === "resolved") {
            await send(resolved.selection);
            setQuick("");
        } else if (resolved.status === "ambiguous") {
            setCandidates(resolved.candidates);
            setMessage("Choose a book to resolve this reference.");
        } else setMessage(resolved.message);
    }
    useEffect(() => {
        function keyboard(event: KeyboardEvent) {
            if (!active || !shortcutsEnabled) return;
            if (event.key === "F1") {
                event.preventDefault();
                translationRef.current?.focus();
            }
            if (event.key === "F3") {
                event.preventDefault();
                setPanel("search");
                searchRef.current?.focus();
            }
            if (event.key === "F7") {
                event.preventDefault();
                setModal("information");
            }
            if (
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey) &&
                !modal &&
                !confirmation
            ) {
                event.preventDefault();
                void attempt(() => send());
            }
        }
        window.addEventListener("keydown", keyboard);
        return () => window.removeEventListener("keydown", keyboard);
    });
    async function toggleAudience() {
        if (audienceOpen) await closeAudience(workspaceId);
        else {
            await openAudience(workspaceId);
            setAudienceOpen(true);
            setBlank(true);
            setLive(null);
        }
    }
    async function toggleBlank() {
        if (!audienceOpen) {
            setMessage("Open Audience first.");
            return;
        }
        const next = !blank;
        await publishAudience(workspaceId, {
            selection: live,
            appearance: workspace.appearance,
            blank: next,
        });
        setBlank(next);
    }
    async function clipboard(selection: Selection | null) {
        if (!selection) return;
        await navigator.clipboard.writeText(copyText(selection));
        setMessage("Verse copied with its reference and translation.");
    }
    function exportHistory() {
        const url = URL.createObjectURL(
            new Blob([historyCsv(history)], {
                type: "text/csv;charset=utf-8",
            })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "lumina-verse-history.csv";
        link.click();
        URL.revokeObjectURL(url);
    }
    async function startImport(targetId?: string) {
        setBusy(true);
        try {
            const path = await pickImport();
            if (!path) return;
            const incoming = await reviewImport(path);
            setReview(incoming);
            setChoices(
                incoming.translations.map((item, i) => ({
                    sourceId: item.id,
                    action: targetId && i === 0 ? "replace" : "skip",
                    targetId: i === 0 ? targetId : undefined,
                    confirmed: false,
                }))
            );
        } finally {
            setBusy(false);
        }
    }
    function changeChoice(sourceId: string, value: string) {
        const [action, targetId] = value.split(":");
        setChoices((current) =>
            current.map((item) =>
                item.sourceId === sourceId
                    ? {
                          sourceId,
                          action: action as ImportChoice["action"],
                          targetId,
                          confirmed: false,
                      }
                    : item
            )
        );
    }
    async function install() {
        if (!review) return;
        setBusy(true);
        try {
            const updated = await acceptImport(
                review.path,
                choices.map((item) => ({
                    ...item,
                    confirmed: true,
                }))
            );
            setLibrary(updated);
            setReview(null);
            setResults([]);
            setSubmitted(null);
            setMessage("Import completed. Duplicate editions were skipped.");
        } finally {
            setBusy(false);
        }
    }
    function updateBackground(changes: Partial<Background>) {
        if (!preview) return;
        const translationId = preview.translationId;
        setDraft((current) =>
            current
                ? {
                      ...current,
                      backgrounds: {
                          ...current.backgrounds,
                          [translationId]: {
                              ...current.backgrounds[translationId],
                              color:
                                  current.backgrounds[translationId]?.color ??
                                  "#111820",
                              fit:
                                  current.backgrounds[translationId]?.fit ??
                                  "fill",
                              ...changes,
                          },
                      },
                  }
                : current
        );
    }
    function closeDialog() {
        appearanceRevision.current += 1;
        setBackgroundBusy(false);
        setDraft(null);
        setModal(null);
    }
    async function chooseBackground() {
        const revision = appearanceRevision.current;
        setBackgroundBusy(true);
        try {
            const image = await pickBackground();
            if (image && revision === appearanceRevision.current)
                updateBackground({
                    image,
                });
        } finally {
            if (revision === appearanceRevision.current)
                setBackgroundBusy(false);
        }
    }
    async function applyAppearance() {
        if (!draft || backgroundBusy) return;
        if (audienceOpen)
            await publishAudience(workspaceId, {
                selection: live,
                appearance: draft,
                blank,
            });
        setWorkspace((current) => ({
            ...current,
            appearance: draft,
        }));
        closeDialog();
    }
    function scopeLabel(value: SearchScope) {
        return (
            scopes.find((item) => item.value === value)?.label ??
            selected?.books.find((book) => book.number === value)?.name ??
            "Book"
        );
    }
    const informationBook =
        preview &&
        library
            .find((item) => item.id === preview.translationId)
            ?.books.find((book) => book.number === preview.book);

    return (
        <main className="operator-shell" hidden={!active}>
            <header className="topbar">
                <div className="brand">
                    <img src="/lumina-mark-loading.svg" alt="" />
                    <span>
                        Lumina<small>VERSE PROJECTION</small>
                    </span>
                </div>
                <div className="header-divider" />
                <label className="translation-picker">
                    <span className="sr-only">Translation</span>
                    <Icon name="book" />
                    <select
                        ref={translationRef}
                        value={selected?.id ?? ""}
                        onChange={(event) =>
                            selectTranslation(event.target.value)
                        }
                    >
                        {library
                            .filter((item) => item.available)
                            .map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                    </select>
                    <kbd>F1</kbd>
                </label>
                <div className="header-spacer" />
                <strong className="active-workspace-name" title={name}>
                    {name}
                </strong>
                <button
                    type="button"
                    className={`button audience-button ${audienceOpen ? "active" : "primary"}`}
                    onClick={() => void attempt(toggleAudience)}
                >
                    <Icon name="monitor" />
                    {audienceOpen ? "Close Audience" : "Open Audience"}
                </button>
                <button
                    type="button"
                    className={`button ${blank && audienceOpen ? "active" : ""}`}
                    onClick={() => void attempt(toggleBlank)}
                    disabled={!audienceOpen}
                >
                    <Icon name="eye" />
                    {blank ? "Resume" : "Blank"}
                </button>
                <button
                    type="button"
                    className="icon-button"
                    title="Appearance"
                    aria-label="Appearance"
                    onClick={() => {
                        appearanceRevision.current += 1;
                        setBackgroundBusy(false);
                        setDraft(structuredClone(workspace.appearance));
                        setModal("appearance");
                    }}
                >
                    <Icon name="settings" />
                </button>
                <button
                    type="button"
                    className="icon-button"
                    title="Translation library"
                    aria-label="Translation library"
                    onClick={() => setModal("library")}
                >
                    <Icon name="book" />
                </button>
                <button
                    type="button"
                    className="help-button"
                    aria-label="Keyboard shortcuts"
                    onClick={() => setModal("help")}
                >
                    ?
                </button>
            </header>
            <div className="workspace-layout">
                <section className="presentation-column">
                    <div className="section-heading">
                        <div>
                            <span
                                className={`status-dot ${audienceOpen && !blank ? "on" : ""}`}
                            />
                            LIVE PREVIEW
                            <span className="subtle">
                                {live ? referenceLabel(live) : "No verse sent"}
                            </span>
                        </div>
                        <span className="connection-status">
                            {audienceOpen
                                ? "Audience connected"
                                : "Audience closed"}
                        </span>
                    </div>
                    <div className="live-stage">
                        <VerseSlide
                            selection={live}
                            appearance={workspace.appearance}
                            blank={blank}
                        />
                        <div className="stage-footer">
                            <span>
                                <Icon name="monitor" size={14} />
                                {audienceOpen
                                    ? blank
                                        ? "BLANK"
                                        : "LIVE"
                                    : "OFFLINE WORKSPACE"}
                            </span>
                            <button
                                type="button"
                                className="text-button"
                                disabled={!live}
                                onClick={() =>
                                    void attempt(() => clipboard(live))
                                }
                            >
                                <Icon name="copy" size={14} />
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="live-controls">
                        <div className="target-label">
                            <span className="status-dot on" />
                            Live navigation
                        </div>
                        <button
                            type="button"
                            className="button compact"
                            disabled={!live || !audienceOpen}
                            onClick={() =>
                                void attempt(() => navigate("live", -1))
                            }
                        >
                            <Icon
                                name="chevron"
                                size={14}
                                style={{
                                    transform: "rotate(180deg)",
                                }}
                            />
                            Previous
                        </button>
                        <button
                            type="button"
                            className="button compact"
                            disabled={!live || !audienceOpen}
                            onClick={() =>
                                void attempt(() => navigate("live", 1))
                            }
                        >
                            Next
                            <Icon name="chevron" size={14} />
                        </button>
                        <button
                            type="button"
                            className="text-button change-translation"
                            disabled={!live}
                            onClick={() => {
                                if (!live || !index) return;
                                const replacement = index.selectVerse(
                                    live.book,
                                    live.chapter,
                                    live.verse
                                );
                                if (replacement) prepare(replacement);
                                else
                                    setMessage(
                                        "Reference unavailable in selected translation. Audience unchanged."
                                    );
                            }}
                        >
                            Change translation
                            <Icon name="chevron" size={13} />
                        </button>
                    </div>
                    <div className="private-preview">
                        <div className="private-copy">
                            <div className="eyebrow">
                                <Icon name="eye" size={14} />
                                PRIVATE PREVIEW{" "}
                                {preview && isSavedCopy(preview, library) && (
                                    <span className="saved-copy">
                                        Saved copy
                                    </span>
                                )}
                            </div>
                            <h2>
                                {preview
                                    ? referenceLabel(preview)
                                    : previewSelection
                                      ? "Verse unavailable"
                                      : "Select a verse"}
                                <span>{preview?.abbreviation}</span>
                            </h2>
                            <p>
                                {preview?.text ??
                                    (previewSelection
                                        ? `${referenceLabel(previewSelection)} · ${previewSelection.translationTitle} is unavailable. Restore this translation or select a history saved copy.`
                                        : "Search, choose an adjacent verse, or select a queue entry.")}
                            </p>
                            <div className="private-meta">
                                {preview
                                    ? `${characterCount(preview.text)} characters · ${sizeBand(preview.text, workspace.appearance).size}px size band`
                                    : "Your preparation stays private"}
                            </div>
                        </div>
                        <div className="private-actions">
                            <button
                                type="button"
                                className="button primary send-live"
                                disabled={!preview || !audienceOpen}
                                onClick={() => void attempt(() => send())}
                            >
                                <Icon name="play" size={16} />
                                Send Live<kbd>⌘ ↵</kbd>
                            </button>
                            <button
                                type="button"
                                className="button"
                                disabled={!preview}
                                onClick={() => {
                                    if (preview)
                                        setWorkspace((current) =>
                                            addQueue(current, preview)
                                        );
                                }}
                            >
                                <Icon name="plus" size={15} />
                                Add to queue
                            </button>
                            <div className="private-navigation">
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label="Private previous"
                                    disabled={!privateIndex}
                                    onClick={() =>
                                        void attempt(() =>
                                            navigate("private", -1)
                                        )
                                    }
                                >
                                    <Icon
                                        name="chevron"
                                        style={{
                                            transform: "rotate(180deg)",
                                        }}
                                    />
                                </button>
                                <span>Private</span>
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label="Private next"
                                    disabled={!privateIndex}
                                    onClick={() =>
                                        void attempt(() =>
                                            navigate("private", 1)
                                        )
                                    }
                                >
                                    <Icon name="chevron" />
                                </button>
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label="Copy private verse"
                                    disabled={!preview}
                                    onClick={() =>
                                        void attempt(() => clipboard(preview))
                                    }
                                >
                                    <Icon name="copy" size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="adjacent-heading">
                        <span>
                            {preview
                                ? `${preview.bookName.toUpperCase()} ${preview.chapter}`
                                : "ADJACENT VERSES"}
                            <span className="subtle">
                                {" "}
                                · Select to preview privately
                            </span>
                        </span>
                        <span>{chapter.length} verses</span>
                    </div>
                    <div className="adjacent-strip">
                        {chapter.map((verse) => (
                            <button
                                type="button"
                                key={`${verse.book}:${verse.chapter}:${verse.verse}`}
                                className={`adjacent-card ${preview?.verse === verse.verse ? "selected" : ""}`}
                                onClick={() => prepare(verse)}
                            >
                                <span className="verse-number">
                                    {verse.verse}
                                </span>
                                <p>{verse.text}</p>
                            </button>
                        ))}
                        {!chapter.length && (
                            <p className="empty-hint">
                                Adjacent verses unavailable for this saved
                                edition.
                            </p>
                        )}
                    </div>
                </section>
                <aside className="right-panel">
                    <div className="panel-tabs">
                        <button
                            type="button"
                            className={panel === "search" ? "selected" : ""}
                            onClick={() => setPanel("search")}
                        >
                            <Icon name="search" size={16} />
                            Search<kbd>F3</kbd>
                        </button>
                        <button
                            type="button"
                            className={panel === "history" ? "selected" : ""}
                            onClick={() => setPanel("history")}
                        >
                            <Icon name="history" size={16} />
                            History
                            <span className="count-badge">
                                {workspace.history.length}
                            </span>
                        </button>
                    </div>
                    {panel === "search" ? (
                        <>
                            <form
                                className="search-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    search();
                                }}
                            >
                                <div className="search-input">
                                    <Icon name="search" />
                                    <input
                                        ref={searchRef}
                                        aria-label="Search words"
                                        placeholder="Find words in Scripture…"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                    />
                                    <button type="submit" aria-label="Search">
                                        <Icon name="chevron" />
                                    </button>
                                </div>
                                <div className="search-modes">
                                    {modes.map((item) => (
                                        <label
                                            key={item.value}
                                            className={
                                                mode === item.value
                                                    ? "selected"
                                                    : ""
                                            }
                                            title={item.hint}
                                        >
                                            <input
                                                type="radio"
                                                name="mode"
                                                value={item.value}
                                                checked={mode === item.value}
                                                onChange={() =>
                                                    setMode(item.value)
                                                }
                                            />
                                            {item.label}
                                        </label>
                                    ))}
                                </div>
                                <label className="scope-picker">
                                    Search at
                                    <select
                                        value={scope}
                                        onChange={(event) =>
                                            setScope(
                                                /^\d+$/.test(event.target.value)
                                                    ? Number(event.target.value)
                                                    : (event.target
                                                          .value as SearchScope)
                                            )
                                        }
                                    >
                                        {scopes.map((item) => (
                                            <option
                                                key={item.value}
                                                value={item.value}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                        <optgroup label="Specific book">
                                            {selected?.books.map((book) => (
                                                <option
                                                    key={book.number}
                                                    value={book.number}
                                                >
                                                    {book.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </label>
                                <button
                                    className="button search-submit"
                                    type="submit"
                                >
                                    Search Scripture<kbd>↵</kbd>
                                </button>
                            </form>
                            <div className="results-heading">
                                <span>
                                    {submitted
                                        ? `${results.length.toLocaleString()} results`
                                        : "SEARCH RESULTS"}
                                </span>
                                <select
                                    aria-label="Result order"
                                    value={order}
                                    onChange={(event) => {
                                        const next = event.target
                                            .value as SearchOrder;
                                        setOrder(next);
                                        if (submitted && index)
                                            setResults(
                                                index.search(
                                                    submitted.query,
                                                    submitted.mode,
                                                    submitted.scope,
                                                    next
                                                )
                                            );
                                        setPage(1);
                                    }}
                                >
                                    <option value="best">Best match</option>
                                    <option value="bible">Bible order</option>
                                </select>
                            </div>
                            {submitted && (
                                <div className="query-summary">
                                    “{submitted.query}” ·{" "}
                                    {
                                        modes.find(
                                            (item) =>
                                                item.value === submitted.mode
                                        )?.label
                                    }
                                    <br />
                                    {selected?.abbreviation} ·{" "}
                                    {scopeLabel(submitted.scope)}
                                    {order === "bible" &&
                                        results.some(
                                            (item) => item.selection.book >= 40
                                        ) && (
                                            <button
                                                type="button"
                                                className="text-button"
                                                onClick={() =>
                                                    setPage(
                                                        Math.floor(
                                                            results.findIndex(
                                                                (item) =>
                                                                    item
                                                                        .selection
                                                                        .book >=
                                                                    40
                                                            ) / PAGE_SIZE
                                                        ) + 1
                                                    )
                                                }
                                            >
                                                Jump to NT ↓
                                            </button>
                                        )}
                                </div>
                            )}
                            <div className="results-list">
                                {results
                                    .slice(
                                        (page - 1) * PAGE_SIZE,
                                        page * PAGE_SIZE
                                    )
                                    .map((item) => (
                                        <div
                                            key={`${item.selection.book}:${item.selection.chapter}:${item.selection.verse}`}
                                            className={`result-card ${preview && referenceLabel(preview) === referenceLabel(item.selection) && preview.translationId === item.selection.translationId ? "selected" : ""}`}
                                        >
                                            <button
                                                type="button"
                                                className="result-preview"
                                                onClick={() =>
                                                    prepare(item.selection)
                                                }
                                            >
                                                <strong>
                                                    {referenceLabel(
                                                        item.selection
                                                    )}
                                                    <span>
                                                        {
                                                            item.selection
                                                                .abbreviation
                                                        }
                                                    </span>
                                                </strong>
                                                <p>
                                                    <Highlighted
                                                        result={item}
                                                    />
                                                </p>
                                            </button>
                                            <div className="result-actions">
                                                <button
                                                    type="button"
                                                    className="text-button"
                                                    onClick={() =>
                                                        prepare(item.selection)
                                                    }
                                                >
                                                    <Icon
                                                        name="eye"
                                                        size={13}
                                                    />
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-button"
                                                    onClick={() =>
                                                        setWorkspace(
                                                            (current) =>
                                                                addQueue(
                                                                    current,
                                                                    item.selection
                                                                )
                                                        )
                                                    }
                                                >
                                                    <Icon
                                                        name="plus"
                                                        size={13}
                                                    />
                                                    Queue
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                {!results.length && (
                                    <div className="empty-results">
                                        <Icon name="search" size={30} />
                                        <h3>
                                            {submitted
                                                ? "No matching verses"
                                                : "Find the verse you remember"}
                                        </h3>
                                        <p>
                                            {submitted
                                                ? "Try another mode or scope, then search again."
                                                : "Enter ordinary words. Choose how to match them. Results stay private."}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {submitted && (
                                <div className="pagination">
                                    <button
                                        type="button"
                                        className="icon-button"
                                        aria-label="Previous result page"
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <Icon
                                            name="chevron"
                                            size={15}
                                            style={{
                                                transform: "rotate(180deg)",
                                            }}
                                        />
                                    </button>
                                    <label>
                                        Page
                                        <select
                                            aria-label="Result page"
                                            value={page}
                                            onChange={(event) =>
                                                setPage(
                                                    Number(event.target.value)
                                                )
                                            }
                                        >
                                            {Array.from(
                                                {
                                                    length: pages,
                                                },
                                                (_, i) => i + 1
                                            ).map((pageNumber) => (
                                                <option
                                                    key={pageNumber}
                                                    value={pageNumber}
                                                >
                                                    {pageNumber}
                                                </option>
                                            ))}
                                        </select>
                                        of {pages}
                                    </label>
                                    <button
                                        type="button"
                                        className="icon-button"
                                        aria-label="Next result page"
                                        disabled={page === pages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <Icon name="chevron" size={15} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="history-tools">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={sentOnly}
                                        onChange={(event) =>
                                            setSentOnly(event.target.checked)
                                        }
                                    />
                                    Sent Live only
                                </label>
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label="Export visible history"
                                    title="Export visible history as CSV"
                                    onClick={exportHistory}
                                >
                                    <Icon name="download" size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="text-button"
                                    onClick={() =>
                                        setConfirmation({
                                            text: "Clear all verse history? Saved copies will be removed.",
                                            run: () =>
                                                setWorkspace((current) => ({
                                                    ...current,
                                                    history: [],
                                                })),
                                        })
                                    }
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="results-list">
                                {history.map((entry) => (
                                    <div className="result-card" key={entry.id}>
                                        <button
                                            type="button"
                                            className="result-preview"
                                            onClick={() =>
                                                prepare(entry.selection)
                                            }
                                        >
                                            <strong>
                                                {referenceLabel(
                                                    entry.selection
                                                )}
                                                <span>
                                                    {
                                                        entry.selection
                                                            .abbreviation
                                                    }
                                                </span>
                                            </strong>
                                            <p>{entry.selection.text}</p>
                                        </button>
                                        <div className="history-meta">
                                            <span
                                                className={
                                                    entry.action === "live"
                                                        ? "amber-text"
                                                        : ""
                                                }
                                            >
                                                {entry.action === "live"
                                                    ? "Sent Live"
                                                    : "Previewed"}
                                                {isSavedCopy(
                                                    entry.selection,
                                                    library
                                                ) && " · Saved copy"}
                                            </span>
                                            <time dateTime={entry.timestamp}>
                                                {new Date(
                                                    entry.timestamp
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </time>
                                            <button
                                                type="button"
                                                className="icon-button"
                                                aria-label="Copy history verse"
                                                onClick={() =>
                                                    void attempt(() =>
                                                        clipboard(
                                                            entry.selection
                                                        )
                                                    )
                                                }
                                            >
                                                <Icon name="copy" size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!history.length && (
                                    <div className="empty-results">
                                        <Icon name="history" size={30} />
                                        <h3>Your verse history</h3>
                                        <p>
                                            Previewed and projected verses
                                            appear here, with their original
                                            wording.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </aside>
            </div>
            <section className="queue-section">
                <div className="queue-heading">
                    <Icon name="book" size={15} />
                    <strong>VERSE QUEUE</strong>
                    <span className="count-badge">
                        {workspace.queue.length}
                    </span>
                    <span className="subtle">
                        Select to prepare · repeated verses welcome
                    </span>
                </div>
                <div className="queue-strip">
                    {workspace.queue.map((entry, i) => {
                        const verse = resolveQueue(entry, library);
                        return (
                            <div
                                className={`queue-card ${!verse ? "unavailable" : ""}`}
                                key={entry.id}
                            >
                                <button
                                    type="button"
                                    className="queue-preview"
                                    disabled={!verse}
                                    onClick={() => {
                                        if (verse) prepare(verse);
                                    }}
                                >
                                    <span className="queue-index">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div>
                                        <strong>
                                            {verse
                                                ? referenceLabel(verse)
                                                : `${entry.bookName} ${entry.chapter}:${entry.verse}`}
                                        </strong>
                                        <small>
                                            {verse?.abbreviation ??
                                                "Unavailable"}
                                        </small>
                                    </div>
                                </button>
                                <div className="queue-actions">
                                    <button
                                        type="button"
                                        aria-label={`Move queue entry ${i + 1} left`}
                                        disabled={i === 0}
                                        onClick={() =>
                                            setWorkspace((current) =>
                                                moveQueue(current, entry.id, -1)
                                            )
                                        }
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Move queue entry ${i + 1} right`}
                                        disabled={
                                            i === workspace.queue.length - 1
                                        }
                                        onClick={() =>
                                            setWorkspace((current) =>
                                                moveQueue(current, entry.id, 1)
                                            )
                                        }
                                    >
                                        ›
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Remove queue entry ${i + 1}`}
                                        onClick={() =>
                                            setWorkspace((current) =>
                                                removeQueue(current, entry.id)
                                            )
                                        }
                                    >
                                        <Icon name="close" size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!workspace.queue.length && (
                        <div className="queue-empty">
                            <Icon name="plus" size={17} />
                            <span>
                                Add verses from search or private preview to
                                prepare a sequence.
                            </span>
                        </div>
                    )}
                </div>
            </section>
            <footer className="quick-bar">
                <label htmlFor={quickId}>
                    <Icon name="book" size={18} />
                    <span>Quick reference</span>
                </label>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void attempt(quickReference);
                    }}
                >
                    <input
                        id={quickId}
                        placeholder="e.g. John 3:16 or Juan 3:16"
                        value={quick}
                        onChange={(event) => {
                            setQuick(event.target.value);
                            setCandidates([]);
                        }}
                    />
                    <button className="button primary" type="submit">
                        Go Live<kbd>↵</kbd>
                    </button>
                </form>
                <span className="quick-hint">
                    References only · projects on Enter
                </span>
            </footer>
            {message && (
                <div className="notification" role="status">
                    <span>{message}</span>
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="Dismiss message"
                        onClick={() => setMessage("")}
                    >
                        <Icon name="close" size={16} />
                    </button>
                </div>
            )}
            {candidates.length > 0 && (
                <div className="candidate-popover">
                    {candidates.map((item) => (
                        <button
                            type="button"
                            className="button"
                            key={`${item.bookName}:${item.chapter}:${item.verse}`}
                            onClick={() => {
                                if (item.selection) {
                                    const candidate = item.selection;
                                    void attempt(async () => {
                                        await send(candidate);
                                        setCandidates([]);
                                        setQuick("");
                                    });
                                } else
                                    setMessage(
                                        "Reference unavailable in selected translation."
                                    );
                            }}
                        >
                            {item.bookName} {item.chapter}:{item.verse}
                            {!item.selection && " · Unavailable"}
                        </button>
                    ))}
                </div>
            )}
            {modal && (
                <div className="modal-backdrop">
                    <section
                        className={`modal ${modal === "appearance" ? "wide-modal" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={modal}
                    >
                        <div className="modal-heading">
                            <h2>
                                {modal === "appearance"
                                    ? "Projection appearance"
                                    : modal === "library"
                                      ? "Translation library"
                                      : modal === "information"
                                        ? "Book information"
                                        : "Workspace controls"}
                            </h2>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Close dialog"
                                onClick={closeDialog}
                            >
                                <Icon name="close" />
                            </button>
                        </div>
                        {modal === "appearance" && draft && (
                            <>
                                <div className="appearance-layout">
                                    <div className="appearance-fields">
                                        <label>
                                            Verse font
                                            <select
                                                value={draft.family}
                                                onChange={(event) =>
                                                    setDraft({
                                                        ...draft,
                                                        family: event.target
                                                            .value,
                                                    })
                                                }
                                            >
                                                <option value="Georgia, serif">
                                                    Georgia
                                                </option>
                                                <option value="Inter Variable, sans-serif">
                                                    Inter
                                                </option>
                                                <option value="Arial, sans-serif">
                                                    Arial
                                                </option>
                                                <option value="Times New Roman, serif">
                                                    Times New Roman
                                                </option>
                                            </select>
                                        </label>
                                        <label>
                                            Text color
                                            <input
                                                type="color"
                                                value={draft.color}
                                                onChange={(event) =>
                                                    setDraft({
                                                        ...draft,
                                                        color: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <div className="style-toggles">
                                            {(
                                                [
                                                    "bold",
                                                    "italic",
                                                    "underline",
                                                    "strikeout",
                                                ] as const
                                            ).map((key) => (
                                                <label key={key}>
                                                    <input
                                                        type="checkbox"
                                                        checked={draft[key]}
                                                        onChange={(event) =>
                                                            setDraft({
                                                                ...draft,
                                                                [key]: event
                                                                    .target
                                                                    .checked,
                                                            })
                                                        }
                                                    />
                                                    {key}
                                                </label>
                                            ))}
                                        </div>
                                        <h3>Shared size bands</h3>
                                        <p className="subtle">
                                            Maximum characters / font size at
                                            1920px. Manual changes affect every
                                            verse in the band.
                                        </p>
                                        {draft.bands.map((band, i) => (
                                            <div
                                                className="band-row"
                                                key={bandKeys.current[i]}
                                            >
                                                <label>
                                                    Up to
                                                    <input
                                                        aria-label={`Band ${i + 1} maximum characters`}
                                                        type="number"
                                                        min={1}
                                                        value={band.max}
                                                        onChange={(event) =>
                                                            setDraft({
                                                                ...draft,
                                                                bands: draft.bands.map(
                                                                    (
                                                                        item,
                                                                        j
                                                                    ) =>
                                                                        j === i
                                                                            ? {
                                                                                  ...item,
                                                                                  max: Number(
                                                                                      event
                                                                                          .target
                                                                                          .value
                                                                                  ),
                                                                              }
                                                                            : item
                                                                ),
                                                            })
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    px
                                                    <input
                                                        aria-label={`Band ${i + 1} size`}
                                                        type="number"
                                                        min={16}
                                                        max={160}
                                                        value={band.size}
                                                        onChange={(event) =>
                                                            setDraft({
                                                                ...draft,
                                                                bands: draft.bands.map(
                                                                    (
                                                                        item,
                                                                        j
                                                                    ) =>
                                                                        j === i
                                                                            ? {
                                                                                  ...item,
                                                                                  size: Number(
                                                                                      event
                                                                                          .target
                                                                                          .value
                                                                                  ),
                                                                              }
                                                                            : item
                                                                ),
                                                            })
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        ))}
                                        <h3>
                                            {preview?.translationTitle ??
                                                "Select a verse"}{" "}
                                            background
                                        </h3>
                                        <label>
                                            Background color
                                            <input
                                                type="color"
                                                disabled={!preview}
                                                value={
                                                    draft.backgrounds[
                                                        preview?.translationId ??
                                                            ""
                                                    ]?.color ?? "#111820"
                                                }
                                                onChange={(event) =>
                                                    updateBackground({
                                                        color: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <div className="background-tools">
                                            <button
                                                type="button"
                                                className="button"
                                                disabled={
                                                    !preview || backgroundBusy
                                                }
                                                onClick={() =>
                                                    void attempt(
                                                        chooseBackground
                                                    )
                                                }
                                            >
                                                {backgroundBusy
                                                    ? "Loading image…"
                                                    : "Choose image"}
                                            </button>
                                            <select
                                                aria-label="Background fit"
                                                disabled={!preview}
                                                value={
                                                    draft.backgrounds[
                                                        preview?.translationId ??
                                                            ""
                                                    ]?.fit ?? "fill"
                                                }
                                                onChange={(event) =>
                                                    updateBackground({
                                                        fit: event.target
                                                            .value as
                                                            | "fill"
                                                            | "fit",
                                                    })
                                                }
                                            >
                                                <option value="fill">
                                                    Fill / crop
                                                </option>
                                                <option value="fit">Fit</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-button"
                                            disabled={!preview}
                                            onClick={() =>
                                                updateBackground({
                                                    image: undefined,
                                                    fit: "fill",
                                                })
                                            }
                                        >
                                            Remove image
                                        </button>
                                    </div>
                                    <div className="appearance-preview">
                                        <VerseSlide
                                            selection={preview}
                                            appearance={draft}
                                        />
                                        <p>
                                            Private preview · reference and
                                            translation labels use fixed styles.
                                        </p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="button"
                                        onClick={closeDialog}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="button primary"
                                        disabled={backgroundBusy}
                                        onClick={() => {
                                            if (
                                                draft.bands.some(
                                                    (band, i) =>
                                                        !Number.isFinite(
                                                            band.max
                                                        ) ||
                                                        band.max < 1 ||
                                                        !Number.isFinite(
                                                            band.size
                                                        ) ||
                                                        band.size < 16 ||
                                                        band.size > 160 ||
                                                        (i > 0 &&
                                                            band.max <=
                                                                draft.bands[
                                                                    i - 1
                                                                ].max)
                                                )
                                            ) {
                                                setMessage(
                                                    "Size bands need increasing positive limits and sizes between 16 and 160px."
                                                );
                                                return;
                                            }
                                            void attempt(applyAppearance);
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </>
                        )}
                        {modal === "library" && (
                            <>
                                <p className="subtle">
                                    Local SQLite imports. Installed entries
                                    retain identity through replacement and
                                    restoration.
                                </p>
                                <div className="library-list">
                                    {library.map((item) => (
                                        <div
                                            className="library-row"
                                            key={item.id}
                                        >
                                            <div>
                                                <strong>
                                                    {item.title}
                                                    <span className="count-badge">
                                                        {item.bundled
                                                            ? "Bundled"
                                                            : item.available
                                                              ? item.abbreviation
                                                              : "Removed"}
                                                    </span>
                                                </strong>
                                                <small>
                                                    {item.verses.length.toLocaleString()}{" "}
                                                    verses · {item.books.length}{" "}
                                                    books
                                                    {item.description
                                                        ? ` · ${item.description}`
                                                        : ""}
                                                </small>
                                            </div>
                                            {!item.bundled &&
                                                item.available && (
                                                    <button
                                                        type="button"
                                                        className="text-button"
                                                        disabled={
                                                            anyAudienceOpen ||
                                                            busy
                                                        }
                                                        onClick={() =>
                                                            void attempt(() =>
                                                                startImport(
                                                                    item.id
                                                                )
                                                            )
                                                        }
                                                    >
                                                        Replace
                                                    </button>
                                                )}
                                            {!item.bundled &&
                                                item.available && (
                                                    <button
                                                        type="button"
                                                        className="text-button"
                                                        disabled={
                                                            anyAudienceOpen
                                                        }
                                                        onClick={() =>
                                                            setConfirmation({
                                                                text: `Remove ${item.title}? Queue references remain unavailable until explicit restoration. History saved copies stay usable.`,
                                                                run: async () => {
                                                                    setLibrary(
                                                                        await removeTranslation(
                                                                            item.id,
                                                                            true
                                                                        )
                                                                    );
                                                                    setResults(
                                                                        []
                                                                    );
                                                                    setSubmitted(
                                                                        null
                                                                    );
                                                                },
                                                            })
                                                        }
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="button primary"
                                    disabled={busy}
                                    onClick={() =>
                                        void attempt(() => startImport())
                                    }
                                >
                                    <Icon name="plus" size={16} />
                                    {busy
                                        ? "Validating…"
                                        : "Import SQLite Bible"}
                                </button>
                                {anyAudienceOpen && (
                                    <p className="subtle">
                                        Add is available. Close every audience
                                        before replacing or removing
                                        translations.
                                    </p>
                                )}
                                {review && (
                                    <div className="import-review">
                                        <h3>Review import</h3>
                                        {review.translations.map((item) => (
                                            <div
                                                className="import-row"
                                                key={item.id}
                                            >
                                                <strong>{item.title}</strong>
                                                <span>
                                                    {item.books.length} books ·{" "}
                                                    {item.verses.length.toLocaleString()}{" "}
                                                    verses
                                                </span>
                                                <select
                                                    aria-label={`Import action for ${item.title}`}
                                                    value={(() => {
                                                        const choice =
                                                            choices.find(
                                                                (row) =>
                                                                    row.sourceId ===
                                                                    item.id
                                                            );
                                                        return choice?.targetId
                                                            ? `${choice.action}:${choice.targetId}`
                                                            : (choice?.action ??
                                                                  "skip");
                                                    })()}
                                                    onChange={(event) =>
                                                        changeChoice(
                                                            item.id,
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="skip">
                                                        Skip
                                                    </option>
                                                    <option value="add">
                                                        Add separate entry
                                                    </option>
                                                    {library
                                                        .filter(
                                                            (existing) =>
                                                                !existing.bundled &&
                                                                existing.available
                                                        )
                                                        .map((existing) => (
                                                            <option
                                                                key={
                                                                    existing.id
                                                                }
                                                                value={`replace:${existing.id}`}
                                                                disabled={
                                                                    anyAudienceOpen
                                                                }
                                                            >
                                                                Replace{" "}
                                                                {existing.title}{" "}
                                                                (
                                                                {
                                                                    existing.abbreviation
                                                                }
                                                                )
                                                            </option>
                                                        ))}
                                                    {library
                                                        .filter(
                                                            (existing) =>
                                                                !existing.bundled &&
                                                                !existing.available
                                                        )
                                                        .map((existing) => (
                                                            <option
                                                                key={
                                                                    existing.id
                                                                }
                                                                value={`restore:${existing.id}`}
                                                                disabled={
                                                                    anyAudienceOpen
                                                                }
                                                            >
                                                                Restore{" "}
                                                                {existing.title}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        ))}
                                        <div className="modal-footer">
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => setReview(null)}
                                            >
                                                Cancel import
                                            </button>
                                            <button
                                                type="button"
                                                className="button primary"
                                                disabled={
                                                    busy ||
                                                    (anyAudienceOpen &&
                                                        choices.some(
                                                            (choice) =>
                                                                choice.action ===
                                                                    "replace" ||
                                                                choice.action ===
                                                                    "restore"
                                                        ))
                                                }
                                                onClick={() => {
                                                    if (
                                                        choices.some(
                                                            (item) =>
                                                                item.action ===
                                                                    "replace" ||
                                                                item.action ===
                                                                    "restore"
                                                        )
                                                    )
                                                        setConfirmation({
                                                            text: "Confirm the reviewed replacements/restorations? Installed entry identities stay the same. Queue references use the new edition; captured preview and history retain their original wording. Every audience must be closed.",
                                                            run: install,
                                                        });
                                                    else void attempt(install);
                                                }}
                                            >
                                                Accept import
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {modal === "information" && (
                            <div className="book-information">
                                <h3>
                                    {informationBook?.name ??
                                        preview?.bookName ??
                                        "Select a verse first"}
                                </h3>
                                {informationBook?.information ? (
                                    <dl>
                                        {(
                                            [
                                                "author",
                                                "date",
                                                "location",
                                                "source",
                                            ] as const
                                        ).map((key) => (
                                            <div key={key}>
                                                <dt>{key}</dt>
                                                <dd>
                                                    {informationBook
                                                        .information?.[key] ??
                                                        "Information unavailable"}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <p>Information unavailable</p>
                                )}
                            </div>
                        )}
                        {modal === "help" && (
                            <>
                                <div className="shortcut-list">
                                    <span>
                                        Translation selection<kbd>F1</kbd>
                                    </span>
                                    <span>
                                        Word search<kbd>F3</kbd>
                                    </span>
                                    <span>
                                        Book information<kbd>F7</kbd>
                                    </span>
                                    <span>
                                        Send private preview live
                                        <kbd>Ctrl / ⌘ + Enter</kbd>
                                    </span>
                                </div>
                                <div className="native-controls">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={fullscreen}
                                            disabled={!audienceOpen}
                                            onChange={(event) => {
                                                const value =
                                                    event.target.checked;
                                                void attempt(async () => {
                                                    await setAudienceFullscreen(
                                                        workspaceId,
                                                        value
                                                    );
                                                    setFullscreen(value);
                                                });
                                            }}
                                        />
                                        Audience fullscreen
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={top}
                                            onChange={(event) => {
                                                const value =
                                                    event.target.checked;
                                                void attempt(async () => {
                                                    await setOperatorOnTop(
                                                        value
                                                    );
                                                    setTop(value);
                                                });
                                            }}
                                        />
                                        Operator always on top
                                    </label>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={!audienceOpen}
                                        onClick={() =>
                                            void attempt(() =>
                                                setCursorRestriction(
                                                    workspaceId,
                                                    !restricted
                                                ).then(() =>
                                                    setRestricted(!restricted)
                                                )
                                            )
                                        }
                                    >
                                        <Icon name="pointer" size={15} />
                                        {restricted
                                            ? "Release cursor"
                                            : "Restrict cursor"}
                                    </button>
                                    <p className="subtle">
                                        Move Audience with your operating
                                        system’s extended desktop, then enter
                                        fullscreen. Cursor restriction requires
                                        native platform qualification;
                                        unsupported configurations show
                                        feedback.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="button"
                                        onClick={() => setModal(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
            {confirmation && (
                <div className="modal-backdrop confirmation-backdrop">
                    <section
                        className="modal confirmation"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="Confirm action"
                    >
                        <h2>Confirm action</h2>
                        <p>{confirmation.text}</p>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="button"
                                onClick={() => setConfirmation(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="button primary"
                                onClick={() => {
                                    const action = confirmation.run;
                                    setConfirmation(null);
                                    void attempt(async () => {
                                        await action();
                                    });
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}

function Highlighted({ result }: { result: SearchResult }) {
    const fragments = [];
    let start = 0;
    for (const highlight of result.highlights) {
        if (highlight.start > start)
            fragments.push(
                <span key={`text-${start}`}>
                    {result.selection.text.slice(start, highlight.start)}
                </span>
            );
        fragments.push(
            <mark key={`match-${highlight.start}`}>
                {result.selection.text.slice(highlight.start, highlight.end)}
            </mark>
        );
        start = highlight.end;
    }
    fragments.push(
        <span key={`tail-${start}`}>{result.selection.text.slice(start)}</span>
    );
    return <>{fragments}</>;
}
