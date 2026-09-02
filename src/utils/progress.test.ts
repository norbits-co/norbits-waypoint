import { describe, expect, it } from "vitest";

import { deriveProgress } from "./progress";

const TOTAL = 3_100_000;

describe("deriveProgress", () => {
  it("resolving is indeterminate", () => {
    const state = deriveProgress({ stage: "resolving" }, 0, TOTAL);
    expect(state.overall).toBeNull();
    expect(state.done).toBe(false);
  });

  it("installingLoader is indeterminate", () => {
    const state = deriveProgress({ stage: "installingLoader" }, 0, TOTAL);
    expect(state.overall).toBeNull();
    expect(state.done).toBe(false);
  });

  it("downloading gives both per-file and overall progress", () => {
    const state = deriveProgress(
      { stage: "downloading", filename: "voicechat.jar", received: 600_000, total: 1_200_000 },
      0,
      TOTAL
    );
    expect(state.file).toBeCloseTo(0.5);
    expect(state.overall).toBeCloseTo(600_000 / TOTAL);
    expect(state.filename).toBe("voicechat.jar");
    expect(state.done).toBe(false);
  });

  it("accumulates completed bytes from previous files", () => {
    // Second file, 600KB into a 1.9MB download, with the first file's 1.2MB already done.
    const state = deriveProgress(
      { stage: "downloading", filename: "fabric-api.jar", received: 600_000, total: 1_900_000 },
      1_200_000,
      TOTAL
    );
    expect(state.overall).toBeCloseTo((1_200_000 + 600_000) / TOTAL);
    expect(state.file).toBeCloseTo(600_000 / 1_900_000);
  });

  it("overall never exceeds 1", () => {
    const state = deriveProgress(
      { stage: "downloading", filename: "a.jar", received: 5_000_000, total: 5_000_000 },
      5_000_000,
      TOTAL
    );
    expect(state.overall).toBeLessThanOrEqual(1);
  });

  it("addingServer is indeterminate", () => {
    const state = deriveProgress({ stage: "addingServer" }, TOTAL, TOTAL);
    expect(state.overall).toBeNull();
    expect(state.done).toBe(false);
  });

  it("done sets overall to 1", () => {
    const state = deriveProgress({ stage: "done" }, TOTAL, TOTAL);
    expect(state.overall).toBe(1);
    expect(state.done).toBe(true);
    expect(state.error).toBeNull();
  });

  it("error carries the message", () => {
    const state = deriveProgress(
      { stage: "error", message: "Download failed. Check your connection." },
      0,
      TOTAL
    );
    expect(state.done).toBe(true);
    expect(state.error).toBe("Download failed. Check your connection.");
  });

  it("handles zero totalBytes without NaN", () => {
    const state = deriveProgress(
      { stage: "downloading", filename: "a.jar", received: 0, total: 0 },
      0,
      0
    );
    expect(state.overall).toBe(0);
    expect(state.file).toBe(0);
  });
});
