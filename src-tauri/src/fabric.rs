use serde::Deserialize;

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
) -> Result<String, String> {
    if let Some(v) = pinned {
        return Ok(v.to_string());
    }

    let url = format!("{FABRIC_META}/versions/loader/{mc_version}");

    let entries: Vec<LoaderEntry> = client
        .get(&url)
        .send()
        .await
        .map_err(|_| {
            "Couldn't reach the mod loader service. Check your internet connection.".to_string()
        })?
        .error_for_status()
        .map_err(|_| format!("Minecraft {mc_version} isn't supported by the mod loader yet."))?
        .json()
        .await
        .map_err(|e| format!("Unexpected response from the mod loader service: {e}"))?;

    entries
        .into_iter()
        .find(|e| e.loader.stable)
        .map(|e| e.loader.version)
        .ok_or_else(|| format!("No stable mod loader for Minecraft {mc_version} yet."))
}
