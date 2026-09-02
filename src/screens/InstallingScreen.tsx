import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { client, onInstallProgress, type InstallPlan, type InstallProgress } from "../api";
import { deriveProgress, type ProgressState } from "../utils/progress";

type Props = {
  plan: InstallPlan;
  mcDir: string;
  onDone: () => void;
  onError: (message: string) => void;
};

export function InstallingScreen({ plan, mcDir, onDone, onError }: Props) {
  const [progress, setProgress] = useState<ProgressState>({
    label: "Preparing…",
    overall: null,
    file: null,
    filename: null,
    done: false,
    error: null,
  });

  // Track completed bytes across files. Ref so the listener closure always sees the latest.
  const completedRef = useRef(0);
  const lastFilenameRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const unlisten = await onInstallProgress((event: InstallProgress) => {
        if (cancelled) return;

        // When we move to a new file, add the previous file's total to completed.
        if (event.stage === "downloading" && event.filename !== lastFilenameRef.current) {
          if (lastFilenameRef.current !== null) {
            const prevMod = plan.mods.find((m) => m.filename === lastFilenameRef.current);
            if (prevMod) completedRef.current += prevMod.size;
          }
          lastFilenameRef.current = event.filename;
        }

        const state = deriveProgress(event, completedRef.current, plan.totalBytes);
        setProgress(state);

        if (event.stage === "done") onDone();
        if (event.stage === "error") onError(event.message);
      });

      try {
        await client.install(plan, mcDir);
      } catch (e) {
        if (!cancelled) onError(String(e));
      }

      return unlisten;
    }

    let cleanup: (() => void) | undefined;
    run().then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        cleanup = unlisten;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [plan, mcDir, onDone, onError]);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <p className="text-wp-title text-[15px] font-medium">{progress.label}</p>

      {progress.filename && <p className="text-wp-muted text-[13px]">{progress.filename}</p>}

      {/* Overall progress bar */}
      <div className="bg-wp-track h-2 w-full overflow-hidden rounded-full">
        {progress.overall !== null ? (
          <div
            className="bg-wp-accent h-full rounded-full transition-[width] duration-150"
            style={{ width: `${progress.overall * 100}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress.overall * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall install progress"
          />
        ) : (
          <div className="bg-wp-accent h-full w-1/3 animate-pulse rounded-full" />
        )}
      </div>

      {/* Per-file progress bar */}
      {progress.file !== null && (
        <div className="bg-wp-track h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-wp-accent/50 h-full rounded-full transition-[width] duration-150"
            style={{ width: `${progress.file * 100}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress.file * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="File download progress"
          />
        </div>
      )}

      {!progress.done && progress.overall === null && (
        <LoaderCircle className="text-wp-accent h-5 w-5 animate-spin" strokeWidth={2.5} />
      )}
    </div>
  );
}
