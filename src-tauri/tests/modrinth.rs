//! `resolve_mods` against a mock Modrinth.
//!
//! Every failure branch in here produces a different sentence on the player's screen, and none of them had ever executed before these tests existed.

use norbits_waypoint_lib::error::Error;
use norbits_waypoint_lib::services::{http, modrinth};
use norbits_waypoint_lib::types::{Manifest, ModEntry, Server};
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn manifest(slugs: &[&str]) -> Manifest {
    Manifest {
        mc_version: "26.1.2".into(),
        loader: "fabric".into(),
        loader_version: None,
        server: Server {
            name: "NorBits MC".into(),
            address: "mc.norbits.co".into(),
        },
        mods: slugs
            .iter()
            .map(|slug| ModEntry {
                slug: (*slug).into(),
                required: true,
                name: "Voice Chat".into(),
                blurb: String::new(),
            })
            .collect(),
    }
}

/// One Modrinth version, with whatever files and dependencies a test needs.
fn version(project_id: &str, filename: &str, deps: serde_json::Value) -> serde_json::Value {
    json!({
        "project_id": project_id,
        "version_number": "1.0.0",
        "date_published": "2026-01-01T00:00:00Z",
        "files": [{
            "url": "https://cdn.example.invalid/a.jar",
            "filename": filename,
            "size": 1234,
            "hashes": { "sha512": "abc" },
            "primary": true
        }],
        "dependencies": deps
    })
}

async fn mock_version(server: &MockServer, slug: &str, body: serde_json::Value) {
    Mock::given(method("GET"))
        .and(path(format!("/project/{slug}/version")))
        .respond_with(ResponseTemplate::new(200).set_body_json(body))
        .mount(server)
        .await;
}

#[tokio::test]
async fn resolves_a_single_mod() {
    let server = MockServer::start().await;
    mock_version(
        &server,
        "simple-voice-chat",
        json!([version("9eGKb6K1", "voicechat.jar", json!([]))]),
    )
    .await;

    let plan = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap();

    assert_eq!(plan.len(), 1);
    assert_eq!(plan[0].filename, "voicechat.jar");
    assert!(plan[0].requested);
}

#[tokio::test]
async fn follows_a_required_dependency() {
    let server = MockServer::start().await;
    mock_version(
        &server,
        "modmenu",
        json!([version(
            "mOgUt4GM",
            "modmenu.jar",
            json!([{ "project_id": "P7dR8mSH", "dependency_type": "required" }])
        )]),
    )
    .await;
    mock_version(
        &server,
        "P7dR8mSH",
        json!([version("P7dR8mSH", "fabric-api.jar", json!([]))]),
    )
    .await;

    let plan = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["modmenu"]),
    )
    .await
    .unwrap();

    assert_eq!(plan.len(), 2);
    assert!(plan
        .iter()
        .any(|m| m.filename == "fabric-api.jar" && !m.requested));
}

#[tokio::test]
async fn a_dependency_shared_by_two_mods_is_only_downloaded_once() {
    // The duplicate-jar bug: two mods both needing Fabric API must not put two  copies of it in the player's mods folder.
    let server = MockServer::start().await;
    let needs_fabric_api = json!([{ "project_id": "P7dR8mSH", "dependency_type": "required" }]);

    mock_version(
        &server,
        "modmenu",
        json!([version("mOgUt4GM", "modmenu.jar", needs_fabric_api.clone())]),
    )
    .await;
    mock_version(
        &server,
        "appleskin",
        json!([version("EsAfCjCV", "appleskin.jar", needs_fabric_api)]),
    )
    .await;
    mock_version(
        &server,
        "P7dR8mSH",
        json!([version("P7dR8mSH", "fabric-api.jar", json!([]))]),
    )
    .await;

    let plan = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["modmenu", "appleskin"]),
    )
    .await
    .unwrap();

    let fabric_api = plan
        .iter()
        .filter(|m| m.filename == "fabric-api.jar")
        .count();
    assert_eq!(fabric_api, 1, "Fabric API appeared {fabric_api} times");
}

#[tokio::test]
async fn optional_dependencies_are_not_installed() {
    let server = MockServer::start().await;
    mock_version(
        &server,
        "simple-voice-chat",
        json!([version(
            "9eGKb6K1",
            "voicechat.jar",
            json!([{ "project_id": "SRlzjEBS", "dependency_type": "optional" }])
        )]),
    )
    .await;

    let plan = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap();

    assert_eq!(plan.len(), 1);
}

#[tokio::test]
async fn a_missing_project_is_reported_as_not_found() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;

    let err = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["gone"]),
    )
    .await
    .unwrap_err();

    assert!(matches!(err, Error::ModNotFound { .. }), "got {err:?}");
    assert_eq!(
        err.player_message(),
        "Couldn't find Voice Chat. It may have been removed."
    );
}

#[tokio::test]
async fn no_versions_for_this_game_version_is_reported_as_no_build() {
    let server = MockServer::start().await;
    mock_version(&server, "simple-voice-chat", json!([])).await;

    let err = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap_err();

    assert!(matches!(err, Error::ModNoBuild { .. }), "got {err:?}");
    assert_eq!(
        err.player_message(),
        "Voice Chat isn't ready for Minecraft 26.1.2 yet."
    );
}

#[tokio::test]
async fn a_version_with_no_files_is_reported_as_nothing_to_download() {
    let server = MockServer::start().await;
    mock_version(
        &server,
        "simple-voice-chat",
        json!([{
            "project_id": "9eGKb6K1",
            "version_number": "1.0.0",
            "date_published": "2026-01-01T00:00:00Z",
            "files": [],
            "dependencies": []
        }]),
    )
    .await;

    let err = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap_err();

    assert!(matches!(err, Error::ModNoFile { .. }), "got {err:?}");
}

#[tokio::test]
async fn a_response_we_cannot_read_does_not_leak_the_parse_error() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string("{ not json"))
        .mount(&server)
        .await;

    let err = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap_err();

    assert!(matches!(err, Error::BadResponse { .. }), "got {err:?}");

    let msg = err.player_message().to_lowercase();
    assert!(!msg.contains("json") && !msg.contains("expected"), "{msg}");
    assert!(msg.contains("let us know"), "{msg}");
}

#[tokio::test]
async fn the_newest_version_wins_regardless_of_response_order() {
    // The API happens to return newest-first, but doesn't promise to.
    let server = MockServer::start().await;
    mock_version(
        &server,
        "simple-voice-chat",
        json!([
            {
                "project_id": "9eGKb6K1", "version_number": "1.0.0",
                "date_published": "2026-01-01T00:00:00Z",
                "files": [{ "url": "u", "filename": "old.jar", "size": 1,
                            "hashes": { "sha512": "a" }, "primary": true }],
                "dependencies": []
            },
            {
                "project_id": "9eGKb6K1", "version_number": "2.0.0",
                "date_published": "2026-06-01T00:00:00Z",
                "files": [{ "url": "u", "filename": "new.jar", "size": 1,
                            "hashes": { "sha512": "a" }, "primary": true }],
                "dependencies": []
            }
        ]),
    )
    .await;

    let plan = modrinth::resolve_mods(
        &http::client().unwrap(),
        &server.uri(),
        &manifest(&["simple-voice-chat"]),
    )
    .await
    .unwrap();

    assert_eq!(plan[0].filename, "new.jar");
}
