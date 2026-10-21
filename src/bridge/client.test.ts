import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import {
    type ApplicationFailure,
    createBrowserClient,
    createDesktopClient,
} from "./client";

const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
    clearMocks();
    diagnostics.mockClear();
});

it("consumes the generated desktop command and representative browser state", async () => {
    mockIPC((command) => {
        if (command !== "greet") {
            throw new Error(`Unexpected command: ${command}`);
        }
        return {
            message: "Hello from the native boundary",
            epochMs: "1234",
        };
    });
    expect(await createDesktopClient().greet()).toEqual({
        status: "ok",
        data: {
            message: "Hello from the native boundary",
            epochMs: "1234",
        },
    });
    expect(await createBrowserClient().greet()).toEqual({
        status: "ok",
        data: {
            message: "Hello world from the browser fixture!",
            epochMs: "1234",
        },
    });
});

it.each([
    new Error("IPC disconnected"),
    "native handler missing",
    null,
    undefined,
    42,
    {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Missing typed data",
    },
    {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Invalid state",
        data: {
            state: "ready",
        },
    },
    {
        errorCode: "INVOCATION_FAILED",
        message: "Invalid command data",
        data: {
            command: 12,
        },
    },
])("normalizes unexpected rejection %j without fixture fallback", async (cause) => {
    mockIPC(() => Promise.reject(cause));
    const result = await createDesktopClient().greet();
    expect(result).toEqual({
        status: "error",
        error: {
            errorCode: "INVOCATION_FAILED",
            message:
                "The desktop invocation failed. Check the developer console.",
            data: {
                command: "greet",
            },
        },
        diagnostic: {
            command: "greet",
            cause,
        },
    });
    expect(diagnostics).toHaveBeenCalledWith(
        "Lumina desktop greet failed",
        cause
    );
});

it.each([
    {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Storage is starting",
        data: {
            state: "starting",
        },
    },
    {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Please try again shortly",
        data: {
            state: "starting",
        },
    },
    {
        errorCode: "APPLICATION_UNAVAILABLE",
        message: "Storage could not start",
        data: {
            state: "failed",
        },
    },
    {
        errorCode: "INTERNAL_ERROR",
        message: "Application operation failed",
    },
    {
        errorCode: "INVOCATION_FAILED",
        message: "IPC unavailable",
        data: {
            command: "greet",
        },
    },
] satisfies ApplicationFailure[])("preserves a validated public failure: %j", async (failure) => {
    mockIPC(() => Promise.reject(failure));
    const result = await createDesktopClient().greet();
    expect(result.status).toBe("error");
    if (result.status === "error") {
        expect(result.error).toEqual(failure);
        expect(result.diagnostic?.cause).toBe(failure);
    }
});

it("keeps generated data specific to its code", () => {
    expectTypeOf<
        Extract<
            ApplicationFailure,
            { errorCode: "APPLICATION_UNAVAILABLE" }
        >["data"]
    >().toEqualTypeOf<{
        state: "starting" | "failed";
    }>();
    expectTypeOf<
        Extract<ApplicationFailure, { errorCode: "INVOCATION_FAILED" }>["data"]
    >().toEqualTypeOf<{
        command: string;
    }>();
    expectTypeOf<
        Extract<ApplicationFailure, { errorCode: "INTERNAL_ERROR" }>
    >().not.toHaveProperty("data");
});

it("keeps unavailable IPC inspectable when the desktop adapter is explicitly selected", async () => {
    clearMocks();
    const result = await createDesktopClient().greet();
    expect(result.status).toBe("error");
    if (result.status === "error") {
        expect(result.error.errorCode).toBe("INVOCATION_FAILED");
        expect(result.diagnostic?.cause).toBeInstanceOf(Error);
    }
});
