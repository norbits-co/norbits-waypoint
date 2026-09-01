//! The shared HTTP client.

use std::time::Duration;

use crate::error::{Error, Result};

/// Modrinth requires a UA identifying the app with a contact address. A generic one gets rate-limited or blocked outright.
const UA: &str = concat!(
    "norbits-co/norbits-waypoint/",
    env!("CARGO_PKG_VERSION"),
    " (contact@norbits.co)"
);

pub fn client() -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(UA)
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(Error::HttpClient)
}
