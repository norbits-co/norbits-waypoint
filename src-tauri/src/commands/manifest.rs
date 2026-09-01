use crate::error::Result;
use crate::services;
use crate::types::Manifest;

#[tauri::command]
pub async fn load_manifest() -> Result<Manifest> {
    services::manifest::fetch().await
}
