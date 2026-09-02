//! Resolving the manifest's mod list into actual jars, via api.modrinth.com.
//!
//! Required dependencies are followed automatically, so Fabric API never has to be listed by hand.

use std::collections::{HashSet, VecDeque};

use serde::Deserialize;

use crate::error::{Error, Result, Service};
use crate::types::{Manifest, PlannedMod};

/// Production base.
pub const API: &str = "https://api.modrinth.com/v2";

/// What a dependency is called in the confirmation list.
const DEPENDENCY_LABEL: &str = "Supporting Files";

// Modrinth's own shapes. serde ignores fields we don't declare.
// No rename_all here - their JSON is snake_case already.

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

/// One item of work: a project to resolve, and how to describe it.
#[derive(Debug, Clone, PartialEq)]
struct Pending {
    /// A slug for manifest entries, a project id for dependencies.
    id: String,
    /// False when pulled in as a dependency.
    requested: bool,
    /// Used in error messages.
    display_name: String,
    list_name: String,
}

async fn fetch_version(
    client: &reqwest::Client,
    api: &str,
    id_or_slug: &str,
    display_name: &str,
    mc_version: &str,
    loader: &str,
) -> Result<ApiVersion> {
    let url = format!("{api}/project/{id_or_slug}/version");

    let mut versions: Vec<ApiVersion> = client
        .get(&url)
        .query(&[
            ("loaders", format!("[\"{loader}\"]")),
            ("game_versions", format!("[\"{mc_version}\"]")),
        ])
        .send()
        .await
        .map_err(|source| Error::Unreachable {
            service: Service::Modrinth,
            source,
        })?
        .error_for_status()
        .map_err(|source| Error::ModNotFound {
            name: display_name.to_string(),
            source,
        })?
        .json()
        .await
        .map_err(|source| Error::BadResponse {
            service: Service::Modrinth,
            source,
        })?;

    // The API happens to return newest-first, but that isn't promised anywhere.
    versions.sort_by(|a, b| b.date_published.cmp(&a.date_published));

    versions.into_iter().next().ok_or(Error::ModNoBuild {
        name: display_name.to_string(),
        mc_version: mc_version.to_string(),
    })
}

/// Everything the manifest asks for, in the order it should be worked through.
fn initial_queue(manifest: &Manifest) -> VecDeque<Pending> {
    manifest
        .mods
        .iter()
        .map(|m| Pending {
            id: m.slug.clone(),
            requested: true,
            display_name: m.name.clone(),
            list_name: m.name.clone(),
        })
        .collect()
}

/// The required dependencies of `version` that we haven't already resolved.
///
/// Dependencies have no player-facing name of their own. So pull in the display_name of the parent.
fn required_dependencies(
    version: &ApiVersion,
    seen: &HashSet<String>,
    parent_name: &str,
) -> Vec<Pending> {
    version
        .dependencies
        .iter()
        .filter(|d| d.dependency_type == "required")
        .filter_map(|d| d.project_id.as_ref())
        .filter(|pid| !seen.contains(*pid))
        .map(|pid| Pending {
            id: pid.clone(),
            requested: false,
            display_name: parent_name.to_string(),
            list_name: DEPENDENCY_LABEL.to_string(),
        })
        .collect()
}

/// Every jar needed for this manifest, following required dependencies.
pub async fn resolve_mods(
    client: &reqwest::Client,
    api: &str,
    manifest: &Manifest,
) -> Result<Vec<PlannedMod>> {
    let mut queue = initial_queue(manifest);
    let mut seen: HashSet<String> = HashSet::new();
    let mut planned: Vec<PlannedMod> = Vec::new();

    while let Some(pending) = queue.pop_front() {
        if seen.contains(&pending.id) {
            continue;
        }

        let version = fetch_version(
            client,
            api,
            &pending.id,
            &pending.display_name,
            &manifest.mc_version,
            &manifest.loader,
        )
        .await?;

        // We may have arrived here by slug ("simple-voice-chat") while a dependency refers to the same project by id ("9eGKb6K1").
        // Record both, or we fetch and install the same mod twice.
        seen.insert(pending.id.clone());
        seen.insert(version.project_id.clone());

        queue.extend(required_dependencies(
            &version,
            &seen,
            &pending.display_name,
        ));

        // `primary` marks the mod jar; the rest are sources and javadoc.
        let file = version
            .files
            .iter()
            .find(|f| f.primary)
            .or_else(|| version.files.first())
            .ok_or(Error::ModNoFile {
                name: pending.display_name.clone(),
            })?;

        planned.push(PlannedMod {
            project_id: version.project_id.clone(),
            version: version.version_number.clone(),
            name: pending.list_name.clone(),
            filename: file.filename.clone(),
            url: file.url.clone(),
            size: file.size,
            sha512: file.hashes.sha512.clone(),
            requested: pending.requested,
        });
    }

    Ok(planned)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ModEntry, Server};

    fn manifest(mods: &[(&str, &str)]) -> Manifest {
        Manifest {
            mc_version: "26.1.2".into(),
            loader: "fabric".into(),
            loader_version: None,
            server: Server {
                name: "NorBits MC".into(),
                address: "mc.norbits.co".into(),
            },
            mods: mods
                .iter()
                .map(|(slug, name)| ModEntry {
                    slug: (*slug).into(),
                    required: true,
                    name: (*name).into(),
                    blurb: String::new(),
                })
                .collect(),
        }
    }

    fn version_with_deps(project_id: &str, deps: &[(&str, &str)]) -> ApiVersion {
        ApiVersion {
            project_id: project_id.into(),
            version_number: "1.0.0".into(),
            date_published: "2026-01-01T00:00:00Z".into(),
            files: vec![],
            dependencies: deps
                .iter()
                .map(|(pid, kind)| ApiDependency {
                    project_id: Some((*pid).into()),
                    dependency_type: (*kind).into(),
                })
                .collect(),
        }
    }

    #[test]
    fn queue_starts_with_every_manifest_mod_marked_requested() {
        let queue = initial_queue(&manifest(&[
            ("simple-voice-chat", "Voice Chat"),
            ("modmenu", "Mod Menu"),
        ]));

        assert_eq!(queue.len(), 2);
        assert!(queue.iter().all(|p| p.requested));
        assert_eq!(queue[0].id, "simple-voice-chat");
        assert_eq!(queue[0].display_name, "Voice Chat");
    }

    #[test]
    fn optional_dependencies_are_ignored() {
        // Simple Voice Chat declares seven optional dependencies and no required ones, so a real manifest resolves to a single jar.
        let version = version_with_deps("9eGKb6K1", &[("SRlzjEBS", "optional")]);

        let deps = required_dependencies(&version, &HashSet::new(), "Voice Chat");

        assert!(deps.is_empty());
    }

    #[test]
    fn required_dependencies_are_queued_and_not_marked_requested() {
        let version = version_with_deps("mOgUt4GM", &[("P7dR8mSH", "required")]);

        let deps = required_dependencies(&version, &HashSet::new(), "Mod Menu");

        assert_eq!(deps.len(), 1);
        assert_eq!(deps[0].id, "P7dR8mSH");
        assert!(!deps[0].requested);
    }

    #[test]
    fn a_dependency_borrows_the_name_of_whatever_pulled_it_in() {
        let version = version_with_deps("mOgUt4GM", &[("P7dR8mSH", "required")]);

        let deps = required_dependencies(&version, &HashSet::new(), "Mod Menu");

        assert_eq!(deps[0].display_name, "Mod Menu");
    }

    #[test]
    fn an_already_seen_dependency_is_not_queued_again() {
        // Two mods both depending on Fabric API must not produce two copies of it.
        let version = version_with_deps("mOgUt4GM", &[("P7dR8mSH", "required")]);
        let seen = HashSet::from(["P7dR8mSH".to_string()]);

        let deps = required_dependencies(&version, &seen, "Mod Menu");

        assert!(deps.is_empty());
    }
}
