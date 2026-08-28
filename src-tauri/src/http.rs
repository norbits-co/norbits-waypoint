use std::time::Duration;

// Modrinth requires a UA identifying the app with a contact address.
// A generic one gets rate-limited or blocked outright.
const UA: &str = concat!(
    "norbits-co/norbits-waypoint/",
    env!("CARGO_PKG_VERSION"),
    " (contact@norbits.co)"
);

pub fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(UA)
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Couldn't start the downloader: {e}"))
}
