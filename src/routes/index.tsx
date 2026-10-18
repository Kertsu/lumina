import { createFileRoute } from "@tanstack/react-router";
import { ProjectionDesk } from "@/features/lumina/projection-desk";

export const Route = createFileRoute("/")({
    component: ProjectionDesk,
});
