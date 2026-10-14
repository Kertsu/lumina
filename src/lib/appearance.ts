import type { Appearance, SizeBand } from "./types";

export function defaultAppearance(): Appearance {
    return {
        family: "Georgia, serif",
        bold: false,
        italic: false,
        underline: false,
        strikeout: false,
        color: "#ffffff",
        bands: [
            {
                max: 120,
                size: 76,
            },
            {
                max: 240,
                size: 64,
            },
            {
                max: 400,
                size: 52,
            },
            {
                max: 100000,
                size: 40,
            },
        ],
        backgrounds: {},
    };
}

export function characterCount(text: string): number {
    return Array.from(text).length;
}

export function sizeBand(text: string, appearance: Appearance): SizeBand {
    const bands = [...appearance.bands].sort((a, b) => a.max - b.max);
    return (
        bands.find((band) => characterCount(text) <= band.max) ??
        bands[bands.length - 1] ?? {
            max: 100000,
            size: 40,
        }
    );
}
