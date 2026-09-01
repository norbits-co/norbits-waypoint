//! Everything that crosses the bridge to the frontend.
//!
//! This file mirrors `src/api/types.ts`. **Neither side changes alone** - a contract change is a conversation and one commit touching both.

use serde::{Deserialize, Serialize};

/// Where the vanilla launcher stores its data, and whether it's actually there.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftDir {
    pub path: String,
    /// False means no Java install - most likely a Bedrock player.
    pub exists: bool,
}

/// The remote mod list, fetched at runtime rather than compiled in.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub mc_version: String,
    pub loader: String,
    /// None means "resolve the latest stable loader".
    pub loader_version: Option<String>,
    pub server: Server,
    pub mods: Vec<ModEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub name: String,
    pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModEntry {
    pub slug: String,
    pub required: bool,
    /// Shown to players. Never the slug or the filename.
    pub name: String,
    pub blurb: String,
}

/// One jar we intend to place in `mods/`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannedMod {
    pub project_id: String,
    pub version: String,
    pub filename: String,
    pub url: String,
    pub size: u64,
    pub sha512: String,
    /// False when pulled in as a dependency rather than listed in the manifest.
    pub requested: bool,
}

/// Everything an install will do, shown to the player before anything is written.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub mods: Vec<PlannedMod>,
    pub loader_version: String,
    pub total_bytes: u64,
    /// Jars from a previous install this one supersedes.
    pub stale_files: Vec<String>,
}
