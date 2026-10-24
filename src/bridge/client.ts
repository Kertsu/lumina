import { isTauri } from "@tauri-apps/api/core";
import {
    type ApplicationFailure,
    type ApplicationSnapshot,
    commands,
    type Greeting,
    type ReferenceRequest,
    type ReferenceResult,
} from "./bindings.gen";
import { browserReference, browserState } from "./fixtures";

export type {
    ApplicationFailure,
    ApplicationSnapshot,
    Greeting,
    ReferenceRequest,
    ReferenceResult,
} from "./bindings.gen";

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

// Choose once from the actual host. Invocation failure never changes adapters.
export const client = isTauri() ? createDesktopClient() : createBrowserClient();
