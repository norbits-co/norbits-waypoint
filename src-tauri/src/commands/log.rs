/// Record a frontend failure in the same log file the backend writes to.
#[tauri::command]
pub fn log_error(message: String) {
    log::error!("frontend: {message}");
}
