import { Sheet } from "@/shared/ui/sheet";
import { AppSettingsDialog } from "./app-settings-dialog";
import { AppearanceDialog } from "./appearance-dialog";
import { AudienceSettingsDialog } from "./audience-settings-dialog";
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
        notifySuccess,
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
                side="left"
                className="chapter-verses-sheet"
                onOpened={() => {
                    if (selectedThumbnail.current) {
                        selectedThumbnail.current.focus();
                    }
                }}
                onClosed={() => {
                    const target = focusReferenceAfterSheet.current
                        ? referenceInput.current
                        : verseSheetTrigger.current;
                    focusReferenceAfterSheet.current = false;
                    if (!document.querySelector("dialog[open]")) {
                        target?.focus();
                    }
                }}
                title="Chapter verses"
                description={<>Choose a verse to display.</>}
            >
                {panelLayout.overlay && chapterView === "sidebar" && (
                    <ChapterPanel />
                )}
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
                    notifySuccess("Appearance applied to this workspace");
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
                publishingImport={controller.publishingImport}
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
            <AudienceSettingsDialog />
            <RenameWorkspaceDialog />
            <RemoveWorkspaceDialog />
        </>
    );
}
