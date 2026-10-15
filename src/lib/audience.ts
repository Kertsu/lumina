import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Appearance, Selection } from "./types";

export type AudiencePayload = {
    selection: Selection | null;
    appearance: Appearance;
    blank: boolean;
};

type AudienceMessage = {
    workspaceId: string;
    payload: AudiencePayload | null;
};

type OpenMessage = {
    workspaceId: string;
    open: boolean;
};

type BrowserMessage =
    | { workspaceId: string; type: "ready" }
    | { workspaceId: string; type: "payload"; payload: AudiencePayload | null }
    | { workspaceId: string; type: "fullscreen"; value: boolean };

type BrowserOutput = {
    window: Window | null;
    payload: AudiencePayload | null;
    channel: BroadcastChannel;
    watchers: Set<(open: boolean) => void>;
};

const browserOutputs = new Map<string, BrowserOutput>();
let session: string | null = null;
const lifecycleTails = new Map<string, Promise<void>>();

function lifecycle(
    workspaceId: string,
    action: () => Promise<void>
): Promise<void> {
    const previous = lifecycleTails.get(workspaceId);
    const operation = previous
        ? previous.catch(() => {}).then(action)
        : action();
    const settled = operation.catch(() => {});
    lifecycleTails.set(workspaceId, settled);
    void settled.then(() => {
        if (lifecycleTails.get(workspaceId) === settled)
            lifecycleTails.delete(workspaceId);
    });
    return operation;
}

export function isDesktop(): boolean {
    return typeof window !== "undefined" && isTauri();
}

function browserSession(): string {
    if (session === null) session = crypto.randomUUID();
    return session;
}

function channelName(operatorSession: string, workspaceId: string): string {
    return `lumina-audience-${operatorSession}-${workspaceId}`;
}

function notifyBrowser(output: BrowserOutput, open: boolean): void {
    for (const callback of output.watchers) callback(open);
}

function browserOutput(workspaceId: string): BrowserOutput {
    const existing = browserOutputs.get(workspaceId);
    if (existing) return existing;
    const output: BrowserOutput = {
        window: null,
        payload: null,
        channel: new BroadcastChannel(
            channelName(browserSession(), workspaceId)
        ),
        watchers: new Set(),
    };
    output.channel.onmessage = (event: MessageEvent<BrowserMessage>) => {
        if (event.data.workspaceId !== workspaceId) return;
        if (event.data.type === "ready") {
            output.channel.postMessage({
                workspaceId,
                type: "payload",
                payload: output.payload,
            });
        }
    };
    browserOutputs.set(workspaceId, output);
    window.addEventListener("pagehide", () => output.window?.close());
    return output;
}

export async function openAudience(workspaceId: string): Promise<void> {
    return lifecycle(workspaceId, async () => {
        if (isDesktop())
            return invoke("open_audience", {
                workspaceId,
            });
        const output = browserOutput(workspaceId);
        if (output.window && !output.window.closed) {
            output.window.focus();
            return;
        }
        output.payload = null;
        const url = new URL(window.location.href);
        url.pathname = "/";
        url.search = "";
        url.searchParams.set("audience", "1");
        url.searchParams.set("workspaceId", workspaceId);
        url.searchParams.set("session", browserSession());
        output.window = window.open(
            url,
            channelName(browserSession(), workspaceId),
            "popup,width=1280,height=720"
        );
        if (!output.window)
            throw new Error(
                "Allow popups to open this workspace's audience preview."
            );
        notifyBrowser(output, true);
    });
}

export async function closeAudience(workspaceId: string): Promise<void> {
    return lifecycle(workspaceId, async () => {
        if (isDesktop())
            return invoke("close_audience", {
                workspaceId,
            });
        const output = browserOutputs.get(workspaceId);
        if (!output) return;
        output.window?.close();
        output.window = null;
        output.payload = null;
        notifyBrowser(output, false);
    });
}

export async function publishAudience(
    workspaceId: string,
    payload: AudiencePayload
): Promise<void> {
    return lifecycle(workspaceId, async () => {
        if (isDesktop())
            return invoke("publish_audience", {
                workspaceId,
                payload,
            });
        const output = browserOutput(workspaceId);
        if (!output.window || output.window.closed) {
            throw new Error(
                "Open this workspace's audience before sending content live."
            );
        }
        output.payload = structuredClone(payload);
        output.channel.postMessage({
            workspaceId,
            type: "payload",
            payload: output.payload,
        });
    });
}

export async function setAudienceFullscreen(
    workspaceId: string,
    value: boolean
): Promise<void> {
    return lifecycle(workspaceId, async () => {
        if (isDesktop())
            return invoke("set_audience_fullscreen", {
                workspaceId,
                value,
            });
        const output = browserOutput(workspaceId);
        if (!output.window || output.window.closed) {
            throw new Error(
                "Open this workspace's audience before changing fullscreen."
            );
        }
        output.channel.postMessage({
            workspaceId,
            type: "fullscreen",
            value,
        });
        if (value)
            throw new Error(
                "Click Enter fullscreen in this audience preview; browser fullscreen requires a gesture there."
            );
    });
}

export async function setOperatorOnTop(value: boolean): Promise<void> {
    if (isDesktop())
        return invoke("set_operator_on_top", {
            value,
        });
    if (value)
        throw new Error("Always on top requires the desktop application.");
}

export async function setCursorRestriction(
    workspaceId: string,
    value: boolean
): Promise<void> {
    return lifecycle(workspaceId, async () => {
        if (isDesktop())
            return invoke("set_cursor_restriction", {
                workspaceId,
                value,
            });
        if (value) {
            throw new Error(
                "Cursor restriction requires native platform integration; browser preview cannot prevent pointer entry."
            );
        }
    });
}

// Subscribe before reading the snapshot; an event always wins over an older read.
async function watchNativeWorkspace<Message extends { workspaceId: string }>(
    workspaceId: string,
    eventName: string,
    callback: (message: Message) => void,
    snapshot?: () => Promise<Message>
): Promise<() => void> {
    let receivedEvent = false;
    let active = true;
    const unlisten = await listen<Message>(eventName, (event) => {
        if (!active || event.payload.workspaceId !== workspaceId) return;
        receivedEvent = true;
        callback(event.payload);
    });
    const stop = () => {
        active = false;
        unlisten();
    };
    try {
        if (snapshot) {
            const message = await snapshot();
            if (!receivedEvent && message.workspaceId === workspaceId)
                callback(message);
        }
    } catch (error) {
        stop();
        throw error;
    }
    return stop;
}

export async function watchAudienceRecovery(
    workspaceId: string,
    callback: (message: string) => void
): Promise<() => void> {
    if (!isDesktop()) return () => {};
    return watchNativeWorkspace<{
        workspaceId: string;
        message: string;
    }>(workspaceId, "lumina:audience-recovery", (message) =>
        callback(message.message)
    );
}

export async function watchCursorRestriction(
    workspaceId: string,
    callback: (enabled: boolean, message?: string) => void
): Promise<() => void> {
    if (!isDesktop()) {
        callback(false);
        return () => {};
    }
    return watchNativeWorkspace<{
        workspaceId: string;
        enabled: boolean;
        message: string | null;
    }>(
        workspaceId,
        "lumina:cursor-restriction",
        (message) => callback(message.enabled, message.message ?? undefined),
        async () => ({
            workspaceId,
            enabled: await invoke<boolean>("cursor_restriction_enabled", {
                workspaceId,
            }),
            message: null,
        })
    );
}

export async function watchAudience(
    workspaceId: string,
    callback: (open: boolean) => void
): Promise<() => void> {
    if (isDesktop()) {
        return watchNativeWorkspace<OpenMessage>(
            workspaceId,
            "lumina:audience-open",
            (message) => callback(message.open),
            async () => ({
                workspaceId,
                open: await invoke<boolean>("audience_is_open", {
                    workspaceId,
                }),
            })
        );
    }
    const output = browserOutput(workspaceId);
    output.watchers.add(callback);
    callback(Boolean(output.window && !output.window.closed));
    const timer = window.setInterval(() => {
        if (output.window?.closed) {
            output.window = null;
            output.payload = null;
            notifyBrowser(output, false);
        }
    }, 500);
    return () => {
        output.watchers.delete(callback);
        window.clearInterval(timer);
    };
}

export async function receiveAudience(
    callback: (payload: AudiencePayload | null) => void,
    onFullscreenRequest: (value: boolean) => void
): Promise<() => void> {
    const params = new URL(window.location.href).searchParams;
    const workspaceId = params.get("workspaceId");
    if (!workspaceId)
        throw new Error("Audience workspace identity is missing.");
    if (isDesktop()) {
        return watchNativeWorkspace<AudienceMessage>(
            workspaceId,
            "lumina:audience-payload",
            (message) => callback(message.payload),
            () =>
                invoke<AudienceMessage>("audience_payload", {
                    workspaceId,
                })
        );
    }
    const audienceSession = params.get("session");
    if (!audienceSession)
        throw new Error("Audience operator identity is missing.");
    const audienceChannel = new BroadcastChannel(
        channelName(audienceSession, workspaceId)
    );
    audienceChannel.onmessage = (event: MessageEvent<BrowserMessage>) => {
        if (event.data.workspaceId !== workspaceId) return;
        if (event.data.type === "payload") callback(event.data.payload);
        if (event.data.type === "fullscreen")
            onFullscreenRequest(event.data.value);
    };
    audienceChannel.postMessage({
        workspaceId,
        type: "ready",
    });
    return () => {
        audienceChannel.close();
    };
}
