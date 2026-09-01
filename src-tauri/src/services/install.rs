//! Working out what an install will do.

use crate::error::Result;
use crate::services::{fabric, http, modrinth};
use crate::types::{InstallPlan, Manifest};

/// Resolve the manifest into an exact set of jars and a loader version.
///
/// `mc_dir` is unused until #16 needs it for stale-file detection. It's in the
/// signature now so the contract doesn't have to change then.
#[allow(unused_variables)]
pub async fn plan(manifest: &Manifest, mc_dir: &str) -> Result<InstallPlan> {
    let client = http::client()?;

    let loader_version = fabric::resolve_loader_version(
        &client,
        &manifest.mc_version,
        manifest.loader_version.as_deref(),
    )
    .await?;

    let mods = modrinth::resolve_mods(&client, manifest).await?;
    let total_bytes = mods.iter().map(|m| m.size).sum();

    Ok(InstallPlan {
        mods,
        loader_version,
        total_bytes,
        stale_files: Vec::new(),
    })
}
