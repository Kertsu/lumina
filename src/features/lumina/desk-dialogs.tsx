import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/shared/ui/sheet";
import { AppSettingsDialog } from "./app-settings-dialog";
import { AppearanceDialog } from "./appearance-dialog";
import { ChapterPanel } from "./chapter-panel";
import { useDeskContext } from "./desk-context";
import { InformationDialog } from "./information-dialog";
import { LibraryDialog } from "./library-dialog";
import { PreviewDialog } from "./preview-dialog";
import { ReferenceChoiceDialog } from "./reference-choice-dialog";
import { RemoveWorkspaceDialog } from "./remove-workspace-dialog";
import { RenameWorkspaceDialog } from "./rename-workspace-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
export function DeskDialogs() {
    const {
        controller,
        workspace,
        theme,
        setTheme,
        workspaces,
        translations,
        dispatch,
        appearanceOpen,
        setAppearanceOpen,
        settingsOpen,
        setSettingsOpen,
        libraryOpen,
        setLibraryOpen,
        chapterView,
        activePanelSheet,
        panelLayout,
        changeVerseSheetOpen,
        referenceInput,
        selectedThumbnail,
        verseSheetTrigger,
        focusReferenceAfterSheet,
        notify,
        patch,
        current,
    } = useDeskContext();
    return (
        <>
            <ReferenceChoiceDialog />
            <Sheet
                open={
                    panelLayout.overlay &&
                    chapterView === "sidebar" &&
                    activePanelSheet === "verses"
                }
                onOpenChange={changeVerseSheetOpen}
            >
                <SheetContent
                    side="left"
                    className="chapter-verses-sheet"
                    onOpenAutoFocus={(event) => {
                        if (selectedThumbnail.current) {
                            event.preventDefault();
                            selectedThumbnail.current.focus();
                        }
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        const target = focusReferenceAfterSheet.current
                            ? referenceInput.current
                            : verseSheetTrigger.current;
                        focusReferenceAfterSheet.current = false;
                        if (
                            !document.querySelector(
                                '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
                            )
                        ) {
                            target?.focus();
                        }
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>Chapter verses</SheetTitle>
                        <SheetDescription>
                            Choose a verse to display.
                        </SheetDescription>
                    </SheetHeader>
                    {panelLayout.overlay && chapterView === "sidebar" && (
                        <ChapterPanel />
                    )}
                </SheetContent>
            </Sheet>
            <AppSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                theme={theme}
                onThemeChange={setTheme}
            />
            <AppearanceDialog
                open={appearanceOpen}
                onOpenChange={setAppearanceOpen}
                appearance={workspace.appearance}
                verse={current}
                translation={workspace.translation}
                translations={translations}
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
                translations={translations}
                audiencesOpen={workspaces.some(
                    (item) => item.status !== "closed"
                )}
                review={controller.importReview}
                onRemove={(translationId) =>
                    dispatch({
                        type: "deleteTranslation",
                        translationId,
                    })
                }
                onReview={() =>
                    dispatch({
                        type: "importBible",
                    })
                }
                onPublish={(reviewId) =>
                    dispatch({
                        type: "publishImport",
                        reviewId,
                    })
                }
                onCancel={(reviewId) =>
                    dispatch({
                        type: "cancelImport",
                        reviewId,
                    })
                }
            />
            <PreviewDialog />
            <InformationDialog />
            <ShortcutsDialog />
            <RenameWorkspaceDialog />
            <RemoveWorkspaceDialog />
        </>
    );
}
