import { useEffect, useState } from "react";

export const CHAPTER_PANEL_MIN_WIDTH = 122;
export const SEARCH_PANEL_MIN_WIDTH = 220;

const PREVIEW_MIN_WIDTH = 520;
const DIVIDER_WIDTH = 44;

export function usePanelLayout({
    chapterSidebar,
    chapterCollapsed,
    searchOpen,
    chapterPreferredWidth,
    searchPreferredWidth,
}: {
    chapterSidebar: boolean;
    chapterCollapsed: boolean;
    searchOpen: boolean;
    chapterPreferredWidth: number;
    searchPreferredWidth: number;
}) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [availableWidth, setAvailableWidth] = useState(0);

    useEffect(() => {
        if (!container) return;
        const measure = () => {
            const main = container.querySelector(".operator-content");
            const style = main ? window.getComputedStyle(main) : null;
            const padding = style
                ? Number.parseFloat(style.paddingLeft) +
                  Number.parseFloat(style.paddingRight)
                : 0;
            setAvailableWidth(Math.max(0, container.clientWidth - padding));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [container]);

    const dividers = DIVIDER_WIDTH * (chapterSidebar ? 2 : 1);
    const minimumDockedWidth =
        PREVIEW_MIN_WIDTH +
        dividers +
        SEARCH_PANEL_MIN_WIDTH +
        (chapterSidebar ? CHAPTER_PANEL_MIN_WIDTH : 0);
    const overlay = availableWidth < minimumDockedWidth;
    const chapterOverlay =
        availableWidth <
        PREVIEW_MIN_WIDTH +
            DIVIDER_WIDTH * 2 +
            SEARCH_PANEL_MIN_WIDTH +
            CHAPTER_PANEL_MIN_WIDTH;
    const budget = Math.max(0, availableWidth - PREVIEW_MIN_WIDTH - dividers);
    const chapterVisible = chapterSidebar && !chapterCollapsed;
    const chapterCap = Math.max(
        CHAPTER_PANEL_MIN_WIDTH,
        Math.min(320, availableWidth * 0.25)
    );
    const searchCap = Math.max(
        SEARCH_PANEL_MIN_WIDTH,
        Math.min(420, availableWidth * 0.32)
    );
    const searchWidth = Math.max(
        SEARCH_PANEL_MIN_WIDTH,
        Math.min(
            searchPreferredWidth,
            searchCap,
            budget - (chapterVisible ? CHAPTER_PANEL_MIN_WIDTH : 0)
        )
    );
    const chapterMaxWidth = Math.max(
        CHAPTER_PANEL_MIN_WIDTH,
        Math.min(chapterCap, budget - (searchOpen ? searchWidth : 0))
    );
    const chapterWidth = Math.max(
        CHAPTER_PANEL_MIN_WIDTH,
        Math.min(chapterPreferredWidth, chapterMaxWidth)
    );
    const searchMaxWidth = Math.max(
        SEARCH_PANEL_MIN_WIDTH,
        Math.min(searchCap, budget - (chapterVisible ? chapterWidth : 0))
    );

    return {
        containerRef: setContainer,
        overlay,
        chapterOverlay,
        chapterWidth,
        chapterMaxWidth,
        searchWidth,
        searchMaxWidth,
    };
}
