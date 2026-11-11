import { LayerProvider } from "@astryxdesign/core/Layer";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { DesktopQuitShortcut } from "@/features/desktop";

export const Route = createRootRoute({
    component: Root,
});

function Root() {
    return (
        <LayerProvider
            toast={{
                position: "bottomEnd",
            }}
        >
            <DesktopQuitShortcut />
            <Outlet />
        </LayerProvider>
    );
}
