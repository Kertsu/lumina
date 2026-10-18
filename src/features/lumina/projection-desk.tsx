import { arrayMove } from "@dnd-kit/sortable";
import { useHotkey, useHotkeys } from "@tanstack/react-hotkeys";
import { isTauri } from "@tauri-apps/api/core";
import {
    BookOpen,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    Info,
    Keyboard,
    Maximize2,
    Monitor,
    Palette,
    PanelLeft,
    PanelTop,
    PanelRightClose,
    Plus,
    Radio,
    Send,
    X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppearanceDialog } from "./appearance-dialog";
import type { TranslationId, Verse } from "./fixtures";
import { bookMetadata, referenceLabel, translations, verses } from "./fixtures";
import { LibraryDialog } from "./library-dialog";
import type { Workspace } from "./model";
import {
    createWorkspace,
    displayVerse,
    getAdjacentVerse,
    getBand,
    resolveReference,
} from "./model";
import { SidePanel } from "./side-panel";
import { useNativeTabShortcuts } from "./use-native-tab-shortcuts";
import { useWorkspaces } from "./use-workspaces";
import { VerseSlide } from "./verse-slide";
import { WorkspaceSearch } from "./workspace-search";
import { WorkspaceTabs } from "./workspace-tabs";

function IconButton({
    label,
    children,
    onClick,
    active = false,
}: {
    label: string;
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={active ? "tool-active" : ""}
                    aria-label={label}
                    onClick={onClick}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

export function ProjectionDesk() {
    const {
        workspaces,
        setWorkspaces,
        activeId,
        setActiveId,
        installed,
        setInstalled,
        storageError,
        updateWorkspace,
    } = useWorkspaces();
    const workspace =
        workspaces.find((item) => item.id === activeId) ?? workspaces[0];
    const [sidebar, setSidebar] = useState(false);
    useEffect(() => {
        setSidebar(window.innerWidth > 760);
    }, []);
    const [sideTab, setSideTab] = useState("search");
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [informationOpen, setInformationOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [translationOpen, setTranslationOpen] = useState(false);
    const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false);
    const [chapterView, setChapterView] = useState<"horizontal" | "sidebar">(
        "horizontal"
    );
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [rename, setRename] = useState("");
    const [reference, setReference] = useState("");
    const [referenceError, setReferenceError] = useState("");
    const [notification, setNotification] = useState("");
    const [informationBook, setInformationBook] = useState("John");
    const [infoSources, setInfoSources] = useState<Record<string, Verse>>({});
    const audienceWindows = useRef(new Map<string, Window>());
    const referenceInput = useRef<HTMLInputElement>(null);
    const selectedThumbnail = useRef<HTMLButtonElement>(null);
    const filmstrip = useRef<HTMLDivElement>(null);
    const referenceErrorId = useId();
    const workspaceNameId = useId();
    const searchInput = useRef<HTMLInputElement>(null);
    const notify = (message: string) => setNotification(message);
    const patch = (value: Partial<Workspace>) =>
        updateWorkspace(activeId, (previous) => ({
            ...previous,
            ...value,
        }));
    const isInstalled = (verse: Verse) => installed.includes(verse.translation);
    const selectVerse = (verse: Verse, action = "Selected verse") =>
        updateWorkspace(activeId, (previous) =>
            displayVerse(previous, verse, action)
        );
    const previewVerse = (verse: Verse) =>
        patch({
            preview: verse,
        });
    const sendLive = (verse: Verse) => {
        if (!workspace || workspace.status === "closed") {
            notify("Open this audience before sending a verse live.");
            return;
        }
        updateWorkspace(activeId, (previous) => ({
            ...displayVerse(previous, verse, "Sent Live"),
            preview: null,
        }));
        setReferenceError("");
        notify(`${referenceLabel(verse)} sent to ${workspace.name}`);
    };
    const navigate = (direction: -1 | 1) => {
        if (!workspace?.current || !isInstalled(workspace.current)) return;
        const verse = getAdjacentVerse(workspace.current, direction);
        if (verse) selectVerse(verse, "Navigated");
    };
    const submitReference = (preview: boolean) => {
        if (!workspace) return;
        const result = resolveReference(reference, workspace.translation);
        if (!result.verse) {
            setReferenceError(
                result.error ?? "Enter a book, chapter, and verse."
            );
            return;
        }
        setReferenceError("");
        if (preview) previewVerse(result.verse);
        else sendLive(result.verse);
    };
    const toggleBlank = () => {
        if (!workspace || workspace.status === "closed") return;
        if (workspace.status === "blank") {
            if (workspace.current && !workspace.information)
                selectVerse(workspace.current, "Resumed");
            else if (workspace.information)
                patch({
                    status: "live",
                });
            else notify("Choose a verse before resuming this audience.");
        } else
            patch({
                status: "blank",
            });
    };
    const closeAudience = (id: string) => {
        audienceWindows.current.get(id)?.close();
        audienceWindows.current.delete(id);
        updateWorkspace(id, (previous) => ({
            ...previous,
            status: "closed",
        }));
    };
    const openAudience = () => {
        if (!workspace) return;
        const popup = window.open(
            `/audience?workspace=${encodeURIComponent(workspace.id)}`,
            `lumina-${workspace.id}`,
            "popup,width=1280,height=720"
        );
        if (!popup) {
            notify("Audience could not open. Allow popups, then try again.");
            return;
        }
        audienceWindows.current.set(workspace.id, popup);
        patch({
            status: "blank",
        });
        notify("Audience opened blank. Resume or send a verse when ready.");
    };
    const addWorkspace = () => {
        const index =
            Math.max(
                0,
                ...workspaces.map(
                    (item) =>
                        Number(item.name.match(/^Audience (\d+)$/)?.[1]) || 0
                )
            ) + 1;
        const next = createWorkspace(index);
        setWorkspaces((previous) => [...previous, next]);
        setActiveId(next.id);
        setReference("");
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: A workspace switch resets its quick-entry field.
    useEffect(() => {
        setReference("");
        setReferenceError("");
    }, [activeId]);
    useEffect(() => {
        if (!notification) return;
        const timeout = window.setTimeout(() => setNotification(""), 4500);
        return () => window.clearTimeout(timeout);
    }, [notification]);
    const currentId = workspace?.current?.id;
    useEffect(() => {
        const strip = filmstrip.current;
        const selected = selectedThumbnail.current;
        if (currentId && strip && selected) {
            const stripBounds = strip.getBoundingClientRect();
            const selectedBounds = selected.getBoundingClientRect();
            strip.scrollTo({
                left:
                    chapterView === "horizontal"
                        ? strip.scrollLeft +
                          selectedBounds.left -
                          stripBounds.left -
                          strip.clientWidth / 2 +
                          selected.clientWidth / 2
                        : strip.scrollLeft,
                top:
                    chapterView === "sidebar"
                        ? strip.scrollTop +
                          selectedBounds.top -
                          stripBounds.top -
                          strip.clientHeight / 2 +
                          selected.clientHeight / 2
                        : strip.scrollTop,
                behavior: "instant",
            });
        }
    }, [chapterView, currentId]);
    useEffect(() => {
        for (const item of workspaces) {
            try {
                localStorage.setItem(
                    `lumina-output-${item.id}`,
                    JSON.stringify({
                        current: item.information
                            ? (infoSources[item.id] ?? item.current)
                            : item.current,
                        appearance: item.appearance,
                        information: item.information,
                        hideCursor: item.hideCursor,
                        status: item.status,
                    })
                );
            } catch {
                /* The operator remains usable if local storage is full. */
            }
        }
    }, [workspaces, infoSources]);
    useEffect(() => {
        const timer = window.setInterval(() => {
            for (const [id, popup] of audienceWindows.current) {
                if (popup.closed) {
                    audienceWindows.current.delete(id);
                    updateWorkspace(id, (previous) => ({
                        ...previous,
                        status: "closed",
                    }));
                }
            }
        }, 500);
        const closeOutputs = () => {
            for (const popup of audienceWindows.current.values()) popup.close();
        };
        window.addEventListener("beforeunload", closeOutputs);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("beforeunload", closeOutputs);
            closeOutputs();
        };
    }, [updateWorkspace]);

    const dialogOpen = Boolean(
        workspaceSearchOpen ||
            appearanceOpen ||
            informationOpen ||
            helpOpen ||
            libraryOpen ||
            renameId ||
            removeId ||
            workspace?.preview
    );
    const canNavigate = () =>
        !document.querySelector(
            '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]'
        ) && document.activeElement?.getAttribute("role") !== "tab";
    const requestCloseTab = () => {
        if (dialogOpen || !workspace) return;
        if (workspaces.length === 1) {
            notify("Keep at least one workspace open.");
            return;
        }
        setRemoveId(workspace.id);
    };
    const requestNewTab = () => {
        if (!dialogOpen) addWorkspace();
    };
    useNativeTabShortcuts(requestCloseTab, requestNewTab, () =>
        notify("Desktop tab shortcuts unavailable. Use the tab controls.")
    );
    useHotkeys(
        ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((number) => ({
            hotkey: `Mod+${number}` as const,
            callback: () => {
                if (dialogOpen) return;
                const target =
                    number === 9 ? workspaces.at(-1) : workspaces[number - 1];
                if (target) setActiveId(target.id);
            },
            options: {
                requireReset: true,
            },
        })),
        {
            ignoreInputs: false,
            preventDefault: true,
            stopPropagation: true,
            capture: true,
        }
    );
    useHotkey("Mod+T", requestNewTab, {
        enabled: typeof window !== "undefined" && !isTauri(),
        ignoreInputs: false,
        preventDefault: true,
        stopPropagation: true,
        requireReset: true,
        capture: true,
    });
    useHotkey("Mod+W", requestCloseTab, {
        enabled: typeof window !== "undefined" && !isTauri(),
        ignoreInputs: false,
        preventDefault: true,
        stopPropagation: true,
        requireReset: true,
        capture: true,
    });
    useHotkey("Mod+Shift+A", () => setWorkspaceSearchOpen((open) => !open), {
        enabled: !dialogOpen || workspaceSearchOpen,
        ignoreInputs: false,
        preventDefault: true,
        stopPropagation: true,
        requireReset: true,
        capture: true,
    });
    useHotkey("F1", () => setTranslationOpen(true), {
        enabled: !dialogOpen,
        ignoreInputs: false,
    });
    useHotkey(
        "F3",
        () => {
            setSidebar(true);
            setSideTab("search");
            window.setTimeout(() => searchInput.current?.focus(), 50);
        },
        {
            enabled: !dialogOpen,
            ignoreInputs: false,
        }
    );
    useHotkey("F7", () => setInformationOpen(true), {
        enabled: !dialogOpen,
        ignoreInputs: false,
    });
    useHotkey("Mod+K", () => referenceInput.current?.focus(), {
        enabled: !dialogOpen,
        ignoreInputs: false,
    });
    useHotkey(
        "Mod+Enter",
        () => {
            if (workspace?.preview) sendLive(workspace.preview);
            else if (!dialogOpen) submitReference(false);
        },
        {
            ignoreInputs: false,
        }
    );
    useHotkey(
        "ArrowLeft",
        () => {
            if (canNavigate()) navigate(-1);
        },
        {
            enabled:
                !appearanceOpen &&
                !informationOpen &&
                !workspace?.preview &&
                !helpOpen &&
                !libraryOpen &&
                !renameId,
        }
    );
    useHotkey(
        "ArrowRight",
        () => {
            if (canNavigate()) navigate(1);
        },
        {
            enabled:
                !appearanceOpen &&
                !informationOpen &&
                !workspace?.preview &&
                !helpOpen &&
                !libraryOpen &&
                !renameId,
        }
    );
    useHotkey(
        "B",
        () => {
            if (canNavigate()) toggleBlank();
        },
        {
            enabled:
                !appearanceOpen &&
                !informationOpen &&
                !workspace?.preview &&
                !helpOpen &&
                !libraryOpen &&
                !renameId,
        }
    );

    if (!workspace)
        return (
            <div className="startup">
                <img src="/lumina-mark.svg" alt="" />
                <span>Lumina</span>
            </div>
        );
    const current = workspace.current;
    const translation = translations.find(
        (item) => item.id === workspace.translation
    );
    const chapterVerses =
        current && isInstalled(current)
            ? verses.filter(
                  (verse) =>
                      verse.translation === current.translation &&
                      verse.book === current.book &&
                      verse.chapter === current.chapter
              )
            : [];
    const band = current ? getBand(current, workspace.appearance) : undefined;
    const metadataSource =
        current ??
        verses.find(
            (verse) =>
                verse.book === informationBook &&
                verse.translation === workspace.translation
        ) ??
        null;
    const metadata = metadataSource
        ? bookMetadata[metadataSource.book]
        : undefined;
    const savedCopy = current && !isInstalled(current);
    const changeTranslation = (id: TranslationId) => {
        if (!current) return;
        const verse = verses.find(
            (item) =>
                item.bookId === current.bookId &&
                item.chapter === current.chapter &&
                item.verse === current.verse &&
                item.translation === id
        );
        if (verse) selectVerse(verse, "Changed translation");
        else
            notify(
                "This reference is unavailable in that translation’s fixture. Current content is preserved."
            );
    };
    const moveWorkspace = (id: string, direction: -1 | 1) =>
        setWorkspaces((previous) => {
            const index = previous.findIndex((item) => item.id === id);
            const target = index + direction;
            if (target < 0 || target >= previous.length) return previous;
            const next = [...previous];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    const chapterContent = chapterVerses.length ? (
        chapterVerses.map((verse) => (
            <button
                type="button"
                key={verse.id}
                ref={verse.id === current?.id ? selectedThumbnail : undefined}
                className={`verse-thumbnail ${verse.id === current?.id ? "selected" : ""}`}
                aria-label={`Display ${referenceLabel(verse)}`}
                aria-pressed={verse.id === current?.id}
                onClick={() => selectVerse(verse)}
            >
                <VerseSlide
                    miniature
                    verse={verse}
                    appearance={workspace.appearance}
                />
                <div className="thumbnail-caption">
                    <span>{referenceLabel(verse)}</span>
                    {verse.id === current?.id && <Radio />}
                </div>
            </button>
        ))
    ) : (
        <div className="chapter-empty">
            <BookOpen />
            <span>
                {savedCopy
                    ? "Reinstall the original edition to navigate this saved copy."
                    : "Select a verse to see the rest of its chapter."}
            </span>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    setReference("John 3:16");
                    referenceInput.current?.focus();
                }}
            >
                Try John 3:16
            </Button>
        </div>
    );
    return (
        <TooltipProvider delayDuration={350}>
            <Tabs
                value={activeId}
                onValueChange={setActiveId}
                className="projection-desk gap-0"
            >
                <div className="workspace-bar">
                    <WorkspaceTabs
                        workspaces={workspaces}
                        activeId={activeId}
                        onReorder={(sourceId, targetId) =>
                            setWorkspaces((previous) => {
                                const source = previous.findIndex(
                                    (item) => item.id === sourceId
                                );
                                const target = previous.findIndex(
                                    (item) => item.id === targetId
                                );
                                return source < 0 || target < 0
                                    ? previous
                                    : arrayMove(previous, source, target);
                            })
                        }
                        onRename={(item) => {
                            setRenameId(item.id);
                            setRename(item.name);
                        }}
                        onMove={moveWorkspace}
                        onClose={setRemoveId}
                    />
                    <IconButton label="Add workspace" onClick={addWorkspace}>
                        <Plus />
                    </IconButton>
                    <WorkspaceSearch
                        workspaces={workspaces}
                        activeId={activeId}
                        open={workspaceSearchOpen}
                        onOpenChange={setWorkspaceSearchOpen}
                        onSelect={setActiveId}
                    />
                </div>
                <header className="main-toolbar">
                    <a href="/" className="brand" aria-label="Lumina home">
                        <img src="/lumina-mark.svg" alt="" />
                        <div>
                            <span>Lumina</span>
                            <small>Scripture, in the room.</small>
                        </div>
                    </a>
                    <div className="toolbar-divider" />
                    <Select
                        open={translationOpen}
                        onOpenChange={setTranslationOpen}
                        value={workspace.translation}
                        onValueChange={(id: TranslationId) =>
                            patch({
                                translation: id,
                                submittedQuery: "",
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            className="translation-picker"
                            aria-label="Lookup translation"
                        >
                            <BookOpen />
                            <SelectValue />
                            <kbd>F1</kbd>
                        </SelectTrigger>
                        <SelectContent>
                            {translations
                                .filter((item) => installed.includes(item.id))
                                .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <div className="toolbar-spacer" />
                    <div className="audience-controls">
                        <span className="controlled-workspace">
                            {workspace.name}
                        </span>
                        <Button
                            variant={
                                workspace.status === "closed"
                                    ? "secondary"
                                    : "outline"
                            }
                            className="audience-button"
                            onClick={() =>
                                workspace.status === "closed"
                                    ? openAudience()
                                    : closeAudience(workspace.id)
                            }
                        >
                            <Monitor />
                            {workspace.status === "closed"
                                ? "Open Audience"
                                : "Close Audience"}
                        </Button>
                        <Button
                            variant="outline"
                            className={`blank-button ${workspace.status === "blank" ? "is-blank" : ""}`}
                            disabled={workspace.status === "closed"}
                            onClick={toggleBlank}
                        >
                            {workspace.status === "blank" ? (
                                <Eye />
                            ) : (
                                <EyeOff />
                            )}
                            {workspace.status === "blank" ? "Resume" : "Blank"}
                            <kbd>B</kbd>
                        </Button>
                    </div>
                    <div className="toolbar-divider" />
                    <div className="toolbar-tools">
                        <IconButton
                            label="Appearance"
                            onClick={() => setAppearanceOpen(true)}
                        >
                            <Palette />
                        </IconButton>
                        <IconButton
                            label="Book information · F7"
                            onClick={() => setInformationOpen(true)}
                            active={workspace.information}
                        >
                            <Info />
                        </IconButton>
                        <IconButton
                            label="Bible library"
                            onClick={() => setLibraryOpen(true)}
                        >
                            <BookOpen />
                        </IconButton>
                        <IconButton
                            label="Keyboard shortcuts"
                            onClick={() => setHelpOpen(true)}
                        >
                            <Keyboard />
                        </IconButton>
                    </div>
                </header>
                <TabsContent value={activeId} className="desk-body">
                    <main className="operator-content">
                        <div className="stage-heading">
                            <div>
                                <span
                                    className={`stage-dot ${workspace.status === "live" ? "live" : ""}`}
                                />
                                <h1>Current verse</h1>
                                {workspace.information && (
                                    <span className="info-badge">
                                        Book information on audience
                                    </span>
                                )}
                            </div>
                            <div className="stage-heading-right">
                                {workspace.status !== "closed" && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon-sm"
                                            >
                                                <a
                                                    href={`/audience?workspace=${encodeURIComponent(workspace.id)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label="View audience output"
                                                >
                                                    <Monitor />
                                                </a>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            View audience output
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                <span>
                                    {workspace.status === "closed"
                                        ? "Audience closed"
                                        : workspace.status === "blank"
                                          ? "Audience is blank"
                                          : "Audience is live"}
                                </span>
                                <IconButton
                                    label={
                                        sidebar
                                            ? "Hide search and history"
                                            : "Open search and history"
                                    }
                                    onClick={() => setSidebar(!sidebar)}
                                >
                                    <PanelRightClose
                                        className={!sidebar ? "rotate-180" : ""}
                                    />
                                </IconButton>
                            </div>
                        </div>
                        <div
                            className={`projection-workspace ${chapterView === "sidebar" ? "is-sidebar" : ""}`}
                        >
                            <div className="projection-main">
                                <section
                                    className="projection-stage"
                                    aria-label="Current verse projection"
                                >
                                    <div className="stage-canvas">
                                        <VerseSlide
                                            verse={current}
                                            appearance={workspace.appearance}
                                        />
                                    </div>
                                    <div className="stage-bottom">
                                        <span>
                                            <Monitor />
                                            {workspace.information
                                                ? "Retained verse"
                                                : workspace.status === "live"
                                                  ? "On audience"
                                                  : "Retained verse"}
                                            <span className="stage-aspect">
                                                16:9
                                            </span>
                                        </span>
                                        <div>
                                            <IconButton
                                                label="Copy current verse"
                                                onClick={() => {
                                                    if (!current) return;
                                                    void navigator.clipboard
                                                        .writeText(
                                                            `${current.text}\n${referenceLabel(current)} — ${translations.find((item) => item.id === current.translation)?.name}`
                                                        )
                                                        .then(
                                                            () =>
                                                                notify(
                                                                    "Verse copied"
                                                                ),
                                                            () =>
                                                                notify(
                                                                    "Clipboard unavailable. Try copying from the verse preview."
                                                                )
                                                        );
                                                }}
                                            >
                                                <Copy />
                                            </IconButton>
                                            <IconButton
                                                label="Inspect current slide"
                                                onClick={() => {
                                                    if (current)
                                                        previewVerse(current);
                                                }}
                                            >
                                                <Maximize2 />
                                            </IconButton>
                                        </div>
                                    </div>
                                </section>
                                <div className="current-details">
                                    <div>
                                        <div className="reference-heading">
                                            <h2>
                                                {current
                                                    ? referenceLabel(current)
                                                    : "Ready when you are."}
                                            </h2>
                                            {savedCopy && (
                                                <span className="info-badge">
                                                    Saved copy
                                                </span>
                                            )}
                                        </div>
                                        <p>
                                            {current ? (
                                                <>
                                                    {current.text.length}{" "}
                                                    characters
                                                    <span className="detail-dot" />
                                                    {band?.size}px size band
                                                    <span className="detail-dot" />
                                                    {
                                                        translations.find(
                                                            (item) =>
                                                                item.id ===
                                                                current.translation
                                                        )?.name
                                                    }
                                                </>
                                            ) : (
                                                "Find a reference or search the words you remember."
                                            )}
                                        </p>
                                    </div>
                                    <div className="current-actions">
                                        <Select
                                            value={
                                                current?.translation ??
                                                workspace.translation
                                            }
                                            onValueChange={(
                                                id: TranslationId
                                            ) => changeTranslation(id)}
                                            disabled={!current}
                                        >
                                            <SelectTrigger
                                                aria-label="Change current verse translation"
                                                className="current-translation"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {translations
                                                    .filter((item) =>
                                                        installed.includes(
                                                            item.id
                                                        )
                                                    )
                                                    .map((item) => (
                                                        <SelectItem
                                                            key={item.id}
                                                            value={item.id}
                                                        >
                                                            {item.shortName}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="navigation-pair">
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    !current ||
                                                    !isInstalled(current) ||
                                                    !getAdjacentVerse(
                                                        current,
                                                        -1
                                                    )
                                                }
                                                onClick={() => navigate(-1)}
                                            >
                                                <ChevronLeft />
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    !current ||
                                                    !isInstalled(current) ||
                                                    !getAdjacentVerse(
                                                        current,
                                                        1
                                                    )
                                                }
                                                onClick={() => navigate(1)}
                                            >
                                                Next
                                                <ChevronRight />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <section
                                className={`chapter-section ${chapterView === "sidebar" ? "is-sidebar" : ""}`}
                                aria-label="Chapter verses"
                            >
                                <div className="chapter-heading">
                                    <div className="chapter-heading-title">
                                        <BookOpen />
                                        <div className="chapter-heading-copy">
                                            <h3>
                                                {current
                                                    ? `${current.book} ${current.chapter}`
                                                    : "Explore a chapter"}
                                            </h3>
                                            <span>
                                                {chapterVerses.length
                                                    ? `${chapterVerses.length} verses`
                                                    : "Fixture library"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="chapter-heading-actions">
                                        <span className="filmstrip-hint">
                                            Select a verse to display
                                        </span>
                                        <div
                                            className="chapter-view-toggle"
                                            role="group"
                                            aria-label="Verse strip layout"
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className={
                                                            chapterView ===
                                                            "horizontal"
                                                                ? "is-selected"
                                                                : ""
                                                        }
                                                        aria-label="Horizontal verse strip"
                                                        aria-pressed={
                                                            chapterView ===
                                                            "horizontal"
                                                        }
                                                        onClick={() =>
                                                            setChapterView(
                                                                "horizontal"
                                                            )
                                                        }
                                                    >
                                                        <PanelTop />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Horizontal strip
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className={
                                                            chapterView ===
                                                            "sidebar"
                                                                ? "is-selected"
                                                                : ""
                                                        }
                                                        aria-label="Sidebar verse strip"
                                                        aria-pressed={
                                                            chapterView ===
                                                            "sidebar"
                                                        }
                                                        onClick={() =>
                                                            setChapterView(
                                                                "sidebar"
                                                            )
                                                        }
                                                    >
                                                        <PanelLeft />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Left sidebar
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="chapter-scroll-controls">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={
                                                    chapterView === "sidebar"
                                                        ? "Scroll verses up"
                                                        : "Scroll verses left"
                                                }
                                                onClick={() =>
                                                    filmstrip.current?.scrollBy(
                                                        {
                                                            left:
                                                                chapterView ===
                                                                "horizontal"
                                                                    ? -450
                                                                    : 0,
                                                            top:
                                                                chapterView ===
                                                                "sidebar"
                                                                    ? -300
                                                                    : 0,
                                                            behavior: "smooth",
                                                        }
                                                    )
                                                }
                                            >
                                                {chapterView === "sidebar" ? (
                                                    <ChevronUp />
                                                ) : (
                                                    <ChevronLeft />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={
                                                    chapterView === "sidebar"
                                                        ? "Scroll verses down"
                                                        : "Scroll verses right"
                                                }
                                                onClick={() =>
                                                    filmstrip.current?.scrollBy(
                                                        {
                                                            left:
                                                                chapterView ===
                                                                "horizontal"
                                                                    ? 450
                                                                    : 0,
                                                            top:
                                                                chapterView ===
                                                                "sidebar"
                                                                    ? 300
                                                                    : 0,
                                                            behavior: "smooth",
                                                        }
                                                    )
                                                }
                                            >
                                                {chapterView === "sidebar" ? (
                                                    <ChevronDown />
                                                ) : (
                                                    <ChevronRight />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {chapterView === "sidebar" ? (
                                    <ScrollArea
                                        className="chapter-sidebar-scroll"
                                        viewportRef={filmstrip}
                                        viewportClassName="chapter-sidebar-viewport"
                                    >
                                        <div className="chapter-sidebar-items">
                                            {chapterContent}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div
                                        className="chapter-filmstrip"
                                        ref={filmstrip}
                                    >
                                        {chapterContent}
                                    </div>
                                )}
                            </section>
                        </div>
                        <div className="workspace-footer">
                            <span>
                                <span className="offline-dot" />
                                All local. Ready for your gathering.
                            </span>
                            <button
                                type="button"
                                onClick={() => setLibraryOpen(true)}
                            >
                                Demo Bible library
                                <ChevronDown />
                            </button>
                        </div>
                    </main>
                    {sidebar && (
                        <SidePanel
                            key={workspace.id}
                            workspace={workspace}
                            searchInputRef={searchInput}
                            tab={sideTab}
                            onTab={setSideTab}
                            onChange={patch}
                            onPreview={previewVerse}
                            onSend={sendLive}
                            onRecall={(verse) =>
                                selectVerse(verse, "Recalled history")
                            }
                            onClose={() => setSidebar(false)}
                            onNotify={notify}
                        />
                    )}
                </TabsContent>
                <footer className="quick-reference-bar">
                    <div className="quick-reference-label">
                        <BookOpen />
                        <span>Quick reference</span>
                        <kbd>⌘ K</kbd>
                    </div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitReference(false);
                        }}
                    >
                        <div
                            className={`reference-input-wrap ${referenceError ? "has-error" : ""}`}
                        >
                            <input
                                ref={referenceInput}
                                aria-label="Quick reference"
                                aria-invalid={Boolean(referenceError)}
                                aria-describedby={
                                    referenceError
                                        ? "reference-error"
                                        : undefined
                                }
                                placeholder="Go to a verse… e.g. John 3:16 or Juan 3:16"
                                value={reference}
                                onChange={(event) => {
                                    setReference(event.target.value);
                                    setReferenceError("");
                                }}
                            />
                            <span>{translation?.shortName}</span>
                            {referenceError && (
                                <p
                                    id={referenceErrorId}
                                    className="reference-error"
                                    role="alert"
                                >
                                    {referenceError}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => submitReference(true)}
                        >
                            <Eye />
                            Check preview
                        </Button>
                        <Button type="submit">
                            <Send />
                            Send Live<kbd>↵</kbd>
                        </Button>
                    </form>
                    <span className="reference-bar-hint">
                        References only.
                        <br />
                        Enter sends live.
                    </span>
                </footer>
                {storageError && (
                    <div className="storage-warning" role="alert">
                        Storage is full. Changes work for this session but
                        cannot be saved. Try a smaller background image.
                    </div>
                )}
                {notification && (
                    <div className="desk-toast" role="status">
                        <Check />
                        <span>{notification}</span>
                        <button
                            type="button"
                            aria-label="Dismiss message"
                            onClick={() => setNotification("")}
                        >
                            <X />
                        </button>
                    </div>
                )}
            </Tabs>
            <AppearanceDialog
                open={appearanceOpen}
                onOpenChange={setAppearanceOpen}
                appearance={workspace.appearance}
                verse={current}
                translation={workspace.translation}
                onApply={(appearance) => {
                    patch({
                        appearance,
                    });
                    notify("Appearance applied to this workspace");
                }}
            />
            <LibraryDialog
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                installed={installed}
                audiencesOpen={workspaces.some(
                    (item) => item.status !== "closed"
                )}
                onRemove={(id) => {
                    setInstalled((previous) =>
                        previous.filter((item) => item !== id)
                    );
                    setWorkspaces((previous) =>
                        previous.map((item) =>
                            item.translation === id
                                ? {
                                      ...item,
                                      translation: "web",
                                      submittedQuery: "",
                                  }
                                : item
                        )
                    );
                    notify(
                        "Translation removed. Captured verses kept as saved copies."
                    );
                }}
                onAdd={() => {
                    if (!installed.includes("adb"))
                        setInstalled((previous) => [...previous, "adb"]);
                    notify(
                        installed.includes("adb")
                            ? "Exact duplicate skipped"
                            : "Ang Dating Biblia added to the library"
                    );
                }}
            />
            <Dialog
                open={Boolean(workspace.preview)}
                onOpenChange={(open) => {
                    if (!open)
                        patch({
                            preview: null,
                        });
                }}
            >
                <DialogContent className="preview-dialog sm:max-w-[820px]">
                    <DialogHeader>
                        <DialogTitle>
                            <Eye className="inline size-5 text-primary mr-2" />
                            Verse preview
                        </DialogTitle>
                        <DialogDescription>
                            Private to you. {workspace.name} keeps its current
                            output.
                        </DialogDescription>
                    </DialogHeader>
                    {workspace.preview && (
                        <>
                            <VerseSlide
                                verse={workspace.preview}
                                appearance={workspace.appearance}
                            />
                            <div className="preview-reference">
                                <span>{referenceLabel(workspace.preview)}</span>
                                <span>
                                    {
                                        translations.find(
                                            (item) =>
                                                item.id ===
                                                workspace.preview?.translation
                                        )?.name
                                    }
                                    {!isInstalled(workspace.preview) &&
                                        " · Saved copy"}
                                </span>
                            </div>
                        </>
                    )}
                    {workspace.status === "closed" && (
                        <p className="inline-error">
                            Audience closed. Dismiss this preview, open the
                            audience, then inspect and send when ready.
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() =>
                                patch({
                                    preview: null,
                                })
                            }
                        >
                            Dismiss
                        </Button>
                        <Button
                            onClick={() => {
                                if (workspace.preview)
                                    sendLive(workspace.preview);
                            }}
                        >
                            <Send />
                            Send Live<kbd>⌘ ↵</kbd>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={informationOpen} onOpenChange={setInformationOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Behind the passage</DialogTitle>
                        <DialogDescription>
                            Book information is private until you turn on its
                            audience display.
                        </DialogDescription>
                    </DialogHeader>
                    {!current && (
                        <Select
                            value={informationBook}
                            onValueChange={setInformationBook}
                        >
                            <SelectTrigger aria-label="Choose a book for information">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[
                                    ...new Set(
                                        verses
                                            .filter(
                                                (verse) =>
                                                    verse.translation ===
                                                    workspace.translation
                                            )
                                            .map((verse) => verse.book)
                                    ),
                                ].map((book) => (
                                    <SelectItem value={book} key={book}>
                                        {book}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <div className="book-info-heading">
                        <BookOpen />
                        <h3>{metadataSource?.book ?? "Choose a book"}</h3>
                    </div>
                    <dl className="book-metadata">
                        {(
                            [
                                ["Author", metadata?.author],
                                ["Written", metadata?.date],
                                ["Location", metadata?.location],
                            ] as const
                        ).map(([label, value]) => (
                            <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value || "Information unavailable"}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="metadata-attribution">
                        {metadata?.attribution ||
                            "No supplemental metadata in this translation’s fixture."}
                    </p>
                    {metadataSource &&
                        !isInstalled(metadataSource) &&
                        !workspace.information && (
                            <p className="subtle">
                                Reinstall the original translation edition to
                                display new book information.
                            </p>
                        )}
                    <div className="info-toggle-row">
                        <div>
                            <strong>Show on audience</strong>
                            <p>Keep the current verse for your return.</p>
                        </div>
                        <Switch
                            aria-label="Show book information on audience"
                            checked={workspace.information}
                            disabled={
                                !metadata ||
                                Boolean(
                                    metadataSource &&
                                        !workspace.information &&
                                        !isInstalled(metadataSource)
                                )
                            }
                            onCheckedChange={(information) => {
                                if (information && metadataSource)
                                    setInfoSources((previous) => ({
                                        ...previous,
                                        [workspace.id]: metadataSource,
                                    }));
                                if (
                                    !information &&
                                    workspace.current &&
                                    workspace.status === "live"
                                ) {
                                    updateWorkspace(activeId, (previous) => ({
                                        ...displayVerse(
                                            previous,
                                            workspace.current as Verse,
                                            "Restored verse"
                                        ),
                                        information: false,
                                    }));
                                } else
                                    patch({
                                        information,
                                    });
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInformationOpen(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle>Keep your hands on the keys</DialogTitle>
                        <DialogDescription>
                            A few shortcuts for a calmer gathering.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="shortcut-list">
                        {[
                            ["Choose translation", "F1"],
                            ["Find a verse", "F3"],
                            ["Book information", "F7"],
                            ["Quick reference", "⌘ / Ctrl K"],
                            ["New tab", "⌘ / Ctrl T"],
                            ["Select tab 1–8", "⌘ / Ctrl 1–8"],
                            ["Select last tab", "⌘ / Ctrl 9"],
                            ["Close current tab", "⌘ / Ctrl W"],
                            ["Search workspaces", "⌘ / Ctrl Shift A"],
                            ["Tab options", "Right-click / Shift F10"],
                            ["Send preview live", "⌘ / Ctrl ↵"],
                            ["Previous / next verse", "← / →"],
                            ["Blank / resume audience", "B"],
                        ].map(([label, key]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <kbd>{key}</kbd>
                            </div>
                        ))}
                    </div>
                    <div className="info-toggle-row">
                        <div>
                            <strong>Hide audience cursor</strong>
                            <p>Saved independently for {workspace.name}.</p>
                        </div>
                        <Switch
                            aria-label="Hide audience cursor"
                            checked={workspace.hideCursor}
                            onCheckedChange={(hideCursor) =>
                                patch({
                                    hideCursor,
                                })
                            }
                        />
                    </div>
                    <p className="subtle">
                        Audience popouts simulate the desktop experience. Native
                        display controls and SQLite processing are outside this
                        UI prototype.
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setHelpOpen(false)}
                        >
                            Got it
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(renameId)}
                onOpenChange={(open) => {
                    if (!open) setRenameId(null);
                }}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Name this workspace</DialogTitle>
                        <DialogDescription>
                            A useful name helps you control the right audience.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!rename.trim() || !renameId) return;
                            updateWorkspace(renameId, (previous) => ({
                                ...previous,
                                name: rename.trim(),
                            }));
                            setRenameId(null);
                        }}
                    >
                        <label className="sr-only" htmlFor={workspaceNameId}>
                            Workspace name
                        </label>
                        <input
                            className="text-input"
                            id={workspaceNameId}
                            value={rename}
                            onChange={(event) => setRename(event.target.value)}
                            maxLength={48}
                        />
                        <DialogFooter className="mt-5">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setRenameId(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!rename.trim()}>
                                Save name
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={Boolean(removeId)}
                onOpenChange={(open) => {
                    if (!open) setRemoveId(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Close{" "}
                            {workspaces.find((item) => item.id === removeId)
                                ?.name ?? "this tab"}
                            ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Its audience will close and its saved history and
                            appearance will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep tab</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!removeId || workspaces.length === 1)
                                    return;
                                const removedIndex = workspaces.findIndex(
                                    (item) => item.id === removeId
                                );
                                const remaining = workspaces.filter(
                                    (item) => item.id !== removeId
                                );
                                closeAudience(removeId);
                                setWorkspaces((previous) =>
                                    previous.filter(
                                        (item) => item.id !== removeId
                                    )
                                );
                                if (activeId === removeId)
                                    setActiveId(
                                        remaining[Math.max(0, removedIndex - 1)]
                                            .id
                                    );
                                setRemoveId(null);
                            }}
                        >
                            Close tab
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}
