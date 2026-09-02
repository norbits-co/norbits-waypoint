import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { client } from "../api";
import { FailedScreen } from "./FailedScreen";

vi.mock("../api", () => ({
  client: { openUrl: vi.fn(), openLogFolder: vi.fn() },
}));

const NEEDS_US =
  "Something went wrong getting your game ready. Please try again, and let us know if it keeps happening.";
const THEIR_SIDE = "Couldn't reach NorBits. Check your internet connection and try again.";

describe("FailedScreen", () => {
  it("shows the backend's message as written", () => {
    // Not wrapped, not restated - the Rust writes these for players.
    render(<FailedScreen message={THEIR_SIDE} />);

    expect(screen.getByText(THEIR_SIDE)).toBeInTheDocument();
  });

  it("offers help when the message asks the player to tell us", () => {
    render(<FailedScreen message={NEEDS_US} />);

    expect(screen.getByRole("button", { name: /get help/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open logs/i })).toBeInTheDocument();
  });

  it("doesn't offer help for something the player can fix", () => {
    render(<FailedScreen message={THEIR_SIDE} />);

    expect(screen.queryByRole("button", { name: /get help/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open logs/i })).not.toBeInTheDocument();
  });

  it("opens the invite through the backend, not as a link", async () => {
    // An <a href> would navigate the app window.
    render(<FailedScreen message={NEEDS_US} />);

    await userEvent.click(screen.getByRole("button", { name: /get help/i }));

    expect(client.openUrl).toHaveBeenCalledWith(expect.stringContaining("discord"));
  });

  it("opens the log folder", async () => {
    render(<FailedScreen message={NEEDS_US} />);

    await userEvent.click(screen.getByRole("button", { name: /open logs/i }));

    expect(client.openLogFolder).toHaveBeenCalled();
  });
});
