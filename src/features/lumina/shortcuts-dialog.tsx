import { formatForDisplay } from "@tanstack/react-hotkeys";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    EyeOff,
    Info,
    ListFilter,
    LogOut,
    Monitor,
    Plus,
    Search,
    Send,
    SquareTerminal,
    X,
} from "lucide-react";
import { useRef } from "react";
import { isDesktopHost, requestQuitConfirmation } from "@/bridge/client";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@/shared/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { useDeskContext } from "./desk-context";
import { showShortcutsHotkey } from "./keyboard-shortcuts";

export function ShortcutsDialog() {
    const {
        workspace,
        workspaces,
        activeId,
        helpOpen,
        setHelpOpen,
        setTranslationOpen,
        changeSearchOpen,
        setSideTab,
        searchInput,
        showInformation,
        referenceInput,
        reference,
        submitReference,
        canSendPreview,
        sendPreview,
        navigate,
        toggleBlank,
        isInstalled,
        addWorkspace,
        setWorkspaceSearchOpen,
        setActiveId,
        setRemoveId,
    } = useDeskContext();
    const selectedAction = useRef<(() => void) | null>(null);
    const canNavigate = Boolean(
        workspace.current && isInstalled(workspace.current)
    );
    const groups = [
        {
            heading: "Find & navigate",
            items: [
                {
                    label: "Choose translation",
                    hotkey: "F1",
                    icon: BookOpen,
                    run: () => setTranslationOpen(true),
                },
                {
                    label: "Find a verse",
                    hotkey: "F3",
                    icon: Search,
                    run: () => {
                        changeSearchOpen(true);
                        setSideTab("search");
                        window.setTimeout(
                            () => searchInput.current?.focus(),
                            50
                        );
                    },
                },
                {
                    label: "Book information",
                    hotkey: "F7",
                    icon: Info,
                    run: showInformation,
                },
                {
                    label: "Quick reference",
                    hotkey: "Mod+K",
                    icon: SquareTerminal,
                    run: () => referenceInput.current?.focus(),
                },
            ],
        },
        {
            heading: "Projection",
            items: [
                {
                    label: "Send preview / quick reference live",
                    hotkey: "Mod+Enter",
                    icon: Send,
                    disabled: workspace.preview
                        ? !canSendPreview
                        : !reference.trim(),
                    run: () =>
                        workspace.preview
                            ? sendPreview()
                            : submitReference(false),
                },
                {
                    label: "Previous verse",
                    hotkey: "ArrowLeft",
                    icon: ArrowLeft,
                    disabled: !canNavigate || workspace.canPrevious === false,
                    run: () => navigate(-1),
                },
                {
                    label: "Next verse",
                    hotkey: "ArrowRight",
                    icon: ArrowRight,
                    disabled: !canNavigate || workspace.canNext === false,
                    run: () => navigate(1),
                },
                {
                    label: "Blank / resume audience",
                    hotkey: "B",
                    icon: EyeOff,
                    disabled: workspace.status === "closed",
                    run: toggleBlank,
                },
            ],
        },
        {
            heading: "Workspaces",
            items: [
                {
                    label: "New workspace",
                    hotkey: "Mod+T",
                    icon: Plus,
                    run: addWorkspace,
                },
                {
                    label: "Search workspaces",
                    hotkey: "Mod+Shift+A",
                    icon: ListFilter,
                    run: () => setWorkspaceSearchOpen(true),
                },
                ...workspaces.slice(0, 8).map((item, index) => ({
                    label: `Switch to ${item.name}`,
                    hotkey: `Mod+${index + 1}`,
                    icon: Monitor,
                    run: () => setActiveId(item.id),
                })),
                {
                    label: "Select last workspace",
                    hotkey: "Mod+9",
                    icon: Monitor,
                    run: () =>
                        setActiveId(workspaces[workspaces.length - 1].id),
                },
                {
                    label: "Workspace tab options",
                    hotkey: "Shift+F10",
                    icon: ListFilter,
                    run: () => {
                        const tab = document.querySelector<HTMLElement>(
                            '[role="tab"][data-state="active"]'
                        );
                        if (!tab) {
                            return;
                        }
                        tab.focus();
                        const bounds = tab.getBoundingClientRect();
                        tab.dispatchEvent(
                            new MouseEvent("contextmenu", {
                                bubbles: true,
                                cancelable: true,
                                clientX: bounds.left + 16,
                                clientY: bounds.bottom,
                            })
                        );
                    },
                },
                {
                    label: "Close current workspace",
                    hotkey: "Mod+W",
                    icon: X,
                    disabled: workspaces.length === 1,
                    run: () => setRemoveId(activeId),
                },
            ],
        },
        {
            heading: "Application",
            items: [
                {
                    label: "Quit Lumina (hold or press twice)",
                    hotkey: "Mod+Q",
                    icon: LogOut,
                    disabled: !isDesktopHost,
                    run: () => {
                        void requestQuitConfirmation();
                    },
                },
            ],
        },
    ];

    return (
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogContent
                className="shortcuts-dialog gap-0 overflow-hidden p-0 sm:max-w-[560px]"
                onCloseAutoFocus={(event) => {
                    const run = selectedAction.current;
                    selectedAction.current = null;
                    if (run) {
                        event.preventDefault();
                        window.requestAnimationFrame(run);
                    }
                }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>
                        Search shortcuts. Select an action to run it. Single-key
                        shortcuts pause while typing.
                    </DialogDescription>
                </DialogHeader>
                <Command label="Keyboard shortcuts" loop>
                    <CommandInput placeholder="Search keyboard shortcuts…" />
                    <CommandList>
                        <CommandEmpty>No shortcuts found.</CommandEmpty>
                        {groups.map((group) => (
                            <CommandGroup
                                key={group.heading}
                                heading={group.heading}
                            >
                                {group.items.map((item) => (
                                    <CommandItem
                                        key={item.hotkey}
                                        value={`${item.hotkey} ${item.label}`}
                                        keywords={[
                                            group.heading,
                                            item.hotkey,
                                            formatForDisplay(item.hotkey),
                                        ]}
                                        disabled={
                                            "disabled" in item && item.disabled
                                        }
                                        onSelect={() => {
                                            selectedAction.current = item.run;
                                            setHelpOpen(false);
                                        }}
                                    >
                                        <item.icon aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            {item.label}
                                        </span>
                                        <CommandShortcut>
                                            {formatForDisplay(item.hotkey)}
                                        </CommandShortcut>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
                        <span>↑ ↓ browse · Enter run · Esc close</span>
                        <span className="flex items-center gap-2">
                            Open shortcuts{" "}
                            <CommandShortcut>
                                {formatForDisplay(showShortcutsHotkey)}
                            </CommandShortcut>
                        </span>
                    </div>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
