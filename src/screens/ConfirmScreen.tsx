import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { InstallPlan } from "../api";
import { Button } from "../components/Button";
import { formatBytes } from "../utils/format";
import { groupPlanRows } from "../utils/plan";

type Props = {
  plan: InstallPlan;
  onInstall: () => void;
  onCancel: () => void;
};

// Plain-language confirmation before anything is written
export function ConfirmScreen({ plan, onInstall, onCancel }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <p className="text-wp-title text-center text-[17px] font-medium">Ready to Set Up Your Game</p>

      <div className="border-wp-panel-border bg-wp-panel w-full rounded-lg border">
        <div className="border-wp-row-border flex items-center justify-between border-b px-4 py-3">
          <span className="text-wp-strong text-[14px]">
            {plan.mods.length} {plan.mods.length === 1 ? "file" : "files"} to download
          </span>
          <span className="text-wp-muted text-[14px]">{formatBytes(plan.totalBytes)}</span>
        </div>

        <div className="px-4 py-3">
          <button
            onClick={() => setShowDetails((p) => !p)}
            className="text-wp-muted hover:text-wp-sub flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-[13px]"
            aria-expanded={showDetails}
          >
            <span>What's Being Installed?</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${showDetails ? "rotate-180" : ""}`}
            />
          </button>

          {showDetails && (
            <ul className="mt-3 flex flex-col gap-2">
              {groupPlanRows(plan.mods).map((row) => (
                <li
                  key={row.name}
                  className="text-wp-muted flex items-center justify-between text-[12.5px]"
                >
                  <span>
                    {row.name}
                    {row.count > 1 && <span className="text-wp-faint"> ({row.count})</span>}
                  </span>
                  <span className="text-wp-faint">{formatBytes(row.bytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {plan.staleFiles.length > 0 && (
        <p className="text-wp-muted text-center text-[13px]">Older versions will be replaced.</p>
      )}

      <Button size="lg" className="w-full" onClick={onInstall}>
        Install
      </Button>
      <Button variant="quiet" size="sm" onClick={onCancel}>
        Not Now
      </Button>
    </div>
  );
}
