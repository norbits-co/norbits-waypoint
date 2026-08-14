use serde::{Deserialize, Serialize};

// interhim home, till it moves to gaming.norbits.co/manifest.json

const MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/norbits-co/norbits-waypoint/main/manifest.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub mc_version: String,
    pub loader: String,
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
    pub name: String,
    pub blurb: String,
}

#[tauri::command]
pub async fn load_manifest() -> Result<Manifest, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    client
        .get(MANIFEST_URL)
        .send()
        .await
        .map_err(|_| {
            "Couldn't reach NorBits. Check your internet connection and try again.".to_string()
        })?
        .error_for_status()
        .map_err(|e| format!("NorBits server list unavailable: {e}"))?
        .json::<Manifest>()
        .await
        .map_err(|e| format!("The server list looks corrupted: {e}"))
}
