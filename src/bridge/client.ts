import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
    type ApplicationFailure,
    type ApplicationSnapshot,
    commands,
    events,
    type Greeting,
    type ReferenceRequest,
    type ReferenceResult,
} from "./bindings.gen";
import { browserBooks, browserReference, browserState } from "./fixtures";

export type {
    ApplicationFailure,
    ApplicationSnapshot,
    Greeting,
    ReferenceRequest,
    ReferenceResult,
} from "./bindings.gen";
export {
    type ContextMenuPosition,
    type NativeContextAction,
    popupNativeContextMenu,
} from "./context-menu";

export {
    observeOperatorFullscreen,
    usesOverlayTitlebar,
} from "./window-chrome";

export type ClientResult<T> =
    | {
          status: "ok";
          data: T;
      }
    | {
          status: "error";
          error: ApplicationFailure;
          diagnostic?: {
              command: string;
              cause: unknown;
          };
      };

export interface ApplicationClient {
    greet(): Promise<ClientResult<Greeting>>;
    getApplicationState(): Promise<ClientResult<ApplicationSnapshot>>;
    resolveReference(
        request: ReferenceRequest
    ): Promise<ClientResult<ReferenceResult>>;
}

export function createDesktopClient(): ApplicationClient {
    return {
        async greet() {
            return desktopCall("greet", commands.greet);
        },
        async getApplicationState() {
            return desktopCall(
                "get_application_state",
                commands.getApplicationState
            );
        },
        async resolveReference(request) {
            return desktopCall("resolve_reference", () =>
                commands.resolveReference(request)
            );
        },
    };
}

async function desktopCall<T>(
    command: string,
    invoke: () => Promise<T>
): Promise<ClientResult<T>> {
    try {
        return {
            status: "ok",
            data: await invoke(),
        };
    } catch (cause) {
        return normalizeFailure(cause, command);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isApplicationFailure(value: unknown): value is ApplicationFailure {
    if (!isRecord(value) || typeof value.message !== "string") {
        return false;
    }
    switch (value.errorCode) {
        case "APPLICATION_UNAVAILABLE":
            return (
                isRecord(value.data) &&
                (value.data.state === "starting" ||
                    value.data.state === "failed")
            );
        case "INTERNAL_ERROR":
        case "STORAGE_FAILURE":
            return true;
        case "INVALID_SEARCH":
        case "STALE_LIBRARY":
        case "INVALID_IMPORT":
        case "IMPORT_REVIEW_UNAVAILABLE":
        case "CONFIRMATION_REQUIRED":
        case "TRANSLATION_PROTECTED":
        case "AUDIENCES_OPEN":
        case "INVALID_REFERENCE_INPUT":
        case "UNKNOWN_BOOK":
        case "BOOK_UNAVAILABLE":
        case "STALE_REFERENCE_CHOICE":
            return (
                isRecord(value.data) &&
                typeof value.data.field === "string" &&
                typeof value.data.reason === "string"
            );
        case "WORKFLOW_REJECTED":
        case "NATIVE_OPERATION_FAILED":
            return (
                isRecord(value.data) &&
                typeof value.data.workspaceId === "string" &&
                typeof value.data.operation === "string"
            );
        case "PROJECTION_STORAGE_UNCERTAIN":
            return (
                isRecord(value.data) &&
                typeof value.data.workspaceId === "string" &&
                typeof value.data.actionId === "string"
            );
        case "INVALID_APPEARANCE":
            return (
                isRecord(value.data) &&
                typeof value.data.workspaceId === "string" &&
                typeof value.data.operation === "string"
            );
        case "ASSET_REJECTED":
            return (
                isRecord(value.data) && typeof value.data.reason === "string"
            );
        case "AUDIENCE_CLOSED":
        case "WORKSPACE_NOT_FOUND":
            return (
                isRecord(value.data) &&
                typeof value.data.workspaceId === "string"
            );
        case "TRANSLATION_UNAVAILABLE":
            return (
                isRecord(value.data) &&
                typeof value.data.translationId === "string"
            );
        case "INVALID_REFERENCE":
            return (
                isRecord(value.data) &&
                isCoordinate(value.data.coordinate) &&
                (value.data.field === "bookNumber" ||
                    value.data.field === "chapter" ||
                    value.data.field === "verse")
            );
        case "REFERENCE_UNAVAILABLE":
            return (
                isRecord(value.data) &&
                typeof value.data.translationId === "string" &&
                isCoordinate(value.data.coordinate)
            );
        case "INVOCATION_FAILED":
            return (
                isRecord(value.data) && typeof value.data.command === "string"
            );
        default:
            return false;
    }
}

function isCoordinate(value: unknown): boolean {
    return (
        isRecord(value) &&
        Number.isInteger(value.bookNumber) &&
        Number.isInteger(value.chapter) &&
        Number.isInteger(value.verse)
    );
}

function normalizeFailure(
    cause: unknown,
    command: string
): ClientResult<never> {
    // biome-ignore lint/suspicious/noConsole: ordinary IPC diagnostics retain the original rejection.
    console.error(`Lumina desktop ${command} failed`, cause);
    return {
        status: "error",
        error: isApplicationFailure(cause)
            ? cause
            : {
                  errorCode: "INVOCATION_FAILED",
                  message:
                      "The desktop invocation failed. Check the developer console.",
                  data: {
                      command,
                  },
              },
        diagnostic: {
            command,
            cause,
        },
    };
}

/** Representative UI state, without application transitions or native fallback. */
export function createBrowserClient(
    greeting: ClientResult<Greeting> = {
        status: "ok",
        data: {
            message: "Hello world from the browser fixture!",
            epochMs: "1234",
        },
    }
): ApplicationClient {
    return {
        async greet() {
            return greeting;
        },
        async getApplicationState() {
            return {
                status: "ok",
                data: browserState,
            };
        },
        async resolveReference() {
            return {
                status: "ok",
                data: browserReference,
            };
        },
    };
}

export const isDesktopHost = isTauri();

export function desktopWindowLabel(): string | null {
    return isDesktopHost ? getCurrentWindow().label : null;
}

// Choose once from the actual host. Invocation failure never changes adapters.
export const client = isTauri() ? createDesktopClient() : createBrowserClient();

export type * from "./bindings.gen";

/** Browser development renders representative state; native actions require desktop. */
function browserUnavailable<T>(): ClientResult<T> {
    return {
        status: "error",
        error: {
            errorCode: "APPLICATION_UNAVAILABLE",
            message:
                "Open the desktop app to use this workflow. The browser shows a fixed UI fixture.",
            data: {
                state: "failed",
            },
        },
    };
}

function bind<Args extends unknown[], T>(
    name: string,
    invoke: (...args: Args) => Promise<T>,
    fixture?: T
) {
    return (...args: Args): Promise<ClientResult<T>> =>
        isTauri()
            ? desktopCall(name, () => invoke(...args))
            : Promise.resolve(
                  fixture === undefined
                      ? browserUnavailable<T>()
                      : {
                            status: "ok",
                            data: fixture,
                        }
              );
}

export const quitApplication = bind(
    "quit_application",
    commands.quitApplication
);
export const requestQuitConfirmation = bind(
    "request_quit_confirmation",
    commands.requestQuitConfirmation
);

export const deskClient = {
    setApplicationTheme: bind(
        "set_application_theme",
        commands.setApplicationTheme
    ),
    navigationState: bind("navigation_state", commands.navigationState),
    importBackgroundData: bind(
        "import_background_data",
        commands.importBackgroundData
    ),
    openAudience: bind("open_audience", commands.openAudience),
    audienceState: bind("audience_state", commands.audienceState),
    acknowledgeAudience: bind(
        "acknowledge_audience",
        commands.acknowledgeAudience
    ),
    closeAudience: bind("close_audience", commands.closeAudience),
    blankAudience: bind("blank_audience", commands.blankAudience),
    resumeAudience: bind("resume_audience", commands.resumeAudience),
    addWorkspace: bind("add_workspace", commands.addWorkspace),
    renameWorkspace: bind("rename_workspace", commands.renameWorkspace),
    activateWorkspace: bind("activate_workspace", commands.activateWorkspace),
    reorderWorkspaces: bind("reorder_workspaces", commands.reorderWorkspaces),
    removeWorkspace: bind("remove_workspace", commands.removeWorkspace),
    selectTranslation: bind("select_translation", commands.selectTranslation),
    changeCurrentTranslation: bind(
        "change_current_translation",
        commands.changeCurrentTranslation
    ),
    dismissPreview: bind("dismiss_preview", commands.dismissPreview),
    sendPreview: bind("send_preview", commands.sendPreview),
    navigateVerse: bind("navigate_verse", commands.navigateVerse),
    setHideCursor: bind("set_hide_cursor", commands.setHideCursor),
    setAudienceFullscreen: bind(
        "set_audience_fullscreen",
        commands.setAudienceFullscreen
    ),
    setAudienceAlwaysOnTop: bind(
        "set_audience_always_on_top",
        commands.setAudienceAlwaysOnTop
    ),
    readHistory: bind("read_history", commands.readHistory),
    recallHistory: bind("recall_history", commands.recallHistory),
    copyHistory: bind("copy_history", commands.copyHistory),
    exportHistory: bind("export_history", commands.exportHistory),
    clearHistory: bind("clear_history", commands.clearHistory),
    applyAppearance: bind("apply_appearance", commands.applyAppearance),
    appearanceState: bind("appearance_state", commands.appearanceState),
    resolveReferenceInput: bind(
        "resolve_reference_input",
        commands.resolveReferenceInput
    ),
    searchVerses: bind("search_verses", commands.searchVerses),
    reviewImport: bind("review_import", commands.reviewImport),
    commitImport: bind("commit_import", commands.commitImport),
    cancelImport: bind("cancel_import", commands.cancelImport),
    deleteTranslation: bind("delete_translation", commands.deleteTranslation),
    bookInformation: bind("book_information", commands.bookInformation, null),
    previewVerse: bind("preview_verse", commands.previewVerse),
    selectVerse: bind("select_verse", commands.selectVerse),
    listBooks: bind("list_books", commands.listBooks, browserBooks),
    chapterVerses: bind("chapter_verses", commands.chapterVerses, [
        browserReference.verse,
    ]),
    pickBibleImport: bind("pick_bible_import", commands.pickBibleImport),
    saveHistory: bind("save_history", commands.saveHistory),
    setInformationMode: bind(
        "set_information_mode",
        commands.setInformationMode
    ),
    libraryRevision: bind("library_revision", commands.libraryRevision),
    importBackground: bind("import_background", commands.importBackground),
    builtinBackground: bind("builtin_background", commands.builtinBackground),
    readAssetUri: bind("read_asset_uri", commands.readAssetUri),
};

export async function onApplicationChanged(
    listener: () => void
): Promise<() => void> {
    if (!isTauri()) {
        return () => {};
    }
    return events.applicationChanged.listen(listener);
}

export async function onAudienceOutput(
    listener: (output: import("./bindings.gen").AudienceOutput) => void
): Promise<() => void> {
    if (!isTauri()) {
        return () => {};
    }
    return events.audienceUpdated.listen((event) =>
        listener(event.payload.output)
    );
}
