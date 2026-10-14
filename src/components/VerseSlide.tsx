import { sizeBand } from "../lib/appearance";
import type { Appearance, Selection } from "../lib/types";

export function VerseSlide({
    selection,
    appearance,
    blank = false,
    audience = false,
}: {
    selection: Selection | null;
    appearance: Appearance;
    blank?: boolean;
    audience?: boolean;
}) {
    const background = selection
        ? appearance.backgrounds[selection.translationId]
        : undefined;
    const band = sizeBand(selection?.text ?? "", appearance);
    return (
        <div
            className={`verse-slide ${audience ? "full-slide" : ""}`}
            style={{
                backgroundColor:
                    blank || !selection
                        ? "#000000"
                        : (background?.color ?? "#172132"),
                backgroundImage:
                    !blank && background?.image
                        ? `linear-gradient(#0006,#0006),url(${background.image})`
                        : undefined,
                backgroundSize: background?.fit === "fit" ? "contain" : "cover",
            }}
        >
            {!blank && selection ? (
                <div className="slide-content">
                    <p
                        className="scripture"
                        style={{
                            fontFamily: appearance.family,
                            fontWeight: appearance.bold ? 700 : 400,
                            fontStyle: appearance.italic ? "italic" : "normal",
                            color: appearance.color,
                            fontSize: `${(band?.size ?? 64) / 19.2}cqw`,
                            textDecoration: [
                                appearance.underline ? "underline" : "",
                                appearance.strikeout ? "line-through" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                        }}
                    >
                        {selection.text}
                    </p>
                    <div className="slide-reference">
                        {selection.bookName} {selection.chapter}:
                        {selection.verse}
                        <span>
                            {" "}
                            · {selection.translationTitle} (
                            {selection.abbreviation})
                        </span>
                    </div>
                </div>
            ) : (
                <div className="blank-slide">
                    {!audience && (
                        <>
                            <IconPlaceholder />
                            <span>
                                {blank
                                    ? "Audience output is blank"
                                    : "Ready when you are"}
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function IconPlaceholder() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M20 4v32M4 20h32M9 9l22 22M9 31 31 9"
                stroke="currentColor"
                strokeWidth="1"
            />
            <circle cx="20" cy="20" r="9" stroke="currentColor" />
        </svg>
    );
}
