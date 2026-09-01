//! Fetching the remote manifest.

use crate::error::{Error, Result, Service};
use crate::services::http;
use crate::types::Manifest;

/// Interim home, until it moves to gaming.norbits.co/manifest.json.
const MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/norbits-co/norbits-waypoint/main/manifest.json";

pub async fn fetch() -> Result<Manifest> {
    let client = http::client()?;

    client
        .get(MANIFEST_URL)
        .send()
        .await
        .map_err(|source| Error::Unreachable {
            service: Service::NorBits,
            source,
        })?
        .error_for_status()
        .map_err(|source| Error::ManifestUnavailable { source })?
        .json::<Manifest>()
        .await
        .map_err(|source| Error::BadResponse {
            service: Service::NorBits,
            source,
        })
}
