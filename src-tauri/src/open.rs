use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Hand a URL to the system browser.
#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener().open_url(&url, None::<&str>).map_err(|e| {
        log::error!("failed to open {url}: {e}");
        "Couldn't open that link. You may need to copy it into your browser.".to_string()
    })
}

/// Open the folder holding our log files
#[tauri::command]
pub fn open_log_folder(app: AppHandle) -> Result<(), String> {
    let dir = app.path().app_log_dir().map_err(|e| {
        log::error!("could not resolve the log directory: {e}");
        "Couldn't find the log folder.".to_string()
    })?;

    // Create an empty log folder.
    std::fs::create_dir_all(&dir).map_err(|e| {
        log::error!("could not create the log directory: {e}");
        "Couldn't open the log folder.".to_string()
    })?;

    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| {
            log::error!("failed to open the log folder: {e}");
            "Couldn't open the log folder.".to_string()
        })
}
