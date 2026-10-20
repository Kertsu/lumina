import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from "@tanstack/react-router";
import { initializeAppTheme } from "@/features/lumina/use-app-theme";

import appCss from "../styles.css?url";

export const RootComponent: React.FC = () => {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: initializeAppTheme,
                    }}
                />
                <HeadContent />
            </head>
            <body className="antialiased">
                <Outlet />
                <Scripts />
            </body>
        </html>
    );
};

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "Lumina",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),

    component: RootComponent,
});
