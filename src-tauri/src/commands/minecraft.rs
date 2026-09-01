use crate::services;
use crate::types::MinecraftDir;

#[tauri::command]
pub fn find_minecraft_dir() -> Option<MinecraftDir> {
    services::minecraft::find()
}
