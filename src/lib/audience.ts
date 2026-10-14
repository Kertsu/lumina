import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Appearance, Selection } from "./types";

export type AudiencePayload = {
    selection: Selection | null;
    appearance: Appearance;
    blank: boolean;
};

type BrowserMessage =
    | { type: "ready" }
    | { type: "payload"; payload: AudiencePayload | null }
    | { type: "fullscreen"; value: boolean };

let browserAudience: Window | null = null;
let browserPayload: AudiencePayload | null = null;
let operatorChannel: BroadcastChannel | null = null;
let session: string | null = null;
const watchers = new Set<(open: boolean) => void>();

export function isDesktop(): boolean {
    return typeof window !== "undefined" && isTauri();
}

function browserSession(): string {
    if (session === null) session = crypto.randomUUID();
    return session;
}

function notifyBrowser(open: boolean): void {
    for (const callback of watchers) callback(open);
}

function channel(): BroadcastChannel {
    if (!operatorChannel) {
        operatorChannel = new BroadcastChannel(
            `lumina-audience-${browserSession()}`
        );
        operatorChannel.onmessage = (event: MessageEvent<BrowserMessage>) => {
            if (event.data.type === "ready") {
                operatorChannel?.postMessage({
                    type: "payload",
                    payload: browserPayload,
                });
            }
        };
        window.addEventListener("pagehide", () => browserAudience?.close());
    }
    return operatorChannel;
}

export async function openAudience(): Promise<void> {
    if (isDesktop()) return invoke("open_audience");
    if (browserAudience && !browserAudience.closed) {
        browserAudience.focus();
        return;
    }
    browserPayload = null;
    channel();
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("audience", "1");
    url.searchParams.set("session", browserSession());
    browserAudience = window.open(
        url,
        `lumina-audience-${browserSession()}`,
        "popup,width=1280,height=720"
    );
    if (!browserAudience)
        throw new Error("Allow popups to open the audience preview.");
    notifyBrowser(true);
}

export async function closeAudience(): Promise<void> {
    if (isDesktop()) return invoke("close_audience");
    browserAudience?.close();
    browserAudience = null;
    browserPayload = null;
    notifyBrowser(false);
}

export async function publishAudience(payload: AudiencePayload): Promise<void> {
    if (isDesktop())
        return invoke("publish_audience", {
            payload,
        });
    if (!browserAudience || browserAudience.closed) {
        throw new Error("Open Audience before sending content live.");
    }
    browserPayload = structuredClone(payload);
    channel().postMessage({
        type: "payload",
        payload: browserPayload,
    });
}

export async function setAudienceFullscreen(value: boolean): Promise<void> {
    if (isDesktop())
        return invoke("set_audience_fullscreen", {
            value,
        });
    if (!browserAudience || browserAudience.closed) {
        throw new Error("Open Audience before changing fullscreen.");
    }
    // Browser fullscreen requires a gesture in the audience window itself.
    channel().postMessage({
        type: "fullscreen",
        value,
    });
    if (value)
        throw new Error(
            "Click Enter fullscreen in the audience preview; browser fullscreen requires a gesture there."
        );
}

export async function setOperatorOnTop(value: boolean): Promise<void> {
    if (isDesktop())
        return invoke("set_operator_on_top", {
            value,
        });
    if (value)
        throw new Error("Always on top requires the desktop application.");
}

export async function setCursorRestriction(value: boolean): Promise<void> {
    if (isDesktop())
        return invoke("set_cursor_restriction", {
            value,
        });
    if (value) {
        throw new Error(
            "Cursor restriction requires native platform integration; browser preview cannot prevent pointer entry."
        );
    }
}

export async function watchAudience(
    callback: (open: boolean) => void
): Promise<() => void> {
    if (isDesktop()) {
        let receivedEvent = false;
        const unlisten = await listen<boolean>(
            "lumina:audience-open",
            (event) => {
                receivedEvent = true;
                callback(event.payload);
            }
        );
        try {
            const open = await invoke<boolean>("audience_is_open");
            if (!receivedEvent) callback(open);
        } catch (error) {
            unlisten();
            throw error;
        }
        return unlisten;
    }
    channel();
    watchers.add(callback);
    callback(Boolean(browserAudience && !browserAudience.closed));
    const timer = window.setInterval(() => {
        if (browserAudience?.closed) {
            browserAudience = null;
            browserPayload = null;
            notifyBrowser(false);
        }
    }, 500);
    return () => {
        watchers.delete(callback);
        window.clearInterval(timer);
    };
}

export async function receiveAudience(
    callback: (payload: AudiencePayload | null) => void,
    onFullscreenRequest: (value: boolean) => void
): Promise<() => void> {
    if (isDesktop()) {
        let receivedEvent = false;
        const unlisten = await listen<AudiencePayload | null>(
            "lumina:audience-payload",
            (event) => {
                receivedEvent = true;
                callback(event.payload);
            }
        );
        try {
            const payload = await invoke<AudiencePayload | null>(
                "audience_payload"
            );
            if (!receivedEvent) callback(payload);
        } catch (error) {
            unlisten();
            throw error;
        }
        return unlisten;
    }
    const audienceSession = new URL(window.location.href).searchParams.get(
        "session"
    );
    if (!audienceSession) return () => {};
    const audienceChannel = new BroadcastChannel(
        `lumina-audience-${audienceSession}`
    );
    audienceChannel.onmessage = (event: MessageEvent<BrowserMessage>) => {
        if (event.data.type === "payload") callback(event.data.payload);
        if (event.data.type === "fullscreen")
            onFullscreenRequest(event.data.value);
    };
    audienceChannel.postMessage({
        type: "ready",
    });
    return () => {
        audienceChannel.close();
    };
}
