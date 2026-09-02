import { describe, expect, it } from "vitest";

import { formatBytes } from "./format";

describe("formatBytes", () => {
  it("shows whole kilobytes below a megabyte", () => {
    expect(formatBytes(1_000)).toBe("1 KB");
    expect(formatBytes(512_000)).toBe("512 KB");
    // No decimals: "1.5 KB" is more precision than anyone needs.
    expect(formatBytes(1_500)).toBe("2 KB");
  });

  it("shows one decimal place at a megabyte and above", () => {
    expect(formatBytes(1_000_000)).toBe("1.0 MB");
    expect(formatBytes(3_100_000)).toBe("3.1 MB");
    expect(formatBytes(5_526_001)).toBe("5.5 MB");
  });

  it("switches units exactly at a megabyte", () => {
    expect(formatBytes(999_999)).toBe("1000 KB");
    expect(formatBytes(1_000_000)).toBe("1.0 MB");
  });

  it("handles an empty download without saying NaN", () => {
    expect(formatBytes(0)).toBe("0 KB");
  });
});
