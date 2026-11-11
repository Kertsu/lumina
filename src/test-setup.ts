import { beforeEach } from "vitest";

// jsdom lacks the browser APIs used by Astryx's native modal and top-layer controls.
Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: {
        escape: (value: string) =>
            value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`),
        supports: () => false,
    },
});
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
    },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
        this.removeAttribute("open");
    },
});
const matches = HTMLElement.prototype.matches;
Object.defineProperty(HTMLElement.prototype, "matches", {
    configurable: true,
    value(this: HTMLElement, selector: string) {
        return selector === ":popover-open"
            ? this.hasAttribute("data-test-popover-open")
            : matches.call(this, selector);
    },
});
Object.defineProperty(HTMLElement.prototype, "showPopover", {
    configurable: true,
    value(this: HTMLElement) {
        this.setAttribute("data-test-popover-open", "");
        this.style.display = "block";
    },
});
Object.defineProperty(HTMLElement.prototype, "hidePopover", {
    configurable: true,
    value(this: HTMLElement) {
        this.removeAttribute("data-test-popover-open");
        this.style.display = "none";
    },
});
Object.defineProperty(HTMLElement.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
});

beforeEach(() => {
    if (!window.matchMedia) {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            writable: true,
            value: (media: string) => ({
                media,
                matches: media.includes("prefers-reduced-motion"),
                addEventListener() {},
                removeEventListener() {},
                addListener() {},
                removeListener() {},
            }),
        });
    }
});
