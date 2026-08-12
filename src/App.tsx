import { useEffect, useState } from 'react'
import { client, type MinecraftDir } from "./lib/api";

function App() {
  const [dir, setDir] = useState<MinecraftDir | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client
    .findMinecraftDir()
    .then(setDir)
    .catch((e) => setError(String(e)))
    .finally(() => setLoading(false))
  }, [])

return (
  <main className="min-h-screen bg-neutral-950 p-10 text-neutral-100">
  <h1 className="text-2xl font-semibold">Norbits Waypoint</h1>
  <p className="mt-1 text-sm text-neutral-400">Server setup &amp; status</p>

  <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
    <h2 className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
      Minecraft folder
    </h2>

    {loading && <p className="mt-2 text-sm text-neutral-400">Looking...</p>}

    {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

    {!loading && !error && dir === null && (
      <p className="mt-2 text-sm text-amber-400">
        Couldn&apos;t work out your home folder.
      </p>
    )}

    {dir && (
      <>
      <p className="mt-2 font-mono text-sm break-all">{dir.path}</p>
      <p className="mt-2 text-sm">
        {dir.exists ? (
          <span className="text-emerald-400">Found</span>
        ) : (
          <span className="text-amber-400">
            Not found - no Java Minecraft install here
          </span>
        )}
      </p>
      </>
    )}
  </section>
  </main> 
)
}

export default App