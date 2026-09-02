import type { PlannedMod } from "../api";

export type PlanRow = {
  name: string;
  // Combined size of every file under this name.
  bytes: number;
  // How many files. More than one only happens for dependencies.
  count: number;
};

// One row per name, not per file.
export function groupPlanRows(mods: PlannedMod[]): PlanRow[] {
  const rows = new Map<string, PlanRow>();

  for (const mod of mods) {
    const row = rows.get(mod.name);

    if (row) {
      row.bytes += mod.size;
      row.count += 1;
    } else {
      rows.set(mod.name, { name: mod.name, bytes: mod.size, count: 1 });
    }
  }

  return [...rows.values()];
}
