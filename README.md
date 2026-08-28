<div align="left">

# NorBits Waypoint

<img height="300" alt="dark" src="https://github.com/user-attachments/assets/79992b68-454f-4b47-a77e-d84f4f9f5481" />

### ⚙️ One Click. One Server. Zero Setup.

<br />

</div>

![Tauri v2](https://img.shields.io/badge/Tauri-v2-9A7600?style=for-the-badge&labelColor=6B5200&logo=tauri&logoColor=white)
![Rust v1.94+](https://img.shields.io/badge/Rust-v1.94+-DEA584?style=for-the-badge&labelColor=9C6B4D&logo=rust&logoColor=white)
![React v19+](https://img.shields.io/badge/React-v19+-61DAFB?style=for-the-badge&labelColor=149ECA&logo=react&logoColor=white)
![TypeScript v6+](https://img.shields.io/badge/TypeScript-v6+-2563EB?style=for-the-badge&labelColor=3178C6&logo=typescript&logoColor=white)
![Vite v8+](https://img.shields.io/badge/Vite-v8+-646CFF?style=for-the-badge&labelColor=4B4FD6&logo=vite&logoColor=white)
![Tailwind CSS v4+](https://img.shields.io/badge/Tailwind%20CSS-v4+-0F766E?style=for-the-badge&labelColor=0891B2&logo=tailwind-css&logoColor=white)
![pnpm v10+](https://img.shields.io/badge/pnpm-v10+-D97706?style=for-the-badge&labelColor=F69220&logo=pnpm&logoColor=white)
![Modrinth](https://img.shields.io/badge/Mods-Modrinth-111111?style=for-the-badge&labelColor=1BD96A&logo=modrinth&logoColor=white)

## 🧭 Overview

NorBits Waypoint is a one-shot gaming setup utility built for players who just want to **join NorBit's servers without manually configuring anything**.

**One button. Then open the Game and play.**

> [!WARNING]
> **NorBits Waypoint is not released yet.**
>
> The application is currently under development. There are no official binaries available at this time.


## 🛡️ Transparency & Safety

Waypoint is intentionally published as source-available.

The entire application source is available in this repository so that players and developers can:

* 🔍 Inspect what the application does
* 🛡️ Audit it for malicious behaviour
* 🧠 Understand how the installer modifies the game
* 🔎 Verify that the official application behaves as documented

The application does not include telemetry.

Its network requests are limited to the services required to perform the setup, such as the remote NorBits configuration.

> [!NOTE]
> Official releases are planned to be distributed through GitHub Releases, with a dedicated NorBits download page acting as the player-facing front door.
>
> The release pipeline and official binaries are not available yet.

## 🧠 Architecture

The React frontend communicates with the Rust backend through a small API contract.

```text
React UI
   │
   ▼
src/lib/api.ts
   │
   ▼
Tauri Commands
   │
   ▼
Rust Backend
   │
   ├── Game detection
   ├── Mod loader setup
   ├── Mod downloads
   ├── SHA-512 verification
   └── Game configuration
```

`src/lib/api.ts` is the contract between the frontend and Rust backend and is the only frontend file responsible for calling Tauri's `invoke`.

The same API is backed by a complete mock implementation when `VITE_MOCK` is enabled, allowing the frontend to be developed independently of the Rust backend.

## 🌍 Platform Support

Waypoint is being developed as a cross-platform desktop application.

### Planned Targets

| Platform   | Architecture | Status     |
| ---------- | ------------ | ---------- |
| 🪟 Windows | x64          | 🔨 Planned |
| 🍎 macOS   | arm64        | 🔨 Planned |
| 🍎 macOS   | x64          | 🔨 Planned |
| 🐧 Linux   | x64          | 🔨 Planned |

Windows ARM is **not currently planned**.

> [!NOTE]
> These are intended release targets. Official platform builds are not available yet.

## 🚧 Project Status

Waypoint is currently in active development.

The application is not yet distributed to players, and the release pipeline is still being built.

The planned distribution model is:

```text
NorBits Download Page
        │
        ▼
   GitHub Releases
        │
        ▼
  Waypoint Installer
        │
        ▼
   NorBits Game's Setup
```

Players will eventually interact with the NorBits download page rather than GitHub directly.

## 🧑‍💻 Team

| Operator                                           | Focus              |
| -------------------------------------------------- | ------------------ |
| **[@dwainXDL](https://github.com/dwainXDL)**       | ⚙️ Rust Backend    |
| **[@PWTMihisara](https://github.com/PWTMihisara)** | 🎨 Frontend · Site |

## 📫 Contact

For questions, security concerns, or permission requests:

**[contact@norbits.co](mailto:contact@norbits.co)**

## 📄 License

### NorBits Waypoint - Source-Available License

Copyright © 2026 NorBits. All rights reserved.

This source code is published for transparency: so that anyone can read it, audit it for malicious behaviour, and verify that official binaries correspond to this source.

**It is not open source.**

### Permitted

You may:

* 👀 View, read, and analyse the source code
* 🔨 Compile it locally solely to verify official builds
* 🎮 Download, install, and run official NorBits builds for their intended purpose of connecting to NorBits Game Servers

### Not Permitted

Without prior written permission from NorBits, you may not:

* 🚫 Use this software or any portion of it in another project
* 🚫 Copy, modify, or create derivative works
* 🚫 Redistribute the source or compiled software
* 🚫 Operate or offer the software as a service
* 🚫 Use the NorBits name, logo, or branding

For permission requests, contact **[contact@norbits.co](mailto:contact@norbits.co)**.

See [`LICENSE`](LICENSE) for the complete license text.

<br />

<div align="center">

`NORBITS / WAYPOINT / EST. 2026 / GLOBAL 🌍`

</div>
