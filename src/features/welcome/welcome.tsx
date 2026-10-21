export function Welcome() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
            <img
                src="/lumina-mark-loading.svg"
                alt="Lumina in-app icon"
                className="size-40"
            />

            <div className="flex flex-col items-center gap-4">
                <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                    Lumina
                </h1>
                <p className="max-w-md text-lg text-muted-foreground">
                    Verse projection for the room, without exposing the
                    operator's screen.
                </p>
            </div>
        </main>
    );
}
