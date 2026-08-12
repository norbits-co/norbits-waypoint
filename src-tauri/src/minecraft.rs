use std::path::PathBuf;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct MinecraftDir {
    pub path: String,
    pub exists: bool,
}

#[cfg(target_os = "windows")]
fn default_dir() -> Option<PathBuf> {
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

#[tauri::command]
pub fn find_minecraft_dir() -> Option<MinecraftDir> {
    let path = default_dir()?;

    Some(MinecraftDir {
        exists: path.is_dir(),
        path: path.to_string_lossy().into_owned(),
    })
}
