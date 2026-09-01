//! Every way the backend can fail, and what to tell a player about it.
//!
//! Two representations, deliberately separate. `Display` (via `thiserror`) is the technical one, carrying the source chain, and is what reaches the log
//! file. [`Error::player_message`] is a sentence someone who has never heard of a mod loader can act on, and is the only thing that reaches the screen.
//!
//! Commands return `Result<T, Error>`. The `Serialize` impl at the bottom is the single point where an error crosses into the frontend, so that's where the
//! logging happens - once, rather than at every call site.

use serde::{Serialize, Serializer};

/// A service we depend on. Named so failures can say which one broke without stringly-typed comparisons.
#[derive(Debug, Clone, Copy)]
pub enum Service {
    /// Our own manifest, currently served from the repository.
    NorBits,
    /// api.modrinth.com - where the mods come from.
    Modrinth,
    /// meta.fabricmc.net - where the loader comes from.
    Fabric,
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("could not reach {service:?}")]
    Unreachable {
        service: Service,
        #[source]
        source: reqwest::Error,
    },

    #[error("{service:?} answered with something we couldn't read")]
    BadResponse {
        service: Service,
        #[source]
        source: reqwest::Error,
    },

    #[error("the manifest request failed")]
    ManifestUnavailable {
        #[source]
        source: reqwest::Error,
    },

    #[error("no stable loader for Minecraft {mc_version}")]
    UnsupportedGameVersion { mc_version: String },

    #[error("{name} was not found on Modrinth")]
    ModNotFound {
        name: String,
        #[source]
        source: reqwest::Error,
    },

    #[error("{name} has no build for Minecraft {mc_version}")]
    ModNoBuild { name: String, mc_version: String },

    #[error("{name} has no downloadable file")]
    ModNoFile { name: String },

    #[error("could not build the http client")]
    HttpClient(#[source] reqwest::Error),

    #[error("could not resolve the log directory")]
    LogDirUnavailable(#[source] tauri::Error),

    #[error("could not create the log directory")]
    LogDirCreate(#[source] std::io::Error),

    /// Boxed because the opener's error is large on Linux
    #[error("could not open {what}")]
    OpenFailed {
        what: String,
        #[source]
        source: Box<tauri_plugin_opener::Error>,
    },
}

impl Error {
    /// What the player sees.
    ///
    /// No jargon, no library detail, and no version numbers unless they're doing work. Messages containing "let us know" also surface the Discord and log
    /// folder buttons on the failure screen - see `asksForContact` on the frontend.
    pub fn player_message(&self) -> String {
        match self {
            Error::Unreachable {
                service: Service::NorBits,
                ..
            } => "Couldn't reach NorBits. Check your internet connection and try again.".into(),

            Error::Unreachable { .. } => {
                "Couldn't download what your game needs. Check your internet connection and try again."
                    .into()
            }

            Error::ManifestUnavailable { .. } => {
                "Couldn't reach NorBits. Please try again, and let us know if it keeps happening."
                    .into()
            }

            Error::BadResponse { .. }
            | Error::HttpClient(_)
            | Error::LogDirUnavailable(_)
            | Error::LogDirCreate(_) => {
                "Something went wrong getting your game ready. Please try again, and let us know if it keeps happening."
                    .into()
            }

            Error::UnsupportedGameVersion { mc_version } => {
                format!("Minecraft {mc_version} isn't supported yet.")
            }

            Error::ModNotFound { name, .. } => {
                format!("Couldn't find {name}. It may have been removed.")
            }

            Error::ModNoBuild { name, mc_version } => {
                format!("{name} isn't ready for Minecraft {mc_version} yet.")
            }

            Error::ModNoFile { name } => {
                format!("{name} isn't available to download right now.")
            }

            Error::OpenFailed { .. } => {
                "Couldn't open that. You may need to find it yourself.".into()
            }
        }
    }
}

/// Tauri needs a `Serialize` error to reject a command with.
///
/// This is the one place an error leaves Rust, so it's where we record the real cause and hand the frontend the sentence. `{:#}` on the error prints its
/// source chain, so a log line carries the whole story rather than just the outermost layer.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        log::error!("{self}: {:?}", std::error::Error::source(self));
        serializer.serialize_str(&self.player_message())
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    /// reqwest gives you no way to build one of its errors by hand, so we make a real one. A malformed URL fails before any network work, so this is fast
    /// and can't be flaky.
    fn reqwest_error() -> reqwest::Error {
        tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap()
            .block_on(async { reqwest::get("not a url").await.unwrap_err() })
    }

    /// One of every variant. Adding a variant without adding it here is a compile error, which is the point.
    fn every_variant() -> Vec<Error> {
        vec![
            Error::Unreachable {
                service: Service::NorBits,
                source: reqwest_error(),
            },
            Error::Unreachable {
                service: Service::Modrinth,
                source: reqwest_error(),
            },
            Error::Unreachable {
                service: Service::Fabric,
                source: reqwest_error(),
            },
            Error::BadResponse {
                service: Service::Modrinth,
                source: reqwest_error(),
            },
            Error::ManifestUnavailable {
                source: reqwest_error(),
            },
            Error::UnsupportedGameVersion {
                mc_version: "26.2".into(),
            },
            Error::ModNotFound {
                name: "Voice Chat".into(),
                source: reqwest_error(),
            },
            Error::ModNoBuild {
                name: "Voice Chat".into(),
                mc_version: "26.2".into(),
            },
            Error::ModNoFile {
                name: "Voice Chat".into(),
            },
            Error::HttpClient(reqwest_error()),
            Error::LogDirUnavailable(tauri::Error::AssetNotFound("x".into())),
            Error::LogDirCreate(std::io::Error::other("x")),
            Error::OpenFailed {
                what: "the log folder".into(),
                source: Box::new(tauri_plugin_opener::Error::UnknownProgramName("x".into())),
            },
        ]
    }

    #[test]
    fn every_variant_says_something() {
        for e in every_variant() {
            let msg = e.player_message();
            assert!(!msg.trim().is_empty(), "{e:?} has no message");
            assert!(
                msg.ends_with('.') || msg.ends_with('!'),
                "{e:?} produced a message with no closing punctuation: {msg}"
            );
        }
    }

    #[test]
    fn no_message_leaks_library_vocabulary() {
        // A player seeing "invalid type: null, expected a string at line 1 column 4823" can do nothing with it.
        const LEAKS: &[&str] = &[
            "reqwest", "serde", "json", "dns", "http", "url", "utf-8", "os error", "errno",
            "panicked", "unwrap",
        ];

        for e in every_variant() {
            let msg = e.player_message().to_lowercase();
            for leak in LEAKS {
                assert!(!msg.contains(leak), "{e:?} leaks {leak:?}: {msg}");
            }
        }
    }

    #[test]
    fn no_message_uses_jargon() {
        // The audience couldn't install a mod by hand.
        const JARGON: &[&str] = &[
            "mod loader",
            "mod service",
            "downloader",
            "jar",
            "sha512",
            "manifest",
            "fabric",
            "modrinth",
        ];

        for e in every_variant() {
            let msg = e.player_message().to_lowercase();
            for word in JARGON {
                assert!(!msg.contains(word), "{e:?} uses jargon {word:?}: {msg}");
            }
        }
    }

    #[test]
    fn our_fault_asks_the_player_to_tell_us() {
        // "let us know" is what surfaces the Discord and Open Logs buttons on the failure screen.
        let ours = [
            Error::BadResponse {
                service: Service::Modrinth,
                source: reqwest_error(),
            },
            Error::ManifestUnavailable {
                source: reqwest_error(),
            },
            Error::HttpClient(reqwest_error()),
            Error::LogDirCreate(std::io::Error::other("x")),
        ];

        for e in ours {
            assert!(
                e.player_message().contains("let us know"),
                "{e:?} should offer a way to reach us: {}",
                e.player_message()
            );
        }
    }

    #[test]
    fn their_side_does_not_ask_for_contact() {
        // Offering a support link to someone whose wifi is off is noise.
        let theirs = [
            Error::Unreachable {
                service: Service::NorBits,
                source: reqwest_error(),
            },
            Error::Unreachable {
                service: Service::Modrinth,
                source: reqwest_error(),
            },
            Error::UnsupportedGameVersion {
                mc_version: "26.2".into(),
            },
            Error::ModNoBuild {
                name: "Voice Chat".into(),
                mc_version: "26.2".into(),
            },
        ];

        for e in theirs {
            assert!(
                !e.player_message().contains("let us know"),
                "{e:?} shouldn't ask for contact: {}",
                e.player_message()
            );
        }
    }

    #[test]
    fn a_mod_is_named_by_the_name_a_player_would_recognise() {
        let e = Error::ModNoBuild {
            name: "Voice Chat".into(),
            mc_version: "26.2".into(),
        };

        assert!(e.player_message().contains("Voice Chat"));
    }
}
