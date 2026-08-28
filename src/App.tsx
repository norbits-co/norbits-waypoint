import { useEffect, useState } from "react";
import { client, type Manifest, type MinecraftDir } from "./lib/api";

type Status =
  | { kind: "searching" }
  | { kind: "found"; dir: MinecraftDir; manifest: Manifest }
  | { kind: "bedrock"; manifest: Manifest }
  | { kind: "failed"; reason: "minecraft" | "manifest" };

function App() {
  const [themeName, setThemeName] = useState<"dark" | "light">(
    () => (localStorage.getItem("wp-theme") as "dark" | "light") || "dark"
  );
  const [status, setStatus] = useState<Status>({ kind: "searching" });
  const [copied, setCopied] = useState(false);

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
          <span className="text-wp-bar-text text-xs">NorBits Waypoint</span>
        </div>
        <button
          onClick={() => setThemeName((p) => (p === "dark" ? "light" : "dark"))}
          title={themeName === "dark" ? "Switch to light" : "Switch to dark"}
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
            <p className="text-wp-sub text-[15px]">Looking for Minecraft on this PC…</p>
          </div>
        )}

        {status.kind === "found" && (
          <div className="flex flex-col items-center gap-3">
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
            <p className="text-wp-title text-[15px] font-medium">Found your Minecraft folder</p>
            <p className="text-wp-mono-strong font-mono text-[13px]">{status.dir.path}</p>
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
              Your version of Minecraft doesn't need anything installed
            </p>
            <p className="text-wp-sub text-[14px]">
              You're all set — just open Minecraft and connect to the server:
            </p>
            <div className="flex items-center gap-2">
              <span className="text-wp-mono-strong font-mono text-[14px]">
                {status.manifest.server.address}
              </span>
              <button
                onClick={() => handleCopy(status.manifest.server.address)}
                className="text-wp-muted hover:text-wp-title cursor-pointer border-0 bg-transparent p-1"
                title="Copy server address"
                aria-label="Copy server address"
              >
                {copied ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
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
                    className="h-4 w-4"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-wp-muted text-[13px]">
              Voice chat is only available on Java Edition — Bedrock players can still join and
              play, just without voice.
            </p>
          </div>
        )}

        {status.kind === "failed" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-wp-title text-[15px] font-medium">Something went wrong</p>
            <p className="text-wp-sub text-[14px]">
              {status.reason === "manifest"
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
