import {
    ChevronDown,
    Eye,
    EyeOff,
    Monitor,
    PanelLeft,
    Search,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { TabsContent } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ChapterPanel } from "./chapter-panel";
import { CurrentVerse } from "./current-verse";
import { useDeskContext } from "./desk-context";
import { PanelDivider } from "./panel-divider";
import { SidePanel } from "./side-panel";
import { CHAPTER_PANEL_MIN_WIDTH } from "./use-panel-layout";
export function WorkspaceBody() {
    const {
        chapterPanelId,
        workspace,
        activeId,
        translations,
        dispatch,
        sidebar,
        sideTab,
        setSideTab,
        setLibraryOpen,
        chapterView,
        chapterStripCollapsed,
        setChapterStripCollapsed,
        setChapterSidebarWidth,
        setSearchPanelWidth,
        activePanelSheet,
        panelLayout,
        changeSearchOpen,
        changeVerseSheetOpen,
        searchInput,
        verseSheetTrigger,
        searchSheetTrigger,
        patch,
        selectVerse,
        previewVerse,
        sendLive,
        toggleBlank,
        closeAudience,
        openAudience,
    } = useDeskContext();
    return (
        <TabsContent
            value={activeId}
            ref={panelLayout.containerRef}
            className={`desk-body ${panelLayout.overlay ? "uses-panel-sheets" : ""}`}
        >
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
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Fullscreen audience output"
                                        onClick={() =>
                                            dispatch({
                                                type: "fullscreen",
                                                workspaceId: activeId,
                                                enabled: !workspace.fullscreen,
                                            })
                                        }
                                    >
                                        <Monitor />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    View audience output
                                </TooltipContent>
                            </Tooltip>
                        )}

                        <span className="audience-state">
                            {workspace.status === "closed"
                                ? "Audience closed"
                                : workspace.status === "blank"
                                  ? "Audience is blank"
                                  : "Audience is live"}
                        </span>
                        <fieldset
                            className="audience-controls"
                            aria-label={`Audience controls for ${workspace.name}`}
                        >
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
                                aria-pressed={workspace.status === "blank"}
                                disabled={workspace.status === "closed"}
                                onClick={toggleBlank}
                            >
                                {workspace.status === "blank" ? (
                                    <Eye />
                                ) : (
                                    <EyeOff />
                                )}
                                {workspace.status === "blank"
                                    ? "Resume"
                                    : "Blank"}
                                <kbd>B</kbd>
                            </Button>
                        </fieldset>
                        {panelLayout.overlay && (
                            <div className="compact-panel-actions">
                                {chapterView === "sidebar" && (
                                    <Button
                                        ref={verseSheetTrigger}
                                        variant="ghost"
                                        size="sm"
                                        aria-haspopup="dialog"
                                        aria-expanded={
                                            activePanelSheet === "verses"
                                        }
                                        onClick={() =>
                                            changeVerseSheetOpen(true)
                                        }
                                    >
                                        <PanelLeft />
                                        Verses
                                    </Button>
                                )}
                                <Button
                                    ref={searchSheetTrigger}
                                    variant="ghost"
                                    size="sm"
                                    aria-haspopup="dialog"
                                    aria-expanded={
                                        activePanelSheet === "search"
                                    }
                                    onClick={() => changeSearchOpen(true)}
                                >
                                    <Search />
                                    Search / History
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div
                    className={`projection-workspace ${chapterView === "sidebar" && !panelLayout.overlay ? "is-sidebar" : ""} ${chapterView === "sidebar" && chapterStripCollapsed && !panelLayout.overlay ? "is-sidebar-collapsed" : ""}`}
                    style={
                        {
                            "--chapter-sidebar-width": `${panelLayout.chapterWidth}px`,
                        } as React.CSSProperties
                    }
                >
                    <div className="projection-main">
                        <CurrentVerse />
                    </div>
                    {chapterView === "sidebar" && !panelLayout.overlay && (
                        <PanelDivider
                            side="left"
                            label="verse sidebar"
                            controls={chapterPanelId}
                            width={panelLayout.chapterWidth}
                            minWidth={CHAPTER_PANEL_MIN_WIDTH}
                            maxWidth={panelLayout.chapterMaxWidth}
                            collapsed={chapterStripCollapsed}
                            onResize={setChapterSidebarWidth}
                            onCollapsedChange={setChapterStripCollapsed}
                            className="chapter-sidebar-divider"
                        />
                    )}
                    {!(chapterView === "sidebar" && panelLayout.overlay) && (
                        <ChapterPanel />
                    )}
                </div>
                <div className="workspace-footer">
                    <span>
                        <span className="offline-dot" />
                        All local. Ready for your gathering.
                    </span>
                    <button type="button" onClick={() => setLibraryOpen(true)}>
                        Bible library
                        <ChevronDown />
                    </button>
                </div>
            </main>
            <SidePanel
                key={workspace.id}
                open={
                    panelLayout.overlay
                        ? activePanelSheet === "search"
                        : sidebar
                }
                overlay={panelLayout.overlay}
                width={panelLayout.searchWidth}
                maxWidth={panelLayout.searchMaxWidth}
                onResize={setSearchPanelWidth}
                triggerRef={searchSheetTrigger}
                onOpenChange={changeSearchOpen}
                workspace={workspace}
                searchInputRef={searchInput}
                tab={sideTab}
                onTab={setSideTab}
                onChange={patch}
                onPreview={previewVerse}
                onSend={sendLive}
                onRecall={(verse) => selectVerse(verse, "Recalled history")}
                translations={translations}
                onSearch={() =>
                    dispatch({ type: "search", workspaceId: activeId })
                }
                onReference={(input) =>
                    dispatch({
                        type: "reference",
                        workspaceId: activeId,
                        input,
                        preview: true,
                    })
                }
                onClearHistory={() =>
                    dispatch({ type: "clearHistory", workspaceId: activeId })
                }
                onExportHistory={() =>
                    dispatch({ type: "exportHistory", workspaceId: activeId })
                }
            />
        </TabsContent>
    );
}
