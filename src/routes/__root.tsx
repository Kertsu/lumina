import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { DesktopQuitShortcut } from "@/features/desktop";

export const Route = createRootRoute({
    component: Root,
});

function Root() {
    return (
        <>
            <DesktopQuitShortcut />
            <Outlet />
            <Toaster
                position="bottom-right"
                theme="system"
                richColors
                duration={4500}
            />
        </>
    );
}
