import type { InstallProgress } from "../api";

export type ProgressState = {
  /** Label shown to the player. */
  label: string;
  /** Overall progress 0–1, or null when indeterminate. */
  overall: number | null;
  /** Per-file progress 0–1 during downloading, null otherwise. */
  file: number | null;
  /** The file currently being downloaded, if any. */
  filename: string | null;
  /** True when the install has finished or errored. */
  done: boolean;
  /** Error message, if the install failed. */
  error: string | null;
};

/**
 * Derive a displayable progress state from the raw event plus accumulated
 * completed bytes from previous files. The caller tracks completedBytes
 * across events — this function is pure.
 */
export function deriveProgress(
  event: InstallProgress,
  completedBytes: number,
  totalBytes: number
): ProgressState {
  switch (event.stage) {
    case "resolving":
      return {
        label: "Preparing…",
        overall: null,
        file: null,
        filename: null,
        done: false,
        error: null,
      };

    case "installingLoader":
      return {
        label: "Setting up mod loader…",
        overall: null,
        file: null,
        filename: null,
        done: false,
        error: null,
      };

    case "downloading": {
      const fileProgress = event.total > 0 ? event.received / event.total : 0;
      const overallProgress = totalBytes > 0 ? (completedBytes + event.received) / totalBytes : 0;
      return {
        label: `Downloading…`,
        overall: Math.min(overallProgress, 1),
        file: Math.min(fileProgress, 1),
        filename: event.filename,
        done: false,
        error: null,
      };
    }

    case "verifying":
      return {
        label: "Verifying…",
        overall: totalBytes > 0 ? Math.min(completedBytes / totalBytes, 1) : null,
        file: null,
        filename: event.filename,
        done: false,
        error: null,
      };

    case "addingServer":
      return {
        label: "Adding server…",
        overall: null,
        file: null,
        filename: null,
        done: false,
        error: null,
      };

    case "done":
      return { label: "Done!", overall: 1, file: null, filename: null, done: true, error: null };

    case "error":
      return {
        label: event.message,
        overall: null,
        file: null,
        filename: null,
        done: true,
        error: event.message,
      };
  }
}
