import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client } from "../api";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("../api", () => ({
  client: { openUrl: vi.fn(), openLogFolder: vi.fn(), logError: vi.fn() },
}));

function Boom(): React.ReactNode {
  throw new Error("render exploded");
}

function Fine() {
  return <p>the app</p>;
}

// React logs caught errors to the console itself.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Api declares these as promises
  vi.mocked(client.logError).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

describe("when nothing is wrong", () => {
  it("renders what it was given", () => {
    render(
      <ErrorBoundary>
        <Fine />
      </ErrorBoundary>
    );

    expect(screen.getByText("the app")).toBeInTheDocument();
  });

  it("logs nothing", () => {
    render(
      <ErrorBoundary>
        <Fine />
      </ErrorBoundary>
    );

    expect(client.logError).not.toHaveBeenCalled();
  });
});

describe("when a render throws", () => {
  it("shows a fallback instead of a blank window", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText("the app")).not.toBeInTheDocument();
  });

  it("tells the player nothing was changed in their game", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/nothing was changed in your game/i)).toBeInTheDocument();
  });

  it("writes the failure where a player can send it", () => {
    // Into the log file, not just the devtools console
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(client.logError).toHaveBeenCalledOnce();
    expect(vi.mocked(client.logError).mock.calls[0][0]).toContain("render exploded");
  });

  it("includes the component stack, so the log says where it broke", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(vi.mocked(client.logError).mock.calls[0][0]).toContain("Boom");
  });

  it("offers both ways to get help", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /get help/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open logs/i })).toBeInTheDocument();
  });

  it("opens the invite through the backend", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByRole("button", { name: /get help/i }));

    expect(client.openUrl).toHaveBeenCalledWith(expect.stringContaining("discord"));
  });

  it("opens the log folder", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByRole("button", { name: /open logs/i }));

    expect(client.openLogFolder).toHaveBeenCalled();
  });

  it("survives logError failing too", () => {
    // If the log write fails there's nothing useful left to do
    vi.mocked(client.logError).mockRejectedValueOnce(new Error("no disk"));

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
