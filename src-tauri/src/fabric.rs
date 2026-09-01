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
        .map_err(|e| {
            log::error!("fabric meta unreachable for {mc_version}: {e}");
            "Couldn't download what your game needs. Check your internet connection and try again."
                .to_string()
        })?
        .error_for_status()
        .map_err(|e| {
            log::error!("fabric meta returned an error for {mc_version}: {e}");
            format!("Minecraft {mc_version} isn't supported yet.")
        })?
        .json()
        .await
        .map_err(|e| {
            log::error!("could not parse fabric meta for {mc_version}: {e}");
            "Something went wrong getting your game ready. Please try again, and let us know if it keeps happening."
                .to_string()
        })?;

    entries
        .into_iter()
        .find(|e| e.loader.stable)
        .map(|e| e.loader.version)
        .ok_or_else(|| format!("Minecraft {mc_version} isn't supported yet."))
}
