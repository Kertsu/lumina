import { createRootRoute, Outlet } from "@tanstack/react-router";
import { DesktopQuitShortcut } from "@/features/desktop";

export const Route = createRootRoute({
    component: Root,
});

function Root() {
    return (
        <>
            <DesktopQuitShortcut />
            <Outlet />
        </>
    );
}
