/** Closed Astryx surfaces stay mounted; only visible layers suspend desk shortcuts. */
export function hasOpenInteractionLayer() {
    return Array.from(
        document.querySelectorAll<HTMLElement>(
            '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]'
        )
    ).some((surface) => {
        const dialog = surface.closest("dialog");
        if (dialog) {
            return dialog.open;
        }
        const popover = surface.closest<HTMLElement>("[popover]");
        if (popover) {
            return typeof popover.showPopover === "function"
                ? popover.matches(":popover-open")
                : popover.style.display !== "none";
        }
        return !surface.hidden && getComputedStyle(surface).display !== "none";
    });
}
