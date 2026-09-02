import { describe, expect, it } from "vitest";

import type { PlannedMod } from "../api";
import { groupPlanRows } from "./plan";

function mod(name: string, size: number, filename = `${name}.jar`): PlannedMod {
  return {
    projectId: filename,
    version: "1.0.0",
    name,
    filename,
    url: "https://example.invalid/a.jar",
    size,
    sha512: "abc",
    requested: true,
  };
}

describe("groupPlanRows", () => {
  it("leaves distinct names alone", () => {
    const rows = groupPlanRows([mod("Voice Chat", 1_200_000), mod("Minimap", 800_000)]);

    expect(rows).toEqual([
      { name: "Voice Chat", bytes: 1_200_000, count: 1 },
      { name: "Minimap", bytes: 800_000, count: 1 },
    ]);
  });

  it("combines files sharing a name and sums their size", () => {
    // Two mods each needing a dependency.
    const rows = groupPlanRows([
      mod("Voice Chat", 1_200_000),
      mod("Supporting Files", 1_900_000, "fabric-api.jar"),
      mod("Laser Mod", 500_000),
      mod("Supporting Files", 400_000, "another-dep.jar"),
    ]);

    expect(rows).toHaveLength(3);
    expect(rows).toContainEqual({
      name: "Supporting Files",
      bytes: 2_300_000,
      count: 2,
    });
  });

  it("groups dependencies regardless of which mod pulled them in", () => {
    // The label doesn't say whose dependency it is.
    const rows = groupPlanRows([
      mod("Voice Chat", 100),
      mod("Supporting Files", 100, "a.jar"),
      mod("Laser Mod", 100),
      mod("Supporting Files", 100, "b.jar"),
      mod("Minimap", 100),
      mod("Supporting Files", 100, "c.jar"),
    ]);

    const supporting = rows.find((r) => r.name === "Supporting Files");
    expect(supporting).toEqual({ name: "Supporting Files", bytes: 300, count: 3 });
  });

  it("keeps first-appearance order, so requested mods stay above dependencies", () => {
    const rows = groupPlanRows([
      mod("Voice Chat", 100),
      mod("Supporting Files", 100, "a.jar"),
      mod("Laser Mod", 100),
      mod("Supporting Files", 100, "b.jar"),
    ]);

    expect(rows.map((r) => r.name)).toEqual(["Voice Chat", "Supporting Files", "Laser Mod"]);
  });

  it("adds up to the same total as the plan it came from", () => {
    // The header shows plan.totalBytes.
    const mods = [
      mod("Voice Chat", 1_200_000),
      mod("Supporting Files", 1_900_000, "a.jar"),
      mod("Supporting Files", 400_000, "b.jar"),
    ];

    const rowTotal = groupPlanRows(mods).reduce((sum, r) => sum + r.bytes, 0);
    const modTotal = mods.reduce((sum, m) => sum + m.size, 0);

    expect(rowTotal).toBe(modTotal);
  });

  it("handles an empty plan", () => {
    expect(groupPlanRows([])).toEqual([]);
  });
});
