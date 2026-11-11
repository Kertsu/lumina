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
// Closed native dialogs cannot take focus, even if a descendant requests it.
const focus = HTMLElement.prototype.focus;
Object.defineProperty(HTMLElement.prototype, "focus", {
    configurable: true,
    value(this: HTMLElement, options?: FocusOptions) {
        if (!this.closest("dialog:not([open])")) {
            focus.call(this, options);
        }
    },
});
const dialogOpeners = new WeakMap<HTMLDialogElement, HTMLElement>();
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
        const opener = this.ownerDocument.activeElement;
        if (opener instanceof HTMLElement && !this.contains(opener)) {
            dialogOpeners.set(this, opener);
        }
        this.setAttribute("open", "");
    },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
        this.removeAttribute("open");
        dialogOpeners.get(this)?.focus();
        dialogOpeners.delete(this);
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
