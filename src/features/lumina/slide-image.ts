export function slideImage(background: string): string | undefined {
    if (background === "mountains" || background === "forest") {
        return `/backgrounds/${background}.jpg`;
    }
    return /^(data:image\/|asset:|https?:|tauri:|blob:)/.test(background)
        ? background
        : undefined;
}
