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

    #[error("could not open {what}")]
    OpenFailed {
        what: String,
        #[source]
        source: tauri_plugin_opener::Error,
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
