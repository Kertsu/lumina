import { BookOpen } from "lucide-react";
import type { CSSProperties } from "react";
import type { BookMetadata, Verse } from "./fixtures";
import { referenceLabel } from "./fixtures";
import type { Appearance } from "./model";
import { getBand } from "./model";

type SlideProps = {
    verse: Verse | null;
    appearance: Appearance;
    information?: boolean;
    miniature?: boolean;
    metadata?: BookMetadata | null;
};

export function VerseSlide({
    verse,
    appearance,
    information = false,
    miniature = false,
    metadata,
}: SlideProps) {
    const background =
        (verse && appearance.backgrounds?.[verse.translation]) ||
        appearance.background;
    const image =
        background === "mountains" || background === "forest"
            ? `/backgrounds/${background}.jpg`
            : /^(data:image\/|asset:|https?:|tauri:|blob:)/.test(background)
              ? background
              : undefined;
    const band = verse ? getBand(verse, appearance) : undefined;
    const style = {
        backgroundImage: image
            ? `linear-gradient(180deg,rgba(7,16,23,.3),rgba(7,16,23,.72)),url("${image}")`
            : undefined,
        backgroundSize: appearance.fit,
        backgroundColor: /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(background)
            ? background
            : undefined,
        "--verse-size": `${(band?.size ?? appearance.fontSize) / 12.8}cqw`,
        "--verse-font": appearance.fontFamily,
        "--verse-color": appearance.color,
    } as CSSProperties;

    return (
        <div
            className={`verse-slide ${miniature ? "miniature" : ""} ${background === "midnight" ? "slide-midnight" : ""} ${background === "linen" ? "slide-linen" : ""}`}
            style={style}
        >
            {information && metadata ? (
                <div className="book-slide">
                    <BookOpen />
                    <h2>{metadata.name}</h2>
                    {metadata.translationTitle && (
                        <small>{metadata.translationTitle}</small>
                    )}
                    <div className="book-slide-fields">
                        {[
                            ["Author", metadata.author],
                            ["Written", metadata.date],
                            ["Location", metadata.location],
                        ]
                            .filter(
                                ([, value]) =>
                                    value && value !== "Information unavailable"
                            )
                            .map(([label, value]) => (
                                <p key={label}>
                                    <span>{label}</span>
                                    {value}
                                </p>
                            ))}
                    </div>
                    {metadata.attribution && (
                        <small>{metadata.attribution}</small>
                    )}
                    {metadata.sourceUrl && (
                        <small>
                            <a href={metadata.sourceUrl}>
                                {metadata.sourceUrl}
                            </a>
                        </small>
                    )}
                    {metadata.rightsNotice && (
                        <small>{metadata.rightsNotice}</small>
                    )}
                </div>
            ) : verse ? (
                <>
                    <div className="slide-heading">
                        <span>{referenceLabel(verse)}</span>
                        <span>
                            {verse.translationTitle ?? verse.translation}
                        </span>
                    </div>
                    <p
                        className="scripture"
                        style={{
                            fontWeight: appearance.bold ? 700 : 500,
                            fontStyle: appearance.italic ? "italic" : "normal",
                            textDecoration:
                                [
                                    appearance.underline ? "underline" : "",
                                    appearance.strike ? "line-through" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ") || "none",
                        }}
                    >
                        {verse.text}
                    </p>
                </>
            ) : (
                <div className="slide-empty">
                    <BookOpen />
                    <p>No verse selected</p>
                    <span>Find a verse to begin</span>
                </div>
            )}
        </div>
    );
}
