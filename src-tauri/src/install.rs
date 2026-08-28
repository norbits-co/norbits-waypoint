use serde::Serialize;

use crate::fabric;
use crate::http;
use crate::manifest::Manifest;
use crate::modrinth::{self, PlannedMod};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub mods: Vec<PlannedMod>,
    pub loader_version: String,
    pub total_bytes: u64,
    /// Jars from a previous install this one supersedes. Always empty until
    /// install-state tracking lands in #16.
    pub stale_files: Vec<String>,
}

#[tauri::command]
pub async fn plan_install(manifest: Manifest, mc_dir: String) -> Result<InstallPlan, String> {
    // Needed for stale-file detection in #16. Kept in the signature now so the
    // contract doesn't have to change later.
    let _ = &mc_dir;

    let client = http::client()?;

    let loader_version = fabric::resolve_loader_version(
        &client,
        &manifest.mc_version,
        manifest.loader_version.as_deref(),
    )
    .await?;

    let mods = modrinth::resolve_mods(&client, &manifest).await?;
    let total_bytes = mods.iter().map(|m| m.size).sum();

    Ok(InstallPlan {
        mods,
        loader_version,
        total_bytes,
        stale_files: Vec::new(),
    })
}
