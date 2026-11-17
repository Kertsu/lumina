import type { SearchSummary } from "@/bridge/client";
import type { Appearance } from "./model";
import { matchingVerses, searchScopeLabel } from "./search-summary-labels";
import { slideImage } from "./slide-image";

export function SearchSummarySlide({
    summary,
    appearance,
}: {
    summary: SearchSummary;
    appearance: Appearance;
}) {
    const { background, fit } = appearance;
    const image = slideImage(background);
    return (
        <div
            className="verse-slide search-summary-slide"
            style={{
                backgroundImage: image ? `url("${image}")` : undefined,
                backgroundSize: fit,
                backgroundColor: /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(
                    background
                )
                    ? background
                    : undefined,
            }}
        >
            <div className="search-summary-slide-content">
                <p className="search-summary-slide-query">“{summary.query}”</p>
                <p className="search-summary-slide-tally">
                    {matchingVerses(summary.total)}
                </p>
                <p className="search-summary-slide-context">
                    {summary.translationTitle} · {searchScopeLabel(summary)}
                </p>
            </div>
        </div>
    );
}
