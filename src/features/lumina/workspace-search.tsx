import { formatForDisplay } from "@tanstack/react-hotkeys";
import { Check, Monitor, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Workspace } from "./model";

type WorkspaceSearchProps = {
    workspaces: Workspace[];
    activeId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (id: string) => void;
};

export function WorkspaceSearch({
    workspaces,
    activeId,
    open,
    onOpenChange,
    onSelect,
}: WorkspaceSearchProps) {
    const [query, setQuery] = useState("");
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const highlightedOption = useRef<HTMLButtonElement>(null);
    const listId = useId();
    const terms = query.trim().toLocaleLowerCase().split(/\s+/);
    const results = workspaces.filter((workspace) =>
        terms.every((term) => workspace.name.toLocaleLowerCase().includes(term))
    );
    const highlighted =
        results.find((workspace) => workspace.id === highlightedId) ??
        results.find((workspace) => workspace.id === activeId) ??
        results[0];
    const changeOpen = (next: boolean) => {
        setQuery("");
        setHighlightedId(null);
        onOpenChange(next);
    };
    const select = (id: string) => {
        onSelect(id);
        changeOpen(false);
    };

    useEffect(() => {
        if (open && highlighted?.id)
            highlightedOption.current?.scrollIntoView({
                block: "nearest",
            });
    }, [open, highlighted?.id]);

    return (
        <Popover open={open} onOpenChange={changeOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="workspace-search-trigger"
                            aria-label="Search workspaces"
                            aria-keyshortcuts="Meta+Shift+A Control+Shift+A"
                        >
                            <svg
                                width="19"
                                height="19"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                style={{
                                    width: 19,
                                    height: 19,
                                    strokeWidth: 1.8,
                                }}
                            >
                                <path d="M4 4h16M4 9h9M4 14h6" />
                                <circle cx="16" cy="15" r="4" />
                                <path d="m19 18 3 3" />
                            </svg>
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    Search workspaces · {formatForDisplay("Mod+Shift+A")}
                </TooltipContent>
            </Tooltip>
            <PopoverContent
                align="end"
                className="workspace-search-popover w-[360px] max-w-[calc(100vw-24px)] overflow-hidden p-0"
                aria-label="Search workspaces"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    input.current?.focus();
                }}
            >
                <div className="workspace-search-heading">
                    <span>Workspaces</span>
                    <span>{workspaces.length} open</span>
                </div>
                <div className="workspace-search-input">
                    <Search aria-hidden="true" />
                    <input
                        ref={input}
                        role="combobox"
                        aria-label="Search by workspace name"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            highlighted
                                ? `${listId}-${highlighted.id}`
                                : undefined
                        }
                        placeholder="Find a workspace…"
                        autoComplete="off"
                        spellCheck={false}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setHighlightedId(null);
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key === "ArrowDown" ||
                                event.key === "ArrowUp"
                            ) {
                                event.preventDefault();
                                if (!results.length) return;
                                const index = results.findIndex(
                                    (workspace) =>
                                        workspace.id === highlighted?.id
                                );
                                const direction =
                                    event.key === "ArrowDown" ? 1 : -1;
                                setHighlightedId(
                                    results[
                                        (index + direction + results.length) %
                                            results.length
                                    ].id
                                );
                            } else if (event.key === "Enter") {
                                event.preventDefault();
                                if (highlighted) select(highlighted.id);
                            }
                        }}
                    />
                    <kbd>esc</kbd>
                </div>
                <div
                    id={listId}
                    role="listbox"
                    aria-label="Workspaces"
                    className="workspace-search-results"
                >
                    {results.map((workspace) => (
                        <button
                            key={workspace.id}
                            ref={
                                workspace.id === highlighted?.id
                                    ? highlightedOption
                                    : undefined
                            }
                            id={`${listId}-${workspace.id}`}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={workspace.id === highlighted?.id}
                            data-current={workspace.id === activeId}
                            onMouseMove={() => setHighlightedId(workspace.id)}
                            onClick={() => select(workspace.id)}
                        >
                            <Monitor aria-hidden="true" />
                            <span className="workspace-search-name">
                                {workspace.name}
                            </span>
                            <span
                                className={`output-status status-${workspace.status}`}
                            >
                                <span />
                                {workspace.status === "live"
                                    ? "Live"
                                    : workspace.status === "blank"
                                      ? "Blank"
                                      : "Closed"}
                            </span>
                            {workspace.id === activeId ? (
                                <Check
                                    className="workspace-search-check"
                                    aria-label="Current workspace"
                                />
                            ) : (
                                <span className="workspace-search-check" />
                            )}
                        </button>
                    ))}
                </div>
                {results.length === 0 && (
                    <p className="workspace-search-empty" role="status">
                        No workspaces match “{query.trim()}”.
                    </p>
                )}
                <div className="workspace-search-footer">
                    <span>
                        <kbd>↑</kbd>
                        <kbd>↓</kbd> to browse
                    </span>
                    <span>
                        <kbd>↵</kbd> to switch
                    </span>
                </div>
            </PopoverContent>
        </Popover>
    );
}
