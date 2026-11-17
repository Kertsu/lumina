import type { SearchSummary } from "@/bridge/client";

export const searchModeLabels: Record<SearchSummary["mode"], string> = {
    allWords: "All words",
    phrase: "Phrase",
    wordStarts: "Word starts",
    containsText: "Contains text",
};

const scopeLabels = {
    entireBible: "Entire Bible",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    moses: "Books of Moses",
    gospels: "Gospels",
    epistlesOfPaul: "Epistles of Paul",
};

export function searchScopeLabel({ scope, bookName }: SearchSummary) {
    return typeof scope === "string"
        ? scopeLabels[scope]
        : (bookName ?? `Book ${scope.book}`);
}

export function matchingVerses(total: number) {
    return `${total.toLocaleString()} matching ${total === 1 ? "verse" : "verses"}`;
}
