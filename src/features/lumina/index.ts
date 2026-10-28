import { DeskDialogs } from "./desk-dialogs";
import { DeskStatus } from "./desk-status";
import { DeskRoot, DeskSurface } from "./projection-desk";
import { QuickReferenceBar } from "./quick-reference-bar";
import { WorkspaceBar } from "./workspace-bar";
import { WorkspaceBody } from "./workspace-body";

export type {
    BookMetadata,
    Translation,
    TranslationId,
    Verse,
} from "./fixtures";
export type {
    Appearance,
    DeskAction,
    DeskController,
    HistoryEntry,
    ImportReview,
    SearchMode,
    Workspace,
} from "./model";
export { defaultAppearance, graphemeCount } from "./model";
export { ProjectionDesk } from "./projection-desk";
export { VerseSlide } from "./verse-slide";

export const OperatorDesk = {
    Root: DeskRoot,
    Surface: DeskSurface,
    Workspaces: WorkspaceBar,
    Workspace: WorkspaceBody,
    QuickReference: QuickReferenceBar,
    Status: DeskStatus,
    Dialogs: DeskDialogs,
};
export { AudienceReceiver } from "./audience-receiver";
export { IntegratedOperator } from "./integrated-operator";
