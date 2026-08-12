import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// contract between rust backend and react frontend.
// types here are mirrored struct in src-tauri.

export type Manifest = {
    mcVersion: string
    loader: 'fabric'
    loaderVersion: string | null
    server: { name: string; address: string }
    mods: { slug: string; required: boolean }[]
}

export type MinecraftDir = {
    path: string
    // false = bedrock player
    exists: boolean
}

export type PlannedMod = {
    projectId: string
    version: string
    filename: string
    url: string
    size: number
    sha512: string
    requested: boolean
}

export type InstallPlan = {
    mods: PlannedMod[]
    loaderVersion: string
    totalBytes: number
    staleFiles: string[]
}

export type InstallProgress =
    | { stage: "resolving" }
    | { stage: "downloading"; filename: string; received: number; total: number }
    | { stage: "verifying"; filename: string }
    | { stage: "installingLoader" }
    | { stage: "addingServer" }
    | { stage: "done" }
    | { stage: "error"; message: string }

export type PlayerSample = { name: string; uuid: string }

export type ServerStatus = {
    online: boolean
    motd: string | null
    players: { online: number; max: number; sample: PlayerSample[] } | null
    versionName: string | null
    latencyMs: number | null
}

// commands
export const api = {
    findMinecraftDir: () => invoke<MinecraftDir | null>("find_minecraft_dir"),

    loadManifest: () => invoke<Manifest>("load_manifest"),

    planInstall: (manifest: Manifest, mcDir: string) =>
        invoke<InstallPlan>("plan_install", { manifest, mcDir }),

    install: (plan: InstallPlan, mcDir: string) =>
        invoke<void>("install", { plan, mcDir }),

    pingServer: (address: string) =>
        invoke<ServerStatus>("ping_server", { address }),

    openModsFolder: (mcDir: string) =>
        invoke<void>("open_mods_folder", { mcDir } ),
}

// Mock backend - "pnpm dev:mock"
const USE_MOCKS = import.meta.env.VITE_MOCK == "1"

type ProgressCb = (p: InstallProgress) => void
const mockListeners = new Set<ProgressCb>()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const mocks: typeof api = {
    findMinecraftDir: async () => ({
        path: "C:\\Users\\you\\AppData\\Roaming\\.minecraft",
        exists: true,
    }),

    loadManifest: async () => ({
        mcVersion: "26.1.2",
        loader: "fabric",
        loaderVersion: null,
        server: { name: "NorBits MC", address: "mc.norbits.co" },
        mods: [{ slug: 'simple-voice-chat', required: true }],
    }),

    planInstall: async() => ({
        loaderVersion: "0.19.3",
        totalBytes: 3_100_000,
        staleFiles: ["voicechat-fabric-2.6.21+26.1.2.jar"],
        mods: [
            {
                projectId: "9eGK6K1",
                version: "fabric-2.6.22+26.1.2",
                filename: "voicechat-fabric-2.6.22+26.1.2.jar",
                url: 'https://example.invalid/voicechat.jar',
                size: 1_200_000,
                sha512: 'adac8ed875bb9f1ac50ef47a',
                requested: true,
            },
            {
                projectId: 'P7dR8mSH',
                version: '0.155.2+26.1.2',
                filename: 'fabric-api-0.155.2+26.1.2.jar',
                url: 'https://example.invalid/fabric-api.jar',
                size: 1_900_000,
                sha512: '5a870eb4d731393b4df65028',
                requested: false,
            },
        ],
    }),

    install: async(plan) => {
        const emit = (p: InstallProgress) => mockListeners.forEach((cb) => cb(p))

        emit({ stage: "resolving" })
        await sleep(600)

        for(const m of plan.mods) {
            const step = Math.ceil(m.size / 8)
            for (let received = 0; received < m.size + step; received += step) {
                emit({
                    stage: "downloading",
                    filename: m.filename,
                    received: Math.min(received, m.size),
                    total: m.size,
                })
                await sleep(120)
            }
            emit({ stage: "verifying", filename: m.filename })
            await sleep(200)
        }

        emit({ stage: "installingLoader" })
        await sleep(700)
        emit({ stage: "addingServer" })
        await sleep(400)
        emit({ stage: "done" })
    },

    pingServer: async () => ({
        online: true,
        motd: "Norbits MC - Welcome Back!",
        players: {
            online: 3,
            max: 25,
            sample: [
                { name: "Dwain", uuid: "069a79f4-44e9-4726-a5be-fca90e38aaf5"},
                { name: "Jerob", uuid: "853c80ef-3c37-49fd-aa49-938b674adae6"},
                { name: "Luke", uuid: "61699b2e-d327-4a01-9f1e-0ea8c3f06bc6"},
            ],
        },
        versionName: "Paper 26.1.2",
        latencyMs: 42,
    }),

    openModsFolder: async() => {}
}

// Import this and not "api" - swaps to mock data
export const client = USE_MOCKS ? mocks : api

// install progress
export function onInstallProgress(cb: (p: InstallProgress) => void) {
    if(USE_MOCKS) {
        mockListeners.add(cb)
        return Promise.resolve(() => {
            mockListeners.delete(cb)
        })
    }
    
    return listen<InstallProgress>("install-progress", (e) => cb(e.payload))
}