import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Development-only playground for experimenting with frontend components.
 *
 * This route provides a safe environment for testing UI components,
 * layouts, hooks, and other frontend behavior without affecting the
 * application's primary user flows.
 *
 * The route is intentionally unavailable in production and will return
 * a 404 when accessed outside of the development environment.
 *
 * DO NOT COMMIT THIS IF MODIFIED.
 */
export const Route = createFileRoute("/playground")({
  component: RouteComponent,
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
});

function RouteComponent() {
  return <div>Hello "/playground"!</div>;
}
