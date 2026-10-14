import type { CSSProperties } from "react";
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

export function verseStyle(
    text: string,
    appearance: Appearance,
    scale = 1
): CSSProperties {
    return {
        fontFamily: appearance.family,
        fontSize: sizeBand(text, appearance).size * scale,
        fontWeight: appearance.bold ? 700 : 400,
        fontStyle: appearance.italic ? "italic" : "normal",
        color: appearance.color,
        textDecoration:
            [
                appearance.underline ? "underline" : "",
                appearance.strikeout ? "line-through" : "",
            ]
                .filter(Boolean)
                .join(" ") || "none",
        lineHeight: 1.35,
        overflowWrap: "anywhere",
    };
}

export function backgroundStyle(
    translationId: string,
    appearance: Appearance
): CSSProperties {
    const background = appearance.backgrounds[translationId];
    return {
        backgroundColor: background?.color ?? "#172132",
        backgroundImage: background?.image
            ? `url("${background.image.replaceAll('"', "%22")}")`
            : undefined,
        backgroundSize: background?.fit === "fit" ? "contain" : "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    };
}

export function updateBand(
    appearance: Appearance,
    max: number,
    size: number
): Appearance {
    return {
        ...appearance,
        bands: appearance.bands.map((band) =>
            band.max === max
                ? {
                      ...band,
                      size: Math.min(160, Math.max(16, size)),
                  }
                : band
        ),
    };
}
