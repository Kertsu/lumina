import { createFileRoute } from "@tanstack/react-router";
import { IntegratedOperator } from "@/features/lumina";

export const Route = createFileRoute("/")({
    component: IntegratedOperator,
});
