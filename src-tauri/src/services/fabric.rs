//! The Fabric mod loader, via meta.fabricmc.net.
//!
//! We never run the Fabric installer jar - it needs a system Java, and most of our players don't have one. The vanilla launcher ships its own hidden JRE, so
//! we write the profile JSON directly instead (#17).

use serde::Deserialize;

use crate::error::{Error, Result, Service};

const FABRIC_META: &str = "https://meta.fabricmc.net/v2";

#[derive(Debug, Deserialize)]
struct LoaderEntry {
    loader: LoaderInfo,
}

#[derive(Debug, Deserialize)]
struct LoaderInfo {
    version: String,
    stable: bool,
}

/// Newest stable loader for this Minecraft version, unless the manifest pins one.
pub async fn resolve_loader_version(
    client: &reqwest::Client,
    mc_version: &str,
    pinned: Option<&str>,
) -> Result<String> {
    if let Some(v) = pinned {
        return Ok(v.to_string());
    }

    let url = format!("{FABRIC_META}/versions/loader/{mc_version}");

    let entries: Vec<LoaderEntry> = client
        .get(&url)
        .send()
        .await
        .map_err(|source| Error::Unreachable {
            service: Service::Fabric,
            source,
        })?
        .error_for_status()
        .map_err(|_| Error::UnsupportedGameVersion {
            mc_version: mc_version.to_string(),
        })?
        .json()
        .await
        .map_err(|source| Error::BadResponse {
            service: Service::Fabric,
            source,
        })?;

    entries
        .into_iter()
        .find(|e| e.loader.stable)
        .map(|e| e.loader.version)
        .ok_or_else(|| Error::UnsupportedGameVersion {
            mc_version: mc_version.to_string(),
        })
}
