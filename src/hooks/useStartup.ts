import { useEffect, useState } from "react";

import { client, type InstallPlan, type Manifest, type MinecraftDir } from "../api";
import { errorMessage } from "../utils/errors";

/** Which screen the app is on, and everything that screen needs. */
export type Status =
  | { kind: "searching" }
  | { kind: "found"; dir: MinecraftDir; manifest: Manifest }
  | { kind: "confirm"; dir: MinecraftDir; manifest: Manifest; plan: InstallPlan }
  | { kind: "bedrock"; manifest: Manifest }
  | { kind: "failed"; reason: "minecraft" | "manifest" | "plan"; message: string };

// Finds Minecraft and loads the manifest on mount, then exposes the transitions the screens can trigger.
export function useStartup() {
  const [status, setStatus] = useState<Status>({ kind: "searching" });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let dir: MinecraftDir | null;
      let manifest: Manifest;

      try {
        dir = await client.findMinecraftDir();
      } catch (e) {
        if (!cancelled) {
          setStatus({ kind: "failed", reason: "minecraft", message: errorMessage(e) });
        }
        return;
      }

      try {
        manifest = await client.loadManifest();
      } catch (e) {
        if (!cancelled) {
          setStatus({ kind: "failed", reason: "manifest", message: errorMessage(e) });
        }
        return;
      }

      if (cancelled) return;

      if (!dir) {
        setStatus({
          kind: "failed",
          reason: "minecraft",
          message: "We couldn't check for Minecraft on this computer. Try restarting the app.",
        });
      } else if (!dir.exists) {
        setStatus({ kind: "bedrock", manifest });
      } else {
        setStatus({ kind: "found", dir, manifest });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function plan(dir: MinecraftDir, manifest: Manifest) {
    try {
      setStatus({
        kind: "confirm",
        dir,
        manifest,
        plan: await client.planInstall(manifest, dir.path),
      });
    } catch (e) {
      setStatus({ kind: "failed", reason: "plan", message: errorMessage(e) });
    }
  }

  function cancelPlan(dir: MinecraftDir, manifest: Manifest) {
    setStatus({ kind: "found", dir, manifest });
  }

  return { status, plan, cancelPlan };
}
