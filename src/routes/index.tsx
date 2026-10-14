import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Audience } from "../components/Audience";
import { Operator } from "../components/Operator";

function Home() {
    const [audience, setAudience] = useState<boolean | null>(null);
    useEffect(() => {
        setAudience(
            new URLSearchParams(window.location.search).get("audience") === "1"
        );
    }, []);
    if (audience === null) return <div className="startup" />;
    return audience ? <Audience /> : <Operator />;
}

export const Route = createFileRoute("/")({
    component: Home,
});
