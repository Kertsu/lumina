import { createFileRoute } from "@tanstack/react-router";
import { AudienceReceiver } from "@/features/lumina";

export const Route = createFileRoute("/audience")({
    component: AudienceReceiver,
});
