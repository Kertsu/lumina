import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createBrowserClient, createDesktopClient } from "@/bridge/client";
import { Welcome } from "./welcome";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("shows the generated greeting through the browser client", async () => {
    render(<Welcome client={createBrowserClient()} />);
    fireEvent.click(
        screen.getByRole("button", {
            name: "Say hello",
        })
    );
    expect(
        await screen.findByText("Hello world from the browser fixture!")
    ).toBeTruthy();
    expect(screen.getByText("Current epoch: 1234")).toBeTruthy();
});

it.each([
    "Storage is starting",
    "Please try again shortly",
])("classifies the same code and data independently of wording: %s", async (message) => {
    render(
        <Welcome
            client={createBrowserClient({
                status: "error",
                error: {
                    errorCode: "APPLICATION_UNAVAILABLE",
                    message,
                    data: {
                        state: "starting",
                    },
                },
            })}
        />
    );
    fireEvent.click(
        screen.getByRole("button", {
            name: "Say hello",
        })
    );
    expect(await screen.findByText("Application starting")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(message);
});

it("keeps the UI usable after unavailable desktop IPC without fixture success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Welcome client={createDesktopClient()} />);
    const button = screen.getByRole("button", {
        name: "Say hello",
    });
    fireEvent.click(button);
    expect(await screen.findByText("Connection error")).toBeTruthy();
    expect(
        screen.queryByText("Hello world from the browser fixture!")
    ).toBeNull();
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(button.hasAttribute("disabled")).toBe(false);
});
