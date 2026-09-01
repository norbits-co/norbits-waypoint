//! `resolve_loader_version` against a mock Fabric meta.

use norbits_waypoint_lib::error::Error;
use norbits_waypoint_lib::services::{fabric, http};
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn loader(version: &str, stable: bool) -> serde_json::Value {
    json!({ "loader": { "version": version, "stable": stable } })
}

async fn mock_loaders(server: &MockServer, mc_version: &str, body: serde_json::Value) {
    Mock::given(method("GET"))
        .and(path(format!("/versions/loader/{mc_version}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(body))
        .mount(server)
        .await;
}

#[tokio::test]
async fn a_pinned_version_skips_the_lookup_entirely() {
    // No mock mounted: if this made a request, wiremock would reject it.
    let server = MockServer::start().await;

    let v = fabric::resolve_loader_version(
        &http::client().unwrap(),
        &server.uri(),
        "26.1.2",
        Some("0.19.3"),
    )
    .await
    .unwrap();

    assert_eq!(v, "0.19.3");
}

#[tokio::test]
async fn the_newest_stable_loader_is_chosen() {
    let server = MockServer::start().await;
    mock_loaders(
        &server,
        "26.1.2",
        json!([loader("0.20.0", false), loader("0.19.3", true)]),
    )
    .await;

    let v = fabric::resolve_loader_version(&http::client().unwrap(), &server.uri(), "26.1.2", None)
        .await
        .unwrap();

    assert_eq!(v, "0.19.3", "an unstable loader was chosen");
}

#[tokio::test]
async fn no_stable_loader_means_the_version_is_unsupported() {
    let server = MockServer::start().await;
    mock_loaders(&server, "26.9.9", json!([loader("0.20.0", false)])).await;

    let err =
        fabric::resolve_loader_version(&http::client().unwrap(), &server.uri(), "26.9.9", None)
            .await
            .unwrap_err();

    assert!(
        matches!(err, Error::UnsupportedGameVersion { .. }),
        "got {err:?}"
    );
    assert_eq!(
        err.player_message(),
        "Minecraft 26.9.9 isn't supported yet."
    );
}

#[tokio::test]
async fn an_unknown_game_version_is_unsupported_rather_than_a_crash() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;

    let err =
        fabric::resolve_loader_version(&http::client().unwrap(), &server.uri(), "99.9.9", None)
            .await
            .unwrap_err();

    assert!(
        matches!(err, Error::UnsupportedGameVersion { .. }),
        "got {err:?}"
    );
}

#[tokio::test]
async fn a_response_we_cannot_read_does_not_leak_the_parse_error() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string("nonsense"))
        .mount(&server)
        .await;

    let err =
        fabric::resolve_loader_version(&http::client().unwrap(), &server.uri(), "26.1.2", None)
            .await
            .unwrap_err();

    assert!(matches!(err, Error::BadResponse { .. }), "got {err:?}");

    let msg = err.player_message().to_lowercase();
    assert!(!msg.contains("json"), "{msg}");
    assert!(msg.contains("let us know"), "{msg}");
}
