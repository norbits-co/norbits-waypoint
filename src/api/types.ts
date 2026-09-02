// The contract between the Rust backend and the React frontend. Every type here mirrors a struct in src-tauri carrying

export type Manifest = {
  mcVersion: string;
  loader: "fabric";
  loaderVersion: string | null;
  server: { name: string; address: string };
  mods: { slug: string; required: boolean; name: string; blurb: string }[];
};

export type MinecraftDir = {
  path: string;
  /** False means no Java install - most likely a Bedrock player. */
  exists: boolean;
};

export type PlannedMod = {
  projectId: string;
  version: string;
  // Shown to players. From the manifest for anything we asked for, and a generic label for dependencies
  name: string;
  filename: string;
  url: string;
  size: number;
  sha512: string;
  /** False when pulled in as a dependency rather than listed in the manifest. */
  requested: boolean;
};

export type InstallPlan = {
  mods: PlannedMod[];
  loaderVersion: string;
  totalBytes: number;
  /** Jars from a previous install this one supersedes. */
  staleFiles: string[];
};

// Listed in the order the backend emits them, which is also the order a player reads them in. Changing the order here means changing it in the Rust too.
export type InstallProgress =
  | { stage: "resolving" }
  | { stage: "installingLoader" }
  | { stage: "downloading"; filename: string; received: number; total: number }
  | { stage: "verifying"; filename: string }
  | { stage: "addingServer" }
  | { stage: "done" }
  | { stage: "error"; message: string };

/** Every command the frontend can call. Implemented by commands.ts and mocks.ts. */
export type Api = {
  findMinecraftDir: () => Promise<MinecraftDir | null>;
  loadManifest: () => Promise<Manifest>;
  planInstall: (manifest: Manifest, mcDir: string) => Promise<InstallPlan>;
  install: (plan: InstallPlan, mcDir: string) => Promise<void>;
  openModsFolder: (mcDir: string) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  openLogFolder: () => Promise<void>;
  // Write a frontend failure into the same log file the backend uses.
  logError: (message: string) => Promise<void>;
  // Close the app.
  closeWindow: () => Promise<void>;
};
