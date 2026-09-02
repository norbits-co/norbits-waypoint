import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { client } from "../api";
import { useStartup } from "./useStartup";

vi.mock("../api", () => ({
  client: {
    findMinecraftDir: vi.fn(),
    loadManifest: vi.fn(),
    planInstall: vi.fn(),
  },
}));

const dir = { path: "C:\\Users\\you\\AppData\\Roaming\\.minecraft", exists: true };

const manifest = {
  mcVersion: "26.1.2",
  loader: "fabric" as const,
  loaderVersion: null,
  server: { name: "NorBits MC", address: "mc.norbits.co" },
  mods: [{ slug: "simple-voice-chat", required: true, name: "Voice Chat", blurb: "" }],
};

const plan = {
  mods: [],
  loaderVersion: "0.19.3",
  totalBytes: 0,
  staleFiles: [],
};

const mocked = vi.mocked(client);

beforeEach(() => {
  mocked.findMinecraftDir.mockResolvedValue(dir);
  mocked.loadManifest.mockResolvedValue(manifest);
  mocked.planInstall.mockResolvedValue(plan);
});

describe("on mount", () => {
  it("starts out searching", async () => {
    const { result } = renderHook(() => useStartup());
    expect(result.current.status.kind).toBe("searching");

    // The mount effect is still in flight.
    await waitFor(() => expect(result.current.status.kind).not.toBe("searching"));
  });

  it("reaches found when Minecraft is there", async () => {
    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("found"));
  });

  it("reaches bedrock when the folder doesn't exist", async () => {
    // Not a failure. They don't need the app, and the screen says so kindly.
    mocked.findMinecraftDir.mockResolvedValue({ ...dir, exists: false });

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("bedrock"));
  });

  it("still loads the manifest for a Bedrock player", async () => {
    // The Bedrock screen shows the server address, which comes from the manifest.
    mocked.findMinecraftDir.mockResolvedValue({ ...dir, exists: false });

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("bedrock"));
    expect(mocked.loadManifest).toHaveBeenCalled();
  });

  it("fails when the home directory can't be resolved", async () => {
    mocked.findMinecraftDir.mockResolvedValue(null);

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("failed"));
    if (result.current.status.kind !== "failed") throw new Error("unreachable");
    expect(result.current.status.reason).toBe("minecraft");
    expect(result.current.status.message).toBeTruthy();
  });
});

describe("when something fails", () => {
  it("says which of the two startup calls broke", async () => {
    mocked.loadManifest.mockRejectedValue(new Error("Couldn't reach NorBits."));

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("failed"));
    if (result.current.status.kind !== "failed") throw new Error("unreachable");
    expect(result.current.status.reason).toBe("manifest");
  });

  it("surfaces the backend's own message rather than a generic one", async () => {
    // The Rust writes these for players. A bare catch used to throw them away.
    mocked.loadManifest.mockRejectedValue(
      new Error("Couldn't reach NorBits. Check your internet connection and try again.")
    );

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("failed"));
    if (result.current.status.kind !== "failed") throw new Error("unreachable");
    expect(result.current.status.message).toBe(
      "Couldn't reach NorBits. Check your internet connection and try again."
    );
  });

  it("doesn't ask the manifest for anything when detection already failed", async () => {
    mocked.findMinecraftDir.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useStartup());

    await waitFor(() => expect(result.current.status.kind).toBe("failed"));
    expect(mocked.loadManifest).not.toHaveBeenCalled();
  });
});

describe("planning", () => {
  it("moves to confirm with the resolved plan", async () => {
    const { result } = renderHook(() => useStartup());
    await waitFor(() => expect(result.current.status.kind).toBe("found"));

    await act(() => result.current.plan(dir, manifest));

    await waitFor(() => expect(result.current.status.kind).toBe("confirm"));
    if (result.current.status.kind !== "confirm") throw new Error("unreachable");
    expect(result.current.status.plan).toEqual(plan);
  });

  it("fails with the planner's message when resolution fails", async () => {
    mocked.planInstall.mockRejectedValue(
      new Error("Voice Chat isn't ready for Minecraft 26.2 yet.")
    );

    const { result } = renderHook(() => useStartup());
    await waitFor(() => expect(result.current.status.kind).toBe("found"));

    await act(() => result.current.plan(dir, manifest));

    await waitFor(() => expect(result.current.status.kind).toBe("failed"));
    if (result.current.status.kind !== "failed") throw new Error("unreachable");
    expect(result.current.status.reason).toBe("plan");
    expect(result.current.status.message).toBe("Voice Chat isn't ready for Minecraft 26.2 yet.");
  });

  it("goes back to found when the player declines", async () => {
    const { result } = renderHook(() => useStartup());
    await waitFor(() => expect(result.current.status.kind).toBe("found"));
    await act(() => result.current.plan(dir, manifest));
    await waitFor(() => expect(result.current.status.kind).toBe("confirm"));

    act(() => result.current.cancelPlan(dir, manifest));

    await waitFor(() => expect(result.current.status.kind).toBe("found"));
  });
});
