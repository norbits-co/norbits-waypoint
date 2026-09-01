import { invoke } from "@tauri-apps/api/core";

import type { Api, InstallPlan, Manifest, MinecraftDir } from "./types";

// The real backend. This is the only file in the frontend that calls `invoke` - importing it anywhere else breaks mock mode, where there is no Tauri runtime.
export const commands: Api = {
  findMinecraftDir: () => invoke<MinecraftDir | null>("find_minecraft_dir"),

  loadManifest: () => invoke<Manifest>("load_manifest"),

  planInstall: (manifest: Manifest, mcDir: string) =>
    invoke<InstallPlan>("plan_install", { manifest, mcDir }),

  install: (plan: InstallPlan, mcDir: string) => invoke<void>("install", { plan, mcDir }),

  openModsFolder: (mcDir: string) => invoke<void>("open_mods_folder", { mcDir }),

  openUrl: (url: string) => invoke<void>("open_url", { url }),

  openLogFolder: () => invoke<void>("open_log_folder"),

  logError: (message: string) => invoke<void>("log_error", { message }),
};
