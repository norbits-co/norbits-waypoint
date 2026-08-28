use std::collections::{HashSet, VecDeque};

use serde::{Deserialize, Serialize};

use crate::manifest::Manifest;

const API: &str = "https://api.modrinth.com/v2";

// Modrinth's shapes. serde ignores fields we don't declare.
// No rename_all here — their JSON is snake_case already.

#[derive(Debug, Deserialize)]
struct ApiVersion {
    project_id: String,
    version_number: String,
    date_published: String,
    files: Vec<ApiFile>,
    dependencies: Vec<ApiDependency>,
}

#[derive(Debug, Deserialize)]
struct ApiFile {
    url: String,
    filename: String,
    size: u64,
    hashes: ApiHashes,
    primary: bool,
}

#[derive(Debug, Deserialize)]
struct ApiHashes {
    sha512: String,
}

#[derive(Debug, Deserialize)]
struct ApiDependency {
    project_id: Option<String>,
    dependency_type: String,
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

async fn fetch_version(
    client: &reqwest::Client,
    id_or_slug: &str,
    display_name: &str,
    mc_version: &str,
    loader: &str,
) -> Result<ApiVersion, String> {
    let url = format!("{API}/project/{id_or_slug}/version");

    let mut versions: Vec<ApiVersion> = client
        .get(&url)
        .query(&[
            ("loaders", format!("[\"{loader}\"]")),
            ("game_versions", format!("[\"{mc_version}\"]")),
        ])
        .send()
        .await
        .map_err(|_| {
            "Couldn't reach the mod service. Check your internet connection and try again."
                .to_string()
        })?
        .error_for_status()
        .map_err(|_| format!("Couldn't find {display_name}. It may have been removed."))?
        .json()
        .await
        .map_err(|e| format!("Unexpected response while looking up {display_name}: {e}"))?;

    // The API happens to return newest-first, but that isn't promised anywhere.
    versions.sort_by(|a, b| b.date_published.cmp(&a.date_published));

    versions
        .into_iter()
        .next()
        .ok_or_else(|| format!("{display_name} isn't available for Minecraft {mc_version} yet."))
}

/// Every jar needed for this manifest, following required dependencies.
pub async fn resolve_mods(
    client: &reqwest::Client,
    manifest: &Manifest,
) -> Result<Vec<PlannedMod>, String> {
    // A worklist, not recursion: async recursion needs boxing and a queue reads
    // better anyway. (id, was it asked for, name to show a player)
    let mut queue: VecDeque<(String, bool, String)> = manifest
        .mods
        .iter()
        .map(|m| (m.slug.clone(), true, m.name.clone()))
        .collect();

    let mut seen: HashSet<String> = HashSet::new();
    let mut planned: Vec<PlannedMod> = Vec::new();

    while let Some((id, requested, display_name)) = queue.pop_front() {
        if seen.contains(&id) {
            continue;
        }

        let version = fetch_version(
            client,
            &id,
            &display_name,
            &manifest.mc_version,
            &manifest.loader,
        )
        .await?;

        // We may have arrived here by slug ("simple-voice-chat") while a
        // dependency refers to the same project by id ("9eGKb6K1"). Record both,
        // or we fetch and install the same mod twice.
        seen.insert(id.clone());
        seen.insert(version.project_id.clone());

        for dep in &version.dependencies {
            if dep.dependency_type == "required" {
                if let Some(pid) = &dep.project_id {
                    if !seen.contains(pid) {
                        // Dependencies have no player-facing name of their own,
                        // so borrow the name of whatever pulled them in.
                        queue.push_back((pid.clone(), false, display_name.clone()));
                    }
                }
            }
        }

        // `primary` marks the mod jar; the rest are sources and javadoc.
        let file = version
            .files
            .iter()
            .find(|f| f.primary)
            .or_else(|| version.files.first())
            .ok_or_else(|| format!("{display_name} has no file to download."))?;

        planned.push(PlannedMod {
            project_id: version.project_id.clone(),
            version: version.version_number.clone(),
            filename: file.filename.clone(),
            url: file.url.clone(),
            size: file.size,
            sha512: file.hashes.sha512.clone(),
            requested,
        });
    }

    Ok(planned)
}
