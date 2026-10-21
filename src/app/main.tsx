import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import { getRouter } from "./router";

const root = document.getElementById("root");

if (!root) {
    throw new Error("Application root element is missing");
}

const router = getRouter();

createRoot(root).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
