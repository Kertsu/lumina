import { arrayMove } from "@dnd-kit/sortable";
import { useHotkey, useHotkeys } from "@tanstack/react-hotkeys";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TranslationId, Verse } from "./fixtures";
import { showShortcutsHotkey } from "./keyboard-shortcuts";
import type { DeskController, Workspace } from "./model";
import { getBand } from "./model";
import { useAppTheme } from "./use-app-theme";
import { usePanelLayout } from "./use-panel-layout";

export function useDeskView(controller: DeskController, workspace: Workspace) {
    const { theme, setTheme, themeError } = useAppTheme();
    const { workspaces, activeId, translations, dispatch } = controller;
    const installed = translations.map((translation) => translation.id);
    const setActiveId = (workspaceId: string) =>
        dispatch({
            type: "activate",
            workspaceId,
        });
    const [sidebar, setSidebar] = useState(true);
    const [sideTab, setSideTab] = useState("search");
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [informationOpen, setInformationOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [audienceSettingsOpen, setAudienceSettingsOpen] = useState(false);
    const [translationOpen, setTranslationOpen] = useState(false);
    const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false);
    const [chapterView, setChapterView] = useState<"horizontal" | "sidebar">(
        "horizontal"
    );
    const [chapterStripCollapsed, setChapterStripCollapsed] = useState(false);
    const [chapterSidebarWidth, setChapterSidebarWidth] = useState(190);
    const [searchPanelWidth, setSearchPanelWidth] = useState(325);
    const [activePanelSheet, setActivePanelSheet] = useState<
        "verses" | "search" | null
    >(null);
    const panelLayout = usePanelLayout({
        chapterSidebar: chapterView === "sidebar",
        chapterCollapsed: chapterStripCollapsed,
        searchOpen: sidebar,
        chapterPreferredWidth: chapterSidebarWidth,
        searchPreferredWidth: searchPanelWidth,
    });
    const changeSearchOpen = (open: boolean) => {
        if (panelLayout.overlay) {
            setActivePanelSheet((previous) =>
                open ? "search" : previous === "search" ? null : previous
            );
        } else {
            setSidebar(open);
        }
    };
    const changeVerseSheetOpen = (open: boolean) =>
        setActivePanelSheet((previous) =>
            open ? "verses" : previous === "verses" ? null : previous
        );
    useEffect(() => {
        if (
            activePanelSheet &&
            (!panelLayout.overlay ||
                (activePanelSheet === "verses" && chapterView !== "sidebar"))
        ) {
            setActivePanelSheet(null);
        }
    }, [activePanelSheet, chapterView, panelLayout.overlay]);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [rename, setRename] = useState("");
    const [reference, setReference] = useState("");
    const [referenceError, setReferenceError] = useState("");
    useEffect(() => {
        if (themeError) {
            toast.error(themeError);
        }
    }, [themeError]);
    const [informationBook, setInformationBook] = useState("John");
    const referenceInput = useRef<HTMLInputElement>(null);
    const selectedThumbnail = useRef<HTMLButtonElement>(null);
    const filmstrip = useRef<HTMLDivElement>(null);
    const referenceErrorId = useId();
    const chapterPanelId = useId();
    const workspaceNameId = useId();
    const searchInput = useRef<HTMLInputElement>(null);
    const verseSheetTrigger = useRef<HTMLButtonElement>(null);
    const searchSheetTrigger = useRef<HTMLButtonElement>(null);
    const focusReferenceAfterSheet = useRef(false);
    const notifySuccess = (message: string) => toast.success(message);

    const inspectInformation = (bookId?: number) =>
        dispatch({
            type: "inspectInformation",
            workspaceId: activeId,
            bookId,
        });
    const showInformation = () => {
        inspectInformation(
            workspace.current?.bookId ??
                workspace.books.find((book) => book.name === informationBook)
                    ?.id ??
                workspace.books[0]?.id
        );
        setInformationOpen(true);
    };
    const patch = (value: Partial<Workspace>) => {
        if (value.preview === null) {
            dispatch({
                type: "clearPreview",
                workspaceId: activeId,
            });
        } else if (value.appearance) {
            dispatch({
                type: "appearance",
                workspaceId: activeId,
                appearance: value.appearance,
            });
        } else if (value.hideCursor !== undefined) {
            dispatch({
                type: "hideCursor",
                workspaceId: activeId,
                enabled: value.hideCursor,
            });
        } else if (value.information !== undefined) {
            dispatch({
                type: "information",
                workspaceId: activeId,
                enabled: value.information,
                bookId: workspace.books.find(
                    (book) => book.name === informationBook
                )?.id,
            });
        } else if (value.translation) {
            dispatch({
                type: "changeSearchTranslation",
                workspaceId: activeId,
                translationId: value.translation,
            });
        } else {
            dispatch({
                type: "patchUi",
                workspaceId: activeId,
                patch: value,
            });
        }
    };
    const isInstalled = (verse: Verse) => installed.includes(verse.translation);
    const selectVerse = (verse: Verse, action = "Selected verse") =>
        dispatch({
            type: "select",
            workspaceId: activeId,
            verse,
            action,
        });
    const previewVerse = (verse: Verse) => {
        if (panelLayout.overlay) {
            setActivePanelSheet(null);
        }
        dispatch({
            type: "preview",
            workspaceId: activeId,
            verse,
        });
    };
    const sendLive = (verse: Verse) =>
        dispatch({
            type: "send",
            workspaceId: activeId,
            verse,
        });
    const canSendPreview = Boolean(
        workspace.preview &&
            workspace.status !== "closed" &&
            !controller.pending
    );
    const sendPreview = () => {
        if (canSendPreview && workspace.preview) {
            sendLive(workspace.preview);
        }
    };
    const navigate = (direction: -1 | 1) =>
        dispatch({
            type: "navigate",
            workspaceId: activeId,
            direction,
        });
    const submitReference = (preview: boolean) =>
        dispatch({
            type: "reference",
            workspaceId: activeId,
            input: reference,
            preview,
        });
    const toggleBlank = () =>
        dispatch({
            type: workspace.status === "blank" ? "resume" : "blank",
            workspaceId: activeId,
        });
    const closeAudience = (workspaceId: string) =>
        dispatch({
            type: "closeAudience",
            workspaceId,
        });
    const openAudience = () =>
        dispatch({
            type: "openAudience",
            workspaceId: activeId,
        });
    const addWorkspace = () =>
        dispatch({
            type: "add",
        });

    // biome-ignore lint/correctness/useExhaustiveDependencies: A workspace switch resets its quick-entry field.
    useEffect(() => {
        setReference("");
        setReferenceError("");
    }, [activeId]);
    const currentId = workspace?.current?.id;
    const chapterIdentity = workspace.current
        ? `${workspace.current.editionId ?? workspace.current.translation}:${workspace.current.bookId}:${workspace.current.chapter}`
        : "";
    const positionedStrip = useRef<{
        element: HTMLDivElement;
        context: string;
    } | null>(null);
    // biome-ignore lint/correctness/useExhaustiveDependencies: Chapter arrival, sheet mounting, and sidebar resizing change the referenced DOM geometry.
    useLayoutEffect(() => {
        const strip = filmstrip.current;
        const selected = selectedThumbnail.current;
        if (
            (!chapterStripCollapsed ||
                (chapterView === "sidebar" && panelLayout.overlay)) &&
            currentId &&
            strip &&
            selected &&
            strip.clientWidth > 0 &&
            strip.clientHeight > 0
        ) {
            const context = `${activeId}:${chapterIdentity}:${chapterView}`;
            const initialPosition =
                positionedStrip.current?.element !== strip ||
                positionedStrip.current.context !== context;
            positionedStrip.current = {
                element: strip,
                context,
            };
            const stripBounds = strip.getBoundingClientRect();
            const selectedBounds = selected.getBoundingClientRect();
            const horizontal = chapterView === "horizontal";
            const start = horizontal ? selectedBounds.left : selectedBounds.top;
            const end = horizontal
                ? selectedBounds.right
                : selectedBounds.bottom;
            const viewportStart =
                (horizontal ? stripBounds.left : stripBounds.top) + 8;
            const viewportEnd =
                (horizontal
                    ? stripBounds.left + strip.clientWidth
                    : stripBounds.top + strip.clientHeight) - 8;
            const delta =
                start < viewportStart
                    ? start - viewportStart
                    : end > viewportEnd
                      ? end - viewportEnd
                      : 0;
            const offset = horizontal ? strip.scrollLeft : strip.scrollTop;
            const destination = Math.max(0, offset + delta);
            if (Math.abs(destination - offset) < 1) {
                return;
            }
            strip.scrollTo({
                left: horizontal ? destination : strip.scrollLeft,
                top: horizontal ? strip.scrollTop : destination,
                behavior:
                    initialPosition ||
                    window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "instant"
                        : "smooth",
            });
        }
    }, [
        activeId,
        activePanelSheet,
        chapterIdentity,
        chapterStripCollapsed,
        chapterView,
        currentId,
        panelLayout.overlay,
        panelLayout.chapterWidth,
        workspace.chapterVerses.length,
    ]);
    const dialogOpen = Boolean(
        (panelLayout.overlay && activePanelSheet !== null) ||
            workspaceSearchOpen ||
            settingsOpen ||
            appearanceOpen ||
            informationOpen ||
            helpOpen ||
            audienceSettingsOpen ||
            libraryOpen ||
            renameId ||
            removeId ||
            workspace?.preview
    );
    const canNavigate = () =>
        !document.querySelector(
            '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]'
        ) &&
        document.activeElement?.getAttribute("role") !== "tab" &&
        document.activeElement?.getAttribute("role") !== "separator";
    const requestCloseTab = () => {
        if (dialogOpen || !workspace) {
            return;
        }
        if (workspaces.length === 1) {
            toast.warning("Keep at least one workspace open.");
            return;
        }
        setRemoveId(workspace.id);
    };
    const requestNewTab = () => {
        if (!dialogOpen) {
            addWorkspace();
        }
    };
    useHotkeys(
        ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((number) => ({
            hotkey: `Mod+${number}` as const,
            callback: () => {
                if (dialogOpen) {
                    return;
                }
                const target =
                    number === 9 ? workspaces.at(-1) : workspaces[number - 1];
                if (target) {
                    setActiveId(target.id);
                }
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
        enabled: true,
        ignoreInputs: false,
        preventDefault: true,
        stopPropagation: true,
        requireReset: true,
        capture: true,
    });
    useHotkey("Mod+W", requestCloseTab, {
        enabled: true,
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
    useHotkey(showShortcutsHotkey, () => setHelpOpen((open) => !open), {
        enabled: !dialogOpen || helpOpen,
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
            changeSearchOpen(true);
            setSideTab("search");
            window.setTimeout(() => searchInput.current?.focus(), 50);
        },
        {
            enabled: !dialogOpen,
            ignoreInputs: false,
        }
    );
    useHotkey("F7", showInformation, {
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
            if (workspace.preview) {
                sendPreview();
            } else if (!dialogOpen) {
                submitReference(false);
            }
        },
        {
            ignoreInputs: false,
        }
    );
    useHotkey(
        "ArrowLeft",
        () => {
            if (canNavigate()) {
                navigate(-1);
            }
        },
        {
            enabled: !dialogOpen,
        }
    );
    useHotkey(
        "ArrowRight",
        () => {
            if (canNavigate()) {
                navigate(1);
            }
        },
        {
            enabled: !dialogOpen,
        }
    );
    useHotkey(
        "B",
        () => {
            if (canNavigate()) {
                toggleBlank();
            }
        },
        {
            enabled: !dialogOpen,
        }
    );

    const current = workspace.current;
    const translation = translations.find(
        (item) => item.id === workspace.translation
    );
    const chapterVerses = workspace.chapterVerses;
    const band = current ? getBand(current, workspace.appearance) : undefined;
    const metadataSource = current;
    const metadata = workspace.metadata;
    const savedCopy = current && !isInstalled(current);
    const changeTranslation = (translationId: TranslationId) =>
        dispatch({
            type: "changeCurrentTranslation",
            workspaceId: activeId,
            translationId,
        });
    const moveWorkspace = (id: string, direction: -1 | 1) => {
        const index = workspaces.findIndex((item) => item.id === id);
        const target = index + direction;
        if (target < 0 || target >= workspaces.length) {
            return;
        }
        dispatch({
            type: "reorder",
            workspaceIds: arrayMove(
                workspaces.map((item) => item.id),
                index,
                target
            ),
        });
    };
    return {
        inspectInformation,
        showInformation,
        chapterPanelId,
        controller,
        workspace,
        theme,
        setTheme,
        workspaces,
        activeId,
        translations,
        dispatch,
        installed,
        setActiveId,
        sidebar,
        sideTab,
        setSideTab,
        appearanceOpen,
        setAppearanceOpen,
        settingsOpen,
        setSettingsOpen,
        libraryOpen,
        setLibraryOpen,
        informationOpen,
        setInformationOpen,
        helpOpen,
        setHelpOpen,
        audienceSettingsOpen,
        setAudienceSettingsOpen,
        translationOpen,
        setTranslationOpen,
        workspaceSearchOpen,
        setWorkspaceSearchOpen,
        chapterView,
        setChapterView,
        chapterStripCollapsed,
        setChapterStripCollapsed,
        setChapterSidebarWidth,
        setSearchPanelWidth,
        activePanelSheet,
        setActivePanelSheet,
        panelLayout,
        changeSearchOpen,
        changeVerseSheetOpen,
        removeId,
        setRemoveId,
        renameId,
        setRenameId,
        rename,
        setRename,
        reference,
        setReference,
        referenceError,
        setReferenceError,
        informationBook,
        setInformationBook,
        referenceInput,
        selectedThumbnail,
        filmstrip,
        referenceErrorId,
        workspaceNameId,
        searchInput,
        verseSheetTrigger,
        searchSheetTrigger,
        focusReferenceAfterSheet,
        notifySuccess,
        patch,
        isInstalled,
        selectVerse,
        previewVerse,
        sendLive,
        canSendPreview,
        sendPreview,
        navigate,
        submitReference,
        toggleBlank,
        closeAudience,
        openAudience,
        addWorkspace,
        current,
        translation,
        chapterVerses,
        band,
        metadataSource,
        metadata,
        savedCopy,
        changeTranslation,
        moveWorkspace,
    };
}
