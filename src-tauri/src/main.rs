#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri_plugin_dialog::DialogExt;

const MAX_PROJECT_BYTES: u64 = 25 * 1024 * 1024;

#[cfg(windows)]
fn replace_file(destination: &Path, replacement: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::ReplaceFileW;
    let wide = |path: &Path| {
        path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>()
    };
    let destination = wide(destination);
    let replacement = wide(replacement);
    let result = unsafe {
        ReplaceFileW(
            destination.as_ptr(),
            replacement.as_ptr(),
            std::ptr::null(),
            0,
            std::ptr::null(),
            std::ptr::null(),
        )
    };
    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_file(destination: &Path, replacement: &Path) -> io::Result<()> {
    fs::rename(replacement, destination)
}

fn write_project_file(path: &Path, contents: &str) -> io::Result<()> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "Neplatná cílová cesta projektu.",
        )
    })?;
    let name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Neplatný název projektu."))?
        .to_string_lossy();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(io::Error::other)?
        .as_nanos();
    let temporary = parent.join(format!(".{name}.{}.{}.tmp", std::process::id(), nonce));
    let outcome = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(contents.as_bytes())?;
        file.sync_all()?;
        drop(file);
        if path.exists() {
            replace_file(path, &temporary)
        } else {
            fs::rename(&temporary, path)
        }
    })();
    if outcome.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    outcome
}

#[tauri::command]
async fn open_project_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file) = app
        .dialog()
        .file()
        .add_filter("PhysicsLab projekt", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path: PathBuf = file.into_path().map_err(|error| error.to_string())?;
    let metadata = fs::metadata(&path).map_err(|error| format!("Soubor nelze otevřít: {error}"))?;
    if metadata.len() > MAX_PROJECT_BYTES {
        return Err("Soubor projektu je příliš velký.".into());
    }
    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("Soubor nelze načíst: {error}"))
}

#[tauri::command]
async fn save_project_file(
    app: tauri::AppHandle,
    contents: String,
    default_name: String,
) -> Result<bool, String> {
    if contents.len() as u64 > MAX_PROJECT_BYTES {
        return Err("Projekt je příliš velký.".into());
    }
    let safe_name: String = default_name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let file_name = if safe_name.is_empty() {
        "projekt.json".to_string()
    } else {
        format!("{safe_name}.json")
    };
    let Some(file) = app
        .dialog()
        .file()
        .add_filter("PhysicsLab projekt", &["json"])
        .set_file_name(&file_name)
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path: PathBuf = file.into_path().map_err(|error| error.to_string())?;
    write_project_file(&path, &contents)
        .map(|()| true)
        .map_err(|error| format!("Projekt nelze uložit: {error}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_project_file,
            save_project_file
        ])
        .run(tauri::generate_context!())
        .expect("PhysicsLab se nepodařilo spustit");
}
