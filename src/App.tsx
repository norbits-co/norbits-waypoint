import { useEffect, useState, useRef, useCallback } from "react";
import { client, onInstallProgress, type InstallPlan, type InstallProgress } from "./lib/api";

type AppView =
  "searching" | "ready" | "confirm" | "installing" | "done" | "bedrock" | "failed" | "uptodate";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function App() {
  const [view, setView] = useState<AppView>("searching");
  const [themeName, setThemeName] = useState<"dark" | "light">(
    () => (localStorage.getItem("wp-theme") as "dark" | "light") || "dark"
  );
  const [dir, setDir] = useState<string | null>(null);
  const [plan, setPlan] = useState<InstallPlan | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Sync theme to <html> and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("wp-theme", themeName);
  }, [themeName]);

  // Detect Minecraft on mount
  useEffect(() => {
    client
      .findMinecraftDir()
      .then((result) => {
        if (!result) {
          setErrorMsg("Couldn't work out your home folder.");
          setView("failed");
        } else if (!result.exists) {
          setView("bedrock");
        } else {
          setDir(result.path);
          setView("ready");
        }
      })
      .catch((e) => {
        setErrorMsg(String(e));
        setView("failed");
      });
  }, []);

  // Cleanup progress listener on unmount
  useEffect(
    () => () => {
      unlistenRef.current?.();
    },
    []
  );

  const handleSetup = useCallback(async () => {
    if (!dir) return;
    setLoading(true);
    try {
      const m = await client.loadManifest();
      const p = await client.planInstall(m, dir);
      setPlan(p);
      setView(p.mods.length === 0 && p.staleFiles.length === 0 ? "uptodate" : "confirm");
    } catch (e) {
      setErrorMsg(String(e));
      setView("failed");
    } finally {
      setLoading(false);
    }
  }, [dir]);

  const handleInstall = useCallback(async () => {
    if (!plan || !dir) return;
    setView("installing");
    setProgress({ stage: "resolving" });
    unlistenRef.current?.();

    const unlisten = await onInstallProgress((p) => {
      setProgress(p);
      if (p.stage === "done") setView("done");
      if (p.stage === "error") {
        setErrorMsg(p.message);
        setView("failed");
      }
    });
    unlistenRef.current = unlisten;

    try {
      await client.install(plan, dir);
    } catch (e) {
      setErrorMsg(String(e));
      setView("failed");
    }
  }, [plan, dir]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    if (plan && dir) {
      handleInstall();
    } else if (dir) {
      handleSetup();
    } else {
      setView("searching");
      client
        .findMinecraftDir()
        .then((result) => {
          if (!result) {
            setErrorMsg("Couldn't work out your home folder.");
            setView("failed");
          } else if (!result.exists) {
            setView("bedrock");
          } else {
            setDir(result.path);
            setView("ready");
          }
        })
        .catch((e) => {
          setErrorMsg(String(e));
          setView("failed");
        });
    }
  }, [plan, dir, handleInstall, handleSetup]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("mc.norbits.co").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, []);

  const handleOpenMods = useCallback(() => {
    if (dir) client.openModsFolder(dir);
  }, [dir]);

  // --- Progress info ---

  const stepLabels = [
    "Getting your game ready for mods",
    "Adding voice chat",
    "Adding NorBits to your server list",
  ];

  let activeStep = 0;
  let pct = 0;

  if (progress) {
    switch (progress.stage) {
      case "resolving":
        activeStep = 0;
        pct = 3;
        break;
      case "downloading":
        activeStep = 1;
        pct = 10 + Math.round((progress.received / Math.max(progress.total, 1)) * 55);
        break;
      case "verifying":
        activeStep = 1;
        pct = 70;
        break;
      case "installingLoader":
        activeStep = 2;
        pct = 82;
        break;
      case "addingServer":
        activeStep = 2;
        pct = 92;
        break;
      case "done":
        activeStep = 2;
        pct = 100;
        break;
    }
  }

  pct = Math.min(pct, 100);

  // --- Render ---

  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* ── Title bar ─────────────────────────────────────────────── */}
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

      {/* ── Content area ──────────────────────────────────────────── */}
      <main className="bg-wp-body grid flex-1 place-items-center p-10">
        {/* Searching */}
        {view === "searching" && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-[26px] w-[26px] rounded-full border-[2.5px]"
              style={{
                animation: "wp-spin 900ms linear infinite",
                borderColor: "var(--wp-track)",
                borderTopColor: "#2fc532",
              }}
            />
            <p className="text-wp-sub m-0 text-[15px]">Looking for Minecraft on this PC…</p>
          </div>
        )}

        {/* Ready */}
        {view === "ready" && (
          <div className="flex w-full max-w-[430px] flex-col items-center gap-[22px] text-center">
            <div className="bg-wp-accent grid h-14 w-14 shrink-0 place-items-center rounded-full">
              <div className="bg-wp-body h-[21px] w-[21px] rotate-45" />
            </div>
            <div className="flex flex-col gap-[9px]">
              <h2 className="text-wp-title m-0 text-[27px] font-semibold tracking-[-.015em]">
                Let's get your game ready
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                Waypoint sets up everything you need to play on NorBits, then adds the server to
                your list. It takes about a minute.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-3">
              <div className="text-wp-muted flex items-center gap-2 text-[13px]">
                <span className="bg-wp-green block h-1.5 w-1.5 rounded-full" />
                Found Minecraft on this PC
              </div>
              <button
                onClick={handleSetup}
                disabled={loading}
                className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover h-11 w-full cursor-pointer rounded-[6px] border-0 font-sans text-[15px] font-semibold disabled:opacity-70"
              >
                {loading ? "Loading…" : "Set up my game"}
              </button>
              <button
                onClick={() => setView("bedrock")}
                className="text-wp-quiet hover:text-wp-quiet-hover h-8 cursor-pointer border-0 bg-transparent px-2.5 font-sans text-[13px]"
              >
                I'll do it myself
              </button>
            </div>
          </div>
        )}

        {/* Confirm */}
        {view === "confirm" && plan && (
          <div className="flex w-full max-w-[450px] flex-col gap-6">
            <div className="flex flex-col gap-[9px] text-center">
              <h2 className="text-wp-title m-0 text-[25px] font-semibold tracking-[-.015em]">
                Ready when you are
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                Adding voice chat to your game, and putting NorBits in your server list.
              </p>
            </div>

            <div className="border-wp-panel-border bg-wp-panel flex flex-col overflow-hidden rounded-[7px] border">
              <div className="border-wp-row-border bg-wp-panel-head text-wp-strong flex justify-between border-b px-4 py-[14px] text-[13.5px]">
                <span>
                  {plan.mods.length} file{plan.mods.length !== 1 && "s"} to download
                </span>
                <span className="text-wp-quiet">{formatBytes(plan.totalBytes)}</span>
              </div>
              <div
                onClick={() => setExpanded((v) => !v)}
                className="bg-wp-panel-head text-wp-quiet hover:text-wp-quiet-hover flex cursor-pointer items-center justify-between px-4 py-3 text-[13px]"
              >
                <span>What's being installed?</span>
                <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
              </div>
              {expanded && (
                <div className="border-wp-row-border bg-wp-panel-head flex flex-col gap-2.5 border-t px-4 py-[14px]">
                  {plan.mods.map((m) => (
                    <div key={m.filename} className="flex justify-between gap-3">
                      <span className="text-wp-mono-strong font-mono text-[12.5px]">
                        {m.filename}
                      </span>
                      <span className="text-wp-mono-faint font-mono text-[12.5px]">
                        {formatBytes(m.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {plan.staleFiles.length > 0 && (
              <p className="text-wp-muted m-0 text-center text-[13px]">
                Older versions will be replaced.
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleInstall}
                className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover h-11 w-full cursor-pointer rounded-[6px] border-0 font-sans text-[15px] font-semibold"
              >
                Install
              </button>
              <button
                onClick={() => setView("ready")}
                className="text-wp-quiet hover:text-wp-quiet-hover h-9 w-full cursor-pointer border-0 bg-transparent font-sans text-[13px]"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Installing */}
        {view === "installing" && (
          <div className="flex w-full max-w-[450px] flex-col gap-[26px]">
            <div className="flex flex-col gap-[9px] text-center">
              <h2 className="text-wp-title m-0 text-[25px] font-semibold tracking-[-.015em]">
                Setting up your game
              </h2>
              <p className="text-wp-sub m-0 text-[15px]">Hang on a moment — don't close this.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="bg-wp-track h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-wp-green h-full rounded-full transition-[width] duration-[120ms] ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-wp-quiet flex justify-between text-[13px]">
                <span>{stepLabels[activeStep]}</span>
                <span>{pct}%</span>
              </div>
            </div>

            <div className="border-wp-panel-border bg-wp-panel flex flex-col gap-3 rounded-[7px] border p-4">
              {stepLabels.map((label, i) => (
                <div key={label}>
                  {i < activeStep && (
                    <div className="text-wp-muted flex items-center gap-2.5 text-[13.5px]">
                      <span className="text-[#0dc326]">✓</span>
                      {label}
                    </div>
                  )}
                  {i === activeStep && (
                    <div className="text-wp-strong flex items-center gap-2.5 text-[13.5px]">
                      <span
                        className="block h-3 w-3 rounded-full border-2"
                        style={{
                          animation: "wp-spin 900ms linear infinite",
                          borderColor: "var(--wp-track)",
                          borderTopColor: "#2fc532",
                        }}
                      />
                      {label}
                    </div>
                  )}
                  {i > activeStep && (
                    <div className="text-wp-faint flex items-center gap-2.5 text-[13.5px]">
                      <span className="inline-block w-3 text-center">·</span>
                      {label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {view === "done" && (
          <div className="flex w-full max-w-[450px] flex-col items-center gap-6 text-center">
            <div className="bg-wp-green/15 text-wp-green grid h-[52px] w-[52px] place-items-center rounded-full text-[23px]">
              ✓
            </div>
            <div className="flex flex-col gap-[9px]">
              <h2 className="text-wp-title m-0 text-[26px] font-semibold tracking-[-.015em]">
                Your game is ready
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                Open Minecraft, choose the NorBits option in the bottom-left of the launcher, then
                pick NorBits from your server list.
              </p>
            </div>
            <button className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover h-11 w-full cursor-pointer rounded-[6px] border-0 font-sans text-[15px] font-semibold">
              Close Waypoint
            </button>
            <button
              onClick={handleOpenMods}
              className="text-wp-quiet hover:text-wp-quiet-hover h-8 cursor-pointer border-0 bg-transparent font-sans text-[13px]"
            >
              Show me the files
            </button>
          </div>
        )}

        {/* Bedrock */}
        {view === "bedrock" && (
          <div className="flex w-full max-w-[450px] flex-col items-center gap-[22px] text-center">
            <div className="bg-wp-green/[.14] text-wp-green grid h-11 w-11 place-items-center rounded-full text-[20px]">
              ✓
            </div>
            <div className="flex flex-col gap-[9px]">
              <h2 className="text-wp-title m-0 text-[25px] font-semibold tracking-[-.015em]">
                You're already good to go
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                Your version of Minecraft doesn't need anything installed. Just add the server and
                play.
              </p>
            </div>
            <div className="border-wp-panel-border bg-wp-panel flex w-full items-center justify-between gap-3 rounded-[7px] border px-4 py-[14px]">
              <div className="flex flex-col gap-[3px] text-left">
                <span className="text-wp-muted text-[11.5px]">Server address</span>
                <span className="text-wp-title font-mono text-[15px]">mc.norbits.co</span>
              </div>
              <button
                onClick={handleCopy}
                className="border-wp-ghost-border bg-wp-ghost-bg text-wp-ghost-text hover:border-wp-accent h-[34px] shrink-0 cursor-pointer rounded-[5px] border px-[14px] font-sans text-[13px] font-medium whitespace-nowrap"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-wp-muted m-0 text-[13.5px] leading-[1.6]">
              In Minecraft, open <span className="text-wp-strong">Play → Servers → Add Server</span>{" "}
              and paste it in.
            </p>
          </div>
        )}

        {/* Failed */}
        {view === "failed" && (
          <div className="flex w-full max-w-[450px] flex-col items-center gap-[22px] text-center">
            <div className="bg-wp-panel text-wp-strong grid h-11 w-11 place-items-center rounded-full text-[19px]">
              !
            </div>
            <div className="flex flex-col gap-[9px]">
              <h2 className="text-wp-title m-0 text-[24px] font-semibold tracking-[-.015em]">
                Something went wrong
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                {errorMsg ||
                  "Check your internet connection and try again. Nothing was changed in your game."}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover h-11 w-full cursor-pointer rounded-[6px] border-0 font-sans text-[15px] font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {/* Up to date */}
        {view === "uptodate" && (
          <div className="flex w-full max-w-[450px] flex-col items-center gap-[22px] text-center">
            <div className="flex flex-col gap-[9px]">
              <h2 className="text-wp-title m-0 text-[25px] font-semibold tracking-[-.015em]">
                Everything's already set up
              </h2>
              <p className="text-wp-sub m-0 text-[15px] leading-[1.6] text-pretty">
                Nothing new to add — your game is ready for NorBits. You can run the setup again any
                time if something stops working.
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="border-wp-ghost-border bg-wp-ghost-bg text-wp-ghost-text hover:border-wp-accent h-11 w-full cursor-pointer rounded-[6px] border font-sans text-[15px] font-medium"
            >
              Set it up again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
