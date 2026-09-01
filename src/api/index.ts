import { listen } from "@tauri-apps/api/event";

import { commands } from "./commands";
import { mockListeners, mocks } from "./mocks";
import type { InstallProgress } from "./types";

export * from "./types";

const USE_MOCKS = import.meta.env.VITE_MOCK === "1";

/** Import this, never `commands` or `mocks` directly. */
export const client = USE_MOCKS ? mocks : commands;

// Subscribe to install progress. Returns a promise resolving to an unlisten
export function onInstallProgress(cb: (p: InstallProgress) => void) {
  if (USE_MOCKS) {
    mockListeners.add(cb);
    return Promise.resolve(() => {
      mockListeners.delete(cb);
    });
  }

  return listen<InstallProgress>("install-progress", (e) => cb(e.payload));
}
