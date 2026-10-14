import type { CSSProperties } from "react";

const paths = {
    search: "m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    monitor: "M3 4h18v13H3z M8 21h8 M12 17v4",
    settings:
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    chevron: "m9 5 7 7-7 7",
    plus: "M12 5v14 M5 12h14",
    close: "m6 6 12 12 M6 18 18 6",
    copy: "M8 8h13v13H8z M16 8V3H3v13h5",
    history: "M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2",
    play: "m8 4 12 8-12 8z",
    book: "M12 5C9 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1z M12 5v15",
    download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    pointer: "m4 2 16 10-8 2-3 8z",
} as const;

export function Icon({
    name,
    size = 18,
    style,
}: {
    name: keyof typeof paths;
    size?: number;
    style?: CSSProperties;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
            aria-hidden="true"
        >
            <path d={paths[name]} />
        </svg>
    );
}
