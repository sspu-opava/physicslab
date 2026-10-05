#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{fs, path::PathBuf};
use tauri_plugin_dialog::DialogExt;

const MAX_PROJECT_BYTES: u64 = 25 * 1024 * 1024;

#[tauri::command]
async fn open_project_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file) = app.dialog().file().add_filter("PhysicsLab projekt", &["json"]).blocking_pick_file() else { return Ok(None); };
    let path: PathBuf = file.into_path().map_err(|error| error.to_string())?;
    let metadata = fs::metadata(&path).map_err(|error| format!("Soubor nelze otevřít: {error}"))?;
    if metadata.len() > MAX_PROJECT_BYTES { return Err("Soubor projektu je příliš velký.".into()); }
    fs::read_to_string(path).map(Some).map_err(|error| format!("Soubor nelze načíst: {error}"))
}

#[tauri::command]
async fn save_project_file(app: tauri::AppHandle, contents: String, default_name: String) -> Result<bool, String> {
    if contents.len() as u64 > MAX_PROJECT_BYTES { return Err("Projekt je příliš velký.".into()); }
    let safe_name: String = default_name.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    let file_name = if safe_name.is_empty() { "projekt.json".to_string() } else { format!("{safe_name}.json") };
    let Some(file) = app.dialog().file().add_filter("PhysicsLab projekt", &["json"]).set_file_name(&file_name).blocking_save_file() else { return Ok(false); };
    let path: PathBuf = file.into_path().map_err(|error| error.to_string())?;
    fs::write(path, contents).map(|()| true).map_err(|error| format!("Projekt nelze uložit: {error}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![open_project_file, save_project_file])
        .run(tauri::generate_context!())
        .expect("PhysicsLab se nepodařilo spustit");
}
