import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ServerAddress } from "./ServerAddress";

describe("ServerAddress", () => {
  it("shows the address it was given rather than a hardcoded one", () => {
    // The address comes from the manifest so it can change without a release.
    render(<ServerAddress address="play.example.com" />);

    expect(screen.getByText("play.example.com")).toBeInTheDocument();
  });

  it("copies the address to the clipboard", async () => {
    render(<ServerAddress address="mc.norbits.co" />);

    await userEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("mc.norbits.co");
  });

  it("exposes the copy control as a button with a name", () => {
    // Icon-only, so without an accessible name a screen reader gets nothing.
    render(<ServerAddress address="mc.norbits.co" />);

    expect(screen.getByRole("button", { name: "Copy Server Address" })).toBeInTheDocument();
  });

  it("confirms the copy, then goes back to offering it", async () => {
    render(<ServerAddress address="mc.norbits.co" />);
    const button = screen.getByRole("button", { name: /copy/i });

    // The icon swaps to a tick
    const before = button.innerHTML;

    // fireEvent rather than userEvent
    vi.useFakeTimers();

    // No waitFor here: it polls on timers, which are faked, so it would never resolve. An empty async act flushes the clipboard promise instead.
    fireEvent.click(button);
    await act(async () => {});
    expect(button.innerHTML).not.toBe(before);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(button.innerHTML).toBe(before);

    vi.useRealTimers();
  });
});
