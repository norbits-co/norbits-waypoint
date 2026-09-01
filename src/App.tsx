import { useEffect, useState } from "react";
import { client, type InstallPlan, type Manifest, type MinecraftDir } from "./lib/api";

type Status =
  | { kind: "searching" }
  | { kind: "found"; dir: MinecraftDir; manifest: Manifest }
  | { kind: "confirm"; dir: MinecraftDir; manifest: Manifest; plan: InstallPlan }
  | { kind: "bedrock"; manifest: Manifest }
  | { kind: "failed"; reason: "minecraft" | "manifest" | "plan"; message?: string };

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

// Tauri rejects with the plain string from Err(String); the mocks throw an
// Error object. Normalise both so no "Error:" prefix reaches a player.
function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}

function App() {
  const [themeName, setThemeName] = useState<"dark" | "light">(
    () => (localStorage.getItem("wp-theme") as "dark" | "light") || "dark"
  );
  const [status, setStatus] = useState<Status>({ kind: "searching" });
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("wp-theme", themeName);
  }, [themeName]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let dir: MinecraftDir | null;
      let manifest: Manifest;

      try {
        dir = await client.findMinecraftDir();
      } catch {
        if (!cancelled) setStatus({ kind: "failed", reason: "minecraft" });
        return;
      }

      try {
        manifest = await client.loadManifest();
      } catch {
        if (!cancelled) setStatus({ kind: "failed", reason: "manifest" });
        return;
      }

      if (cancelled) return;

      if (!dir) {
        setStatus({ kind: "failed", reason: "minecraft" });
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

  async function handleSetup(dir: MinecraftDir, manifest: Manifest) {
    try {
      const plan = await client.planInstall(manifest, dir.path);
      setStatus({ kind: "confirm", dir, manifest, plan });
    } catch (e) {
      setStatus({ kind: "failed", reason: "plan", message: errorMessage(e) });
    }
  }

  function handleCopy(address: string) {
    navigator.clipboard.writeText(address).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Title bar */}
      <header
        data-tauri-drag-region=""
        className="border-wp-bar-border bg-wp-bar flex h-[38px] shrink-0 items-center justify-between border-b px-3"
      >
        <div className="flex items-center gap-2">
          <div className="bg-wp-accent grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full">
            <div className="bg-wp-bar h-[5.5px] w-[5.5px] rotate-45" />
          </div>
          <span className="text-wp-bar-text text-xs font-medium">NorBits Waypoint</span>
        </div>
        <button
          onClick={() => setThemeName((p) => (p === "dark" ? "light" : "dark"))}
          title={themeName === "dark" ? "Switch to Light" : "Switch to Dark"}
          className="text-wp-glyph grid h-[38px] w-[42px] cursor-pointer place-items-center border-0 bg-transparent hover:bg-[rgba(127,127,127,.16)]"
        >
          <span
            className="block h-[13px] w-[13px] rounded-full border-2 border-current"
            style={{
              background: "linear-gradient(90deg, currentColor 0 50%, transparent 50% 100%)",
            }}
          />
        </button>
      </header>

      {/* Content area */}
      <main className="bg-wp-body grid flex-1 place-items-center p-10">
        {status.kind === "searching" && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="border-wp-track border-t-wp-accent h-8 w-8 rounded-full border-[3px]"
              style={{ animation: "wp-spin 0.8s linear infinite" }}
            />
            <p className="text-wp-sub text-[15px] font-medium">Looking for Minecraft...</p>
          </div>
        )}

        {status.kind === "found" && (
          <div className="flex flex-col items-center gap-5">
            <div className="bg-wp-green grid h-10 w-10 place-items-center rounded-full">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-wp-title text-[15px] font-medium">Found Minecraft!</p>
            <button
              onClick={() => handleSetup(status.dir, status.manifest)}
              className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover cursor-pointer rounded-lg px-6 py-2.5 text-[14px] font-medium"
            >
              Set Up My Game
            </button>
          </div>
        )}

        {status.kind === "confirm" && (
          <div className="flex w-full max-w-md flex-col items-center gap-6">
            <p className="text-wp-title text-center text-[17px] font-medium">
              Ready to Set Up Your Game
            </p>

            <div className="border-wp-panel-border bg-wp-panel w-full rounded-lg border">
              <div className="border-wp-row-border flex items-center justify-between border-b px-4 py-3">
                <span className="text-wp-strong text-[14px]">
                  {status.plan.mods.length} {status.plan.mods.length === 1 ? "file" : "files"} to
                  download
                </span>
                <span className="text-wp-muted text-[14px]">
                  {formatBytes(status.plan.totalBytes)}
                </span>
              </div>

              <div className="px-4 py-3">
                <button
                  onClick={() => setShowDetails((p) => !p)}
                  className="text-wp-muted hover:text-wp-sub flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-[13px]"
                  aria-expanded={showDetails}
                >
                  <span>What's Being Installed?</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 transition-transform"
                    style={{ transform: showDetails ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showDetails && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {status.plan.mods.map((mod) => (
                      <li key={mod.filename} className="text-wp-mono-faint font-mono text-[12px]">
                        {mod.filename}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {status.plan.staleFiles.length > 0 && (
              <p className="text-wp-muted text-center text-[13px]">
                Older versions will be replaced.
              </p>
            )}

            <button className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover w-full cursor-pointer rounded-lg py-3 text-[15px] font-medium">
              Install
            </button>
            <button
              onClick={() => {
                setShowDetails(false);
                setStatus({ kind: "found", dir: status.dir, manifest: status.manifest });
              }}
              className="text-wp-muted hover:text-wp-sub cursor-pointer border-0 bg-transparent text-[13px]"
            >
              Not Now
            </button>
          </div>
        )}

        {status.kind === "bedrock" && (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="bg-wp-green grid h-10 w-10 place-items-center rounded-full">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-wp-title text-[15px] font-medium">
              Oh! Looks Like You're on Minecraft Bedrock Edition : )
            </p>
            <p className="text-wp-sub text-[14px]">
              You're all set! - just open Minecraft and connect to the server:
            </p>
            <div className="border-wp-panel-border bg-wp-panel flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-wp-muted text-[11px] tracking-wide uppercase">
                  Server address
                </span>
                <span className="text-wp-title font-mono text-[17px]">
                  {status.manifest.server.address}
                </span>
              </div>
              <button
                onClick={() => handleCopy(status.manifest.server.address)}
                className="border-wp-ghost-border bg-wp-ghost-bg text-wp-ghost-text hover:border-wp-accent grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-md border"
                title="Copy Server Address"
                aria-label="Copy Server Address"
              >
                {copied ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-wp-muted text-[13px]">
              Certain add-ons are only available on Java Edition - Bedrock players can still join
              and play.
            </p>
          </div>
        )}

        {status.kind === "failed" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-wp-title text-[15px] font-medium">Something Went Wrong... : /</p>
            <p className="text-wp-danger text-[14px]">
              {status.reason === "plan" && status.message
                ? status.message
                : status.reason === "manifest"
                  ? "Couldn't reach NorBits. Check your internet connection and try again."
                  : "We couldn't check for Minecraft on this computer. Try restarting the app."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
