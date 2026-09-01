//! Finding the player's Minecraft installation.

use std::path::PathBuf;

use crate::types::MinecraftDir;

// One definition per platform; exactly one survives compilation.
//   Windows  %APPDATA%\.minecraft
//   macOS    ~/Library/Application Support/minecraft
//   Linux    ~/.minecraft

#[cfg(target_os = "windows")]
fn default_dir() -> Option<PathBuf> {
    // config_dir() is Roaming AppData on Windows, which is what we want.
    dirs::config_dir().map(|p| p.join(".minecraft"))
}

#[cfg(target_os = "macos")]
fn default_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|p| p.join("minecraft"))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn default_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|p| p.join(".minecraft"))
}

/// The default `.minecraft` location, and whether anything is there.
///
/// Returns `None` only when we can't resolve a home directory at all.
pub fn find() -> Option<MinecraftDir> {
    let path = default_dir()?;

    Some(MinecraftDir {
        exists: path.is_dir(),
        path: path.to_string_lossy().into_owned(),
    })
}
