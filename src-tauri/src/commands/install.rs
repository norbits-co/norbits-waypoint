use crate::error::Result;
use crate::services;
use crate::types::{InstallPlan, Manifest};

#[tauri::command]
pub async fn plan_install(manifest: Manifest, mc_dir: String) -> Result<InstallPlan> {
    services::install::plan(&manifest, &mc_dir).await
}
