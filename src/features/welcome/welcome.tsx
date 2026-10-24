import { useState } from "react";
import {
    type ApplicationClient,
    type ApplicationFailure,
    type ClientResult,
    client as defaultClient,
    type Greeting,
} from "@/bridge/client";
import { Button } from "@/shared/ui/button";

function failureLabel(failure: ApplicationFailure): string {
    switch (failure.errorCode) {
        case "APPLICATION_UNAVAILABLE":
            return failure.data.state === "starting"
                ? "Application starting"
                : "Storage unavailable";
        case "INTERNAL_ERROR":
        case "WORKSPACE_NOT_FOUND":
        case "INVALID_REFERENCE":
        case "TRANSLATION_UNAVAILABLE":
        case "REFERENCE_UNAVAILABLE":
        case "STORAGE_FAILURE":
            return "Application error";
        case "INVOCATION_FAILED":
            return "Connection error";
    }
}

export function Welcome({
    client = defaultClient,
}: {
    client?: ApplicationClient;
}) {
    const [pending, setPending] = useState(false);
    const [result, setResult] = useState<ClientResult<Greeting> | null>(null);

    async function greet() {
        setPending(true);
        setResult(null);
        try {
            setResult(await client.greet());
        } finally {
            setPending(false);
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
            <img
                src="/lumina-mark-loading.svg"
                alt="Lumina in-app icon"
                className="size-40"
            />

            <div className="flex flex-col items-center gap-4">
                <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                    Lumina
                </h1>
                <p className="max-w-md text-lg text-muted-foreground">
                    Verse projection for the room, without exposing the
                    operator's screen.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={greet}
                >
                    Say hello
                </Button>
                {pending && <p role="status">Contacting application…</p>}
                {result?.status === "ok" && (
                    <div role="status">
                        <p>{result.data.message}</p>
                        <p>Current epoch: {result.data.epochMs}</p>
                    </div>
                )}
                {result?.status === "error" && (
                    <div role="alert">
                        <p>{failureLabel(result.error)}</p>
                        <p>{result.error.message}</p>
                    </div>
                )}
            </div>
        </main>
    );
}
