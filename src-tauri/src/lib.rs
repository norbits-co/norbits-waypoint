mod commands;
mod error;
mod services;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Registered in release too, not just debug. When a player is told "let us know if it keeps happening", there has to be a file they
            // can actually send us.
            app.handle().plugin(
                tauri_plugin_log::Builder::new()
                    .level(log::LevelFilter::Info)
                    .max_file_size(1_000_000)
                    // KeepOne deletes the file outright when it fills, losing the evidence just when it's needed.
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(2))
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                            file_name: Some("waypoint".into()),
                        }),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    ])
                    .build(),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::minecraft::find_minecraft_dir,
            commands::manifest::load_manifest,
            commands::install::plan_install,
            commands::open::open_url,
            commands::open::open_log_folder,
            commands::log::log_error
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
