import {
    SegmentedControl,
    SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
    BookOpen,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    PanelLeft,
    PanelTop,
    Radio,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tooltip } from "@/shared/ui/tooltip";
import { useDeskContext } from "./desk-context";
import { referenceLabel } from "./fixtures";
import { VerseSlide } from "./verse-slide";
export function ChapterPanel() {
    const {
        chapterPanelId,
        workspace,
        chapterView,
        setChapterView,
        chapterStripCollapsed,
        setChapterStripCollapsed,
        activePanelSheet,
        setActivePanelSheet,
        panelLayout,
        changeVerseSheetOpen,
        setReference,
        referenceInput,
        selectedThumbnail,
        filmstrip,
        focusReferenceAfterSheet,
        selectVerse,
        current,
        chapterVerses,
        savedCopy,
    } = useDeskContext();
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
                    ? "The original edition is unavailable for navigation."
                    : "Select a verse to see the rest of its chapter."}
            </span>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    setReference("John 3:16");
                    if (panelLayout.overlay && activePanelSheet === "verses") {
                        focusReferenceAfterSheet.current = true;
                        setActivePanelSheet(null);
                    } else {
                        referenceInput.current?.focus();
                    }
                }}
            >
                Try John 3:16
            </Button>
        </div>
    );
    return (
        <section
            className={`chapter-section ${chapterView === "sidebar" ? "is-sidebar" : ""} ${chapterStripCollapsed && (chapterView === "horizontal" || !panelLayout.overlay) ? "is-collapsed" : ""}`}
            id={chapterPanelId}
            aria-label="Chapter verses"
            hidden={
                !panelLayout.overlay &&
                chapterView === "sidebar" &&
                chapterStripCollapsed
            }
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
                                ? `${chapterVerses.length} ${chapterVerses.length === 1 ? "verse" : "verses"}`
                                : "Bible library"}
                        </span>
                    </div>
                    {chapterView === "horizontal" && (
                        <Tooltip
                            content={
                                chapterStripCollapsed
                                    ? "Show verse strip"
                                    : "Hide verse thumbnails"
                            }
                        >
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="chapter-collapse-button"
                                aria-label={
                                    chapterStripCollapsed
                                        ? "Show verse strip"
                                        : "Hide verse thumbnails"
                                }
                                aria-expanded={!chapterStripCollapsed}
                                aria-controls={chapterPanelId}
                                onClick={() =>
                                    setChapterStripCollapsed(
                                        (collapsed) => !collapsed
                                    )
                                }
                            >
                                {chapterStripCollapsed ? (
                                    <ChevronUp />
                                ) : (
                                    <ChevronDown />
                                )}
                            </Button>
                        </Tooltip>
                    )}
                </div>
                <div className="chapter-heading-actions">
                    <span className="filmstrip-hint">
                        {chapterStripCollapsed
                            ? "Verse thumbnails hidden"
                            : "Select to show on audience"}
                    </span>
                    <SegmentedControl
                        label="Verse strip layout"
                        size="sm"
                        value={chapterView}
                        onChange={(value) => {
                            if (value === "horizontal" || value === "sidebar") {
                                setChapterView(value);
                                if (
                                    value === "sidebar" &&
                                    panelLayout.chapterOverlay
                                ) {
                                    changeVerseSheetOpen(true);
                                }
                            }
                        }}
                    >
                        <Tooltip content={<>Horizontal strip</>}>
                            <SegmentedControlItem
                                value="horizontal"
                                label="Horizontal verse strip"
                                isLabelHidden
                                icon={<PanelTop aria-hidden="true" />}
                            />
                        </Tooltip>
                        <Tooltip content={<>Left sidebar</>}>
                            <SegmentedControlItem
                                value="sidebar"
                                label="Sidebar verse strip"
                                isLabelHidden
                                icon={<PanelLeft aria-hidden="true" />}
                                onClick={() => {
                                    if (
                                        chapterView === "sidebar" &&
                                        panelLayout.chapterOverlay
                                    ) {
                                        changeVerseSheetOpen(true);
                                    }
                                }}
                            />
                        </Tooltip>
                    </SegmentedControl>
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
                                filmstrip.current?.scrollBy({
                                    left:
                                        chapterView === "horizontal" ? -450 : 0,
                                    top: chapterView === "sidebar" ? -300 : 0,
                                    behavior: "smooth",
                                })
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
                                filmstrip.current?.scrollBy({
                                    left:
                                        chapterView === "horizontal" ? 450 : 0,
                                    top: chapterView === "sidebar" ? 300 : 0,
                                    behavior: "smooth",
                                })
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
                <div className="chapter-filmstrip" ref={filmstrip}>
                    {chapterContent}
                </div>
            )}
        </section>
    );
}
