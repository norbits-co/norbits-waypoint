//! `manifest::fetch` against a mock host.

use norbits_waypoint_lib::error::Error;
use norbits_waypoint_lib::services::manifest;
use serde_json::json;
use wiremock::matchers::method;
use wiremock::{Mock, MockServer, ResponseTemplate};

fn a_manifest() -> serde_json::Value {
    json!({
        "mcVersion": "26.1.2",
        "loader": "fabric",
        "loaderVersion": null,
        "server": { "name": "NorBits MC", "address": "mc.norbits.co" },
        "mods": [{
            "slug": "simple-voice-chat",
            "required": true,
            "name": "Voice Chat",
            "blurb": "Talk to players near you in-game"
        }]
    })
}

async fn serve(body: ResponseTemplate) -> MockServer {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(body)
        .mount(&server)
        .await;
    server
}

#[tokio::test]
async fn a_manifest_is_read_with_camel_case_keys() {
    // serde does not convert case on its own. If rename_all is ever dropped from Manifest, this is what catches it.
    let server = serve(ResponseTemplate::new(200).set_body_json(a_manifest())).await;

    let m = manifest::fetch(&server.uri()).await.unwrap();

    assert_eq!(m.mc_version, "26.1.2");
    assert_eq!(m.loader_version, None);
    assert_eq!(m.server.address, "mc.norbits.co");
    assert_eq!(m.mods[0].name, "Voice Chat");
}

#[tokio::test]
async fn a_missing_manifest_asks_the_player_to_tell_us() {
    // This is the 404 we hit for weeks while manifest.json was only on dev.
    let server = serve(ResponseTemplate::new(404)).await;

    let err = manifest::fetch(&server.uri()).await.unwrap_err();

    assert!(
        matches!(err, Error::ManifestUnavailable { .. }),
        "got {err:?}"
    );
    assert!(err.player_message().contains("let us know"));
}

#[tokio::test]
async fn a_corrupt_manifest_does_not_leak_the_parse_error() {
    let server = serve(ResponseTemplate::new(200).set_body_string("{ not json")).await;

    let err = manifest::fetch(&server.uri()).await.unwrap_err();

    assert!(matches!(err, Error::BadResponse { .. }), "got {err:?}");

    let msg = err.player_message().to_lowercase();
    assert!(!msg.contains("json") && !msg.contains("expected"), "{msg}");
}

#[tokio::test]
async fn a_manifest_missing_a_field_is_a_bad_response_not_a_panic() {
    let server =
        serve(ResponseTemplate::new(200).set_body_json(json!({ "mcVersion": "26.1.2" }))).await;

    let err = manifest::fetch(&server.uri()).await.unwrap_err();

    assert!(matches!(err, Error::BadResponse { .. }), "got {err:?}");
}
