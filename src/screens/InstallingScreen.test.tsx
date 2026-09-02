import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InstallPlan, InstallProgress } from "../api";
import { InstallingScreen } from "./InstallingScreen";

type ProgressCb = (p: InstallProgress) => void;
const listeners = new Set<ProgressCb>();

vi.mock("../api", () => ({
  client: {
    install: vi.fn().mockResolvedValue(undefined),
  },
  onInstallProgress: vi.fn((cb: ProgressCb) => {
    listeners.add(cb);
    return Promise.resolve(() => listeners.delete(cb));
  }),
}));

function plan(): InstallPlan {
  return {
    mods: [
      {
        projectId: "a",
        version: "1.0",
        name: "Voice Chat",
        filename: "voicechat.jar",
        url: "https://example.invalid/a.jar",
        size: 1_200_000,
        sha512: "abc",
        requested: true,
      },
      {
        projectId: "b",
        version: "1.0",
        name: "Supporting Files",
        filename: "fabric-api.jar",
        url: "https://example.invalid/b.jar",
        size: 1_900_000,
        sha512: "def",
        requested: false,
      },
    ],
    loaderVersion: "0.19.3",
    totalBytes: 3_100_000,
    staleFiles: [],
  };
}

function emit(event: InstallProgress) {
  act(() => listeners.forEach((cb) => cb(event)));
}

describe("InstallingScreen", () => {
  it("shows an overall progress bar during downloading", async () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    render(<InstallingScreen plan={plan()} mcDir="/tmp" onDone={onDone} onError={onError} />);

    await waitFor(() => expect(listeners.size).toBe(1));

    emit({ stage: "downloading", filename: "voicechat.jar", received: 600_000, total: 1_200_000 });

    await waitFor(() => {
      const bar = screen.getByRole("progressbar", { name: /overall/i });
      expect(bar).toBeInTheDocument();
      expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    });
  });

  it("shows the current filename", async () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    render(<InstallingScreen plan={plan()} mcDir="/tmp" onDone={onDone} onError={onError} />);

    await waitFor(() => expect(listeners.size).toBe(1));

    emit({ stage: "downloading", filename: "voicechat.jar", received: 100, total: 1_200_000 });

    await waitFor(() => {
      expect(screen.getByText("voicechat.jar")).toBeInTheDocument();
    });
  });

  it("calls onDone when the install completes", async () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    render(<InstallingScreen plan={plan()} mcDir="/tmp" onDone={onDone} onError={onError} />);

    await waitFor(() => expect(listeners.size).toBe(1));

    emit({ stage: "done" });

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("calls onError when the install fails", async () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    render(<InstallingScreen plan={plan()} mcDir="/tmp" onDone={onDone} onError={onError} />);

    await waitFor(() => expect(listeners.size).toBe(1));

    emit({ stage: "error", message: "Download failed." });

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Download failed."));
  });
});
