import type {
    Appearance as AcceptedAppearance,
    BookInformation,
    InformationCapture,
} from "@/bridge/client";
import type { BookMetadata } from "./fixtures";
import type { Appearance } from "./model";
import { defaultAppearance } from "./model";

export function viewAppearance(
    accepted: AcceptedAppearance,
    translationId: string,
    resources: Record<string, string>
): Appearance {
    const fallback = defaultAppearance();
    const backgrounds = Object.fromEntries(
        accepted.backgrounds.map((background) => [
            background.translationId,
            (background.assetId && resources[background.assetId]) ||
                background.fallbackColor ||
                fallback.background,
        ])
    );
    const active = accepted.backgrounds.find(
        (background) => background.translationId === translationId
    );
    return {
        ...fallback,
        fontFamily: accepted.fontFamily ?? fallback.fontFamily,
        bold: accepted.bold ?? fallback.bold,
        italic: accepted.italic ?? fallback.italic,
        underline: accepted.underline ?? fallback.underline,
        strike: accepted.strike ?? fallback.strike,
        color: accepted.color ?? fallback.color,
        bands:
            accepted.bands?.map((band) => ({
                min: band.lower,
                max:
                    band.upper === null
                        ? Number.POSITIVE_INFINITY
                        : band.upper - 1,
                size: band.fontSizePx ?? fallback.fontSize,
            })) ?? fallback.bands,
        background: backgrounds[translationId] ?? fallback.background,
        backgrounds,
        fit: active?.fit === "fit" ? "contain" : "cover",
    };
}

export function viewInformation(
    information: BookInformation | InformationCapture | null | undefined
): BookMetadata | null {
    return information
        ? {
              name: information.name,
              translationTitle: information.translationTitle,
              sourceUrl: information.metadataSourceUrl ?? undefined,
              rightsNotice: information.metadataRightsNotice ?? undefined,
              author: information.author ?? undefined,
              date: information.writingDate ?? undefined,
              location: information.writingLocation ?? undefined,
              attribution: information.metadataAttribution ?? undefined,
          }
        : null;
}

export function rgba(color: string): string {
    return color.length === 7 ? `${color}ff` : color;
}
