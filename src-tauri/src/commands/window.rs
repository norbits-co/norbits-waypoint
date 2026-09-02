//! Every command here needs a matching `core:window:allow-*` entry in `capabilities/default.json`.

use tauri::{AppHandle, Manager};

use crate::error::{Error, Result};

/// Capabilities these commands can't work without.
#[allow(dead_code)]
pub const REQUIRED_PERMISSIONS: &[&str] = &["core:window:allow-close"];

/// Close the app - Used by "Not Now" on the confirmation step and by the done screen
#[tauri::command]
pub fn close_window(app: AppHandle) -> Result<()> {
    app.get_webview_window("main")
        .ok_or(Error::WindowMissing)?
        .close()
        .map_err(Error::WindowClose)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The capability file is the only thing standing between these commands and a runtime permission error
    #[test]
    fn the_capability_file_grants_what_these_commands_need() {
        let raw = include_str!("../../capabilities/default.json");
        let capability: serde_json::Value =
            serde_json::from_str(raw).expect("capabilities/default.json is not valid JSON");

        let granted = capability["permissions"]
            .as_array()
            .expect("capabilities/default.json has no permissions array");

        for permission in REQUIRED_PERMISSIONS {
            assert!(
                granted.iter().any(|g| g.as_str() == Some(permission)),
                "capabilities/default.json is missing {permission:?} - the command \
                 that needs it will compile, then fail at runtime"
            );
        }
    }
}
