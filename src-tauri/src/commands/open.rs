use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::error::{Error, Result};

/// Hand a URL to the system browser.
///
/// A plain `<a href>` in the webview would navigate the app window itself.
#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> Result<()> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|source| Error::OpenFailed {
            what: url.clone(),
            source,
        })
}

/// Open the folder holding our log file.
#[tauri::command]
pub fn open_log_folder(app: AppHandle) -> Result<()> {
    let dir = app.path().app_log_dir().map_err(Error::LogDirUnavailable)?;

    // Nothing may have been logged yet, creating a log folder.
    std::fs::create_dir_all(&dir).map_err(Error::LogDirCreate)?;

    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|source| Error::OpenFailed {
            what: "the log folder".into(),
            source,
        })
}
