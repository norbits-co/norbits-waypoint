import type { Api, InstallProgress } from "./types";

// A complete fake backend, used when VITE_MOCK is set. `pnpm dev:mock` runs the UI in a plain browser against these - no Rust toolchain, no compile step.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ProgressCb = (p: InstallProgress) => void;

/** Progress subscribers, so the mock install can drive the real progress UI. */
export const mockListeners = new Set<ProgressCb>();

export const mocks: Api = {
  findMinecraftDir: async () => ({
    path: "C:\\Users\\you\\AppData\\Roaming\\.minecraft",
    exists: true,
  }),

  loadManifest: async () => ({
    mcVersion: "26.1.2",
    loader: "fabric",
    loaderVersion: null,
    server: { name: "NorBits MC", address: "mc.norbits.co" },
    mods: [
      {
        slug: "simple-voice-chat",
        required: true,
        name: "Voice Chat",
        blurb: "Talk to players near you in-game",
      },
    ],
  }),

  planInstall: async () => ({
    loaderVersion: "0.19.3",
    totalBytes: 3_100_000,
    staleFiles: ["voicechat-fabric-2.6.21+26.1.2.jar"],
    mods: [
      {
        projectId: "9eGKb6K1",
        version: "fabric-2.6.22+26.1.2",
        filename: "voicechat-fabric-2.6.22+26.1.2.jar",
        url: "https://example.invalid/voicechat.jar",
        size: 1_200_000,
        sha512: "adac8ed875bb9f1ac50ef47a",
        requested: true,
      },
      {
        projectId: "P7dR8mSH",
        version: "0.155.2+26.1.2",
        filename: "fabric-api-0.155.2+26.1.2.jar",
        url: "https://example.invalid/fabric-api.jar",
        size: 1_900_000,
        sha512: "5a870eb4d731393b4df65028",
        requested: false,
      },
    ],
  }),

  install: async (plan) => {
    const emit = (p: InstallProgress) => mockListeners.forEach((cb) => cb(p));

    emit({ stage: "resolving" });
    await sleep(600);

    // Loader first, then mods: the order a player reads it in.
    emit({ stage: "installingLoader" });
    await sleep(700);

    for (const m of plan.mods) {
      const step = Math.ceil(m.size / 8);
      for (let received = 0; received < m.size + step; received += step) {
        emit({
          stage: "downloading",
          filename: m.filename,
          received: Math.min(received, m.size),
          total: m.size,
        });
        await sleep(120);
      }
      emit({ stage: "verifying", filename: m.filename });
      await sleep(200);
    }

    emit({ stage: "addingServer" });
    await sleep(400);
    emit({ stage: "done" });
  },

  openModsFolder: async () => {},

  openUrl: async (url) => {
    // No system shell in a browser, so just open a tab.
    window.open(url, "_blank", "noopener");
  },

  openLogFolder: async () => {},

  logError: async (message) => {
    console.error("[waypoint]", message);
  },
};
