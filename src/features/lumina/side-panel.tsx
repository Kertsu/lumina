import {
    ArrowDownToLine,
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    History,
    Search,
    Send,
    Trash2,
    X,
} from "lucide-react";
import { Fragment, type CSSProperties, type RefObject, useId } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from "@/components/ui/sheet";
import type { Verse } from "./fixtures";
import { referenceLabel, translations, verses } from "./fixtures";
import type { SearchMode, Workspace } from "./model";
import { normalizeText, searchVerses } from "./model";
import { PanelDivider } from "./panel-divider";
import { SEARCH_PANEL_MIN_WIDTH } from "./use-panel-layout";

type Props = {
    open: boolean;
    overlay: boolean;
    width: number;
    maxWidth: number;
    onResize: (width: number) => void;
    triggerRef: RefObject<HTMLButtonElement | null>;
    workspace: Workspace;
    searchInputRef: RefObject<HTMLInputElement | null>;
    tab: string;
    onTab: (tab: string) => void;
    onChange: (patch: Partial<Workspace>) => void;
    onPreview: (verse: Verse) => void;
    onSend: (verse: Verse) => void;
    onRecall: (verse: Verse) => void;
    onOpenChange: (open: boolean) => void;
    onNotify: (message: string) => void;
};

function Highlight({
    text,
    query,
    mode,
}: {
    text: string;
    query: string;
    mode: SearchMode;
}) {
    const offsets: number[] = [];
    const ends: number[] = [];
    let normalized = "";
    let originalOffset = 0;
    for (const character of text) {
        const value = character
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLocaleLowerCase("en")
            .replace(/[’‘ʼ]/g, "'");
        for (let position = 0; position < value.length; position += 1) {
            offsets.push(originalOffset);
            ends.push(originalOffset + character.length);
        }
        normalized += value;
        originalOffset += character.length;
    }
    const tokens = [
        ...normalized.matchAll(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu),
    ];
    const queryWords =
        normalizeText(query).match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
    const ranges: { start: number; end: number }[] = [];
    const addRange = (start: number, end: number) =>
        ranges.push({
            start: offsets[start],
            end: ends[end - 1],
        });
    if (mode === "contains") {
        const needle = normalizeText(query);
        let start = normalized.indexOf(needle);
        while (needle && start !== -1) {
            addRange(start, start + needle.length);
            start = normalized.indexOf(needle, start + needle.length);
        }
    } else if (mode === "phrase") {
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
            if (
                queryWords.length &&
                queryWords.every(
                    (word, offset) => tokens[tokenIndex + offset]?.[0] === word
                )
            ) {
                const first = tokens[tokenIndex];
                const last = tokens[tokenIndex + queryWords.length - 1];
                addRange(first.index, last.index + last[0].length);
            }
        }
    } else {
        for (const token of tokens) {
            if (
                queryWords.some((word) =>
                    mode === "starts"
                        ? token[0].startsWith(word)
                        : token[0] === word
                )
            )
                addRange(token.index, token.index + token[0].length);
        }
    }
    const merged: { start: number; end: number }[] = [];
    for (const range of ranges) {
        const previous = merged.at(-1);
        if (previous && range.start <= previous.end)
            previous.end = Math.max(previous.end, range.end);
        else
            merged.push({
                ...range,
            });
    }
    let cursor = 0;
    return (
        <>
            {merged.map((range) => {
                const prefix = text.slice(cursor, range.start);
                cursor = range.end;
                return (
                    <Fragment key={range.start}>
                        {prefix}
                        <mark>{text.slice(range.start, range.end)}</mark>
                    </Fragment>
                );
            })}
            {text.slice(cursor)}
        </>
    );
}

export function SidePanel({
    open,
    overlay,
    width,
    maxWidth,
    onResize,
    triggerRef,
    workspace,
    searchInputRef,
    tab,
    onTab,
    onChange,
    onPreview,
    onSend,
    onRecall,
    onOpenChange,
    onNotify,
}: Props) {
    const searchId = useId();
    const modeId = useId();
    const scopeId = useId();
    const projectedOnly = workspace.historyProjectedOnly;
    const bibleOrder = workspace.order === "bible";
    const results = workspace.submittedQuery
        ? searchVerses(
              workspace.submittedQuery,
              workspace.translation,
              workspace.mode,
              workspace.scope
          )
        : [];
    if (bibleOrder)
        results.sort(
            (a, b) =>
                a.bookId - b.bookId ||
                a.chapter - b.chapter ||
                a.verse - b.verse
        );
    const pageCount = Math.max(1, Math.ceil(results.length / 5));
    const page = Math.min(workspace.page, pageCount);
    const visibleResults = results.slice((page - 1) * 5, page * 5);
    const history = workspace.history.filter(
        (entry) => !projectedOnly || entry.projected
    );
    const books = [
        ...new Set(
            verses
                .filter((verse) => verse.translation === workspace.translation)
                .map((verse) => verse.book)
        ),
    ];
    const exportHistory = () => {
        const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
        const csv = [
            "Reference,Translation,Text,Time,Projected",
            ...history.map((entry) =>
                [
                    referenceLabel(entry.verse),
                    translations.find(
                        (item) => item.id === entry.verse.translation
                    )?.name ?? "",
                    entry.verse.text,
                    new Date(entry.timestamp).toISOString(),
                    String(entry.projected),
                ]
                    .map(quote)
                    .join(",")
            ),
        ].join("\r\n");
        const url = URL.createObjectURL(
            new Blob(["\uFEFF", csv], {
                type: "text/csv;charset=utf-8",
            })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `lumina-${workspace.name.replace(/[^a-z0-9]/gi, "-")}-history.csv`;
        link.click();
        URL.revokeObjectURL(url);
        onNotify("History exported");
    };
    const content = (
        <Tabs
            id="search-history-content"
            hidden={!open && !overlay}
            value={tab}
            onValueChange={onTab}
            className="sidebar-tabs"
        >
            <div className="sidebar-tabbar">
                <TabsList>
                    <TabsTrigger value="search">
                        <Search />
                        Search
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History />
                        History
                        {workspace.history.length > 0 && (
                            <span className="tab-count">
                                {workspace.history.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className={overlay ? "" : "hidden"}
                    aria-label="Close search and history"
                    onClick={() => onOpenChange(false)}
                >
                    <X />
                </Button>
            </div>
            <TabsContent value="search" className="search-content">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onChange({
                            submittedQuery: workspace.query.trim(),
                            page: 1,
                        });
                    }}
                >
                    <label className="field-label" htmlFor={searchId}>
                        Find the words you remember
                    </label>
                    <div className="search-input-wrap">
                        <Search />
                        <input
                            id={searchId}
                            ref={searchInputRef}
                            type="search"
                            placeholder={
                                workspace.translation === "adb"
                                    ? "e.g. pagibig, buhay…"
                                    : "e.g. love, eternal life…"
                            }
                            value={workspace.query}
                            onChange={(event) =>
                                onChange({
                                    query: event.target.value,
                                })
                            }
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Search verses"
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                    <div className="search-filters">
                        <div>
                            <label htmlFor={modeId}>Match</label>
                            <Select
                                value={workspace.mode}
                                onValueChange={(mode: SearchMode) =>
                                    onChange({
                                        mode,
                                        page: 1,
                                    })
                                }
                            >
                                <SelectTrigger id={modeId}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All words
                                    </SelectItem>
                                    <SelectItem value="phrase">
                                        Phrase
                                    </SelectItem>
                                    <SelectItem value="starts">
                                        Word starts
                                    </SelectItem>
                                    <SelectItem value="contains">
                                        Contains text
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor={scopeId}>Search at</label>
                            <Select
                                value={workspace.scope}
                                onValueChange={(scope) =>
                                    onChange({
                                        scope,
                                        page: 1,
                                    })
                                }
                            >
                                <SelectTrigger id={scopeId}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        "Entire Bible",
                                        "OT",
                                        "NT",
                                        "Books of Moses",
                                        "Gospels",
                                        "Epistles of Paul",
                                        ...books,
                                    ].map((scope) => (
                                        <SelectItem key={scope} value={scope}>
                                            {scope}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </form>
                <div className="search-results">
                    {workspace.submittedQuery ? (
                        <>
                            <div className="results-heading">
                                <span>
                                    {results.length}{" "}
                                    {results.length === 1 ? "verse" : "verses"}{" "}
                                    found
                                </span>
                                <Select
                                    value={bibleOrder ? "bible" : "best"}
                                    onValueChange={(value) => {
                                        onChange({
                                            order:
                                                value === "bible"
                                                    ? "bible"
                                                    : "best",
                                        });
                                        onChange({
                                            page: 1,
                                        });
                                    }}
                                >
                                    <SelectTrigger
                                        className="sort-select"
                                        aria-label="Result order"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="best">
                                            Best match
                                        </SelectItem>
                                        <SelectItem value="bible">
                                            Bible order
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="query-summary">
                                “{workspace.submittedQuery}” in{" "}
                                {
                                    translations.find(
                                        (item) =>
                                            item.id === workspace.translation
                                    )?.shortName
                                }{" "}
                                · {workspace.scope}
                            </p>
                            {bibleOrder &&
                                results.some((verse) => verse.bookId >= 40) && (
                                    <button
                                        type="button"
                                        className="text-action"
                                        onClick={() =>
                                            onChange({
                                                page:
                                                    Math.floor(
                                                        results.findIndex(
                                                            (verse) =>
                                                                verse.bookId >=
                                                                40
                                                        ) / 5
                                                    ) + 1,
                                            })
                                        }
                                    >
                                        Jump to New Testament
                                    </button>
                                )}
                            {visibleResults.map((verse) => (
                                <article
                                    className="verse-result"
                                    key={verse.id}
                                >
                                    <div className="result-ref">
                                        <BookOpen />
                                        <h3>{referenceLabel(verse)}</h3>
                                        <span>
                                            {
                                                translations.find(
                                                    (item) =>
                                                        item.id ===
                                                        verse.translation
                                                )?.shortName
                                            }
                                        </span>
                                    </div>
                                    <p>
                                        <Highlight
                                            text={verse.text}
                                            query={workspace.submittedQuery}
                                            mode={workspace.mode}
                                        />
                                    </p>
                                    <div className="result-actions">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onPreview(verse)}
                                        >
                                            <Eye />
                                            Check preview
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-primary"
                                            onClick={() => onSend(verse)}
                                        >
                                            <Send />
                                            Send Live
                                        </Button>
                                    </div>
                                </article>
                            ))}
                            {results.length === 0 && (
                                <div className="sidebar-empty">
                                    <Search />
                                    <h3>No verses found</h3>
                                    <p>
                                        Try another matching mode or widen your
                                        scope. This demo searches a small
                                        fixture library.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onChange({
                                                scope: "Entire Bible",
                                                mode: "starts",
                                                page: 1,
                                            })
                                        }
                                    >
                                        Try word starts across the Bible
                                    </Button>
                                </div>
                            )}
                            {pageCount > 1 && (
                                <nav
                                    className="pagination"
                                    aria-label="Search result pages"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Previous result page"
                                        disabled={page <= 1}
                                        onClick={() =>
                                            onChange({
                                                page: page - 1,
                                            })
                                        }
                                    >
                                        <ChevronLeft />
                                    </Button>
                                    {Array.from(
                                        {
                                            length: pageCount,
                                        },
                                        (_, index) => (
                                            <Button
                                                // biome-ignore lint/suspicious/noArrayIndexKey: Page numbers are fixed identities.
                                                key={index + 1}
                                                size="icon-sm"
                                                variant={
                                                    page === index + 1
                                                        ? "secondary"
                                                        : "ghost"
                                                }
                                                aria-current={
                                                    page === index + 1
                                                        ? "page"
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    onChange({
                                                        page: index + 1,
                                                    })
                                                }
                                            >
                                                {index + 1}
                                            </Button>
                                        )
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Next result page"
                                        disabled={page >= pageCount}
                                        onClick={() =>
                                            onChange({
                                                page: page + 1,
                                            })
                                        }
                                    >
                                        <ChevronRight />
                                    </Button>
                                </nav>
                            )}
                        </>
                    ) : (
                        <div className="search-welcome">
                            <div className="search-illustration">
                                <BookOpen />
                                <span />
                            </div>
                            <h3>A verse for every moment.</h3>
                            <p>
                                Search the demo library by word or phrase.
                                <br />
                                Preview a result, or send it straight to the
                                room.
                            </p>
                            <div className="suggested-searches">
                                {(workspace.translation === "adb"
                                    ? ["Dios", "buhay", "sumasampalataya"]
                                    : ["love", "eternal life", "light"]
                                ).map((query) => (
                                    <button
                                        type="button"
                                        key={query}
                                        onClick={() =>
                                            onChange({
                                                query,
                                                submittedQuery: query,
                                                page: 1,
                                            })
                                        }
                                    >
                                        {query}
                                    </button>
                                ))}
                            </div>
                            <div className="familiar-passages">
                                <span>Familiar passages</span>
                                {["John", "Psalms", "Philippians"].map(
                                    (book) => {
                                        const verse = verses.find(
                                            (item) =>
                                                item.book === book &&
                                                item.translation ===
                                                    workspace.translation &&
                                                (book !== "John" ||
                                                    item.verse === 16)
                                        );
                                        return (
                                            verse && (
                                                <button
                                                    type="button"
                                                    key={book}
                                                    onClick={() =>
                                                        onPreview(verse)
                                                    }
                                                >
                                                    <BookOpen />
                                                    <span>
                                                        {referenceLabel(verse)}
                                                    </span>
                                                    <Eye />
                                                </button>
                                            )
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="sidebar-footnote">
                    <Check />
                    Search stays private until you Send Live.
                </div>
            </TabsContent>
            <TabsContent value="history" className="history-content">
                <div className="history-tools">
                    <Select
                        value={projectedOnly ? "projected" : "all"}
                        onValueChange={(value) =>
                            onChange({
                                historyProjectedOnly: value === "projected",
                            })
                        }
                    >
                        <SelectTrigger aria-label="History filter">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All activity</SelectItem>
                            <SelectItem value="projected">
                                Projected only
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Export visible history to CSV"
                        disabled={!history.length}
                        onClick={exportHistory}
                    >
                        <ArrowDownToLine />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Clear workspace history"
                                disabled={!workspace.history.length}
                            >
                                <Trash2 />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Clear {workspace.name} history?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This removes this workspace’s recorded
                                    verses. Current content and other workspaces
                                    stay as they are.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>
                                    Keep history
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() =>
                                        onChange({
                                            history: [],
                                        })
                                    }
                                >
                                    Clear history
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <p className="query-summary px-5">
                    {history.length} recorded{" "}
                    {history.length === 1 ? "verse" : "verses"} in this
                    workspace
                </p>
                <div className="history-list">
                    {history.map((entry) => (
                        <button
                            className="history-entry"
                            type="button"
                            key={entry.id}
                            onClick={() => onRecall(entry.verse)}
                        >
                            <div className="history-entry-heading">
                                <h3>{referenceLabel(entry.verse)}</h3>
                                <span>
                                    {new Date(
                                        entry.timestamp
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>
                            <p>{entry.verse.text}</p>
                            <div>
                                <span>
                                    {
                                        translations.find(
                                            (translation) =>
                                                translation.id ===
                                                entry.verse.translation
                                        )?.shortName
                                    }
                                </span>
                                <span
                                    className={
                                        entry.projected ? "text-live" : ""
                                    }
                                >
                                    {entry.projected ? (
                                        <>
                                            <Check />
                                            Projected
                                        </>
                                    ) : (
                                        <>
                                            <Clock3 />
                                            Selected privately
                                        </>
                                    )}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
                {!history.length && (
                    <div className="sidebar-empty">
                        <History />
                        <h3>
                            {projectedOnly
                                ? "No projections yet"
                                : "Your verses will be here"}
                        </h3>
                        <p>Selected verses appear here, ready to revisit.</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
    if (overlay)
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="search-history-sheet"
                    showCloseButton={false}
                    onOpenAutoFocus={(event) => {
                        if (tab === "search" && searchInputRef.current) {
                            event.preventDefault();
                            searchInputRef.current.focus();
                        }
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        if (
                            !document.querySelector(
                                '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
                            )
                        )
                            triggerRef.current?.focus();
                    }}
                >
                    <SheetTitle className="sr-only">
                        Search and history
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Find verses and recall previously displayed passages.
                    </SheetDescription>
                    {content}
                </SheetContent>
            </Sheet>
        );
    return (
        <aside
            id="search-history-panel"
            className={`side-panel ${open ? "" : "is-collapsed"}`}
            aria-label="Search and verse history"
            style={
                {
                    "--side-panel-width": `${width}px`,
                } as CSSProperties
            }
        >
            <PanelDivider
                side="right"
                label="search and history"
                controls="search-history-content"
                width={width}
                minWidth={SEARCH_PANEL_MIN_WIDTH}
                maxWidth={maxWidth}
                collapsed={!open}
                onResize={onResize}
                onToggle={() => onOpenChange(!open)}
                className="search-panel-divider"
            />
            <div className="side-panel-content" hidden={!open}>
                {content}
            </div>
        </aside>
    );
}
