use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use proxy_guard::ProxyState;

#[cfg(not(target_os = "android"))]
mod mcp_stdio;
#[cfg(not(target_os = "android"))]
mod git_cmd;
#[cfg(not(target_os = "android"))]
mod bridge_guard;
mod builtin_tools;
mod proxy_guard;

#[tauri::command]
fn check_pending_import(app: tauri::AppHandle) -> Option<String> {
  let mut candidates: Vec<PathBuf> = Vec::new();

  // Tauri path APIs
  if let Ok(p) = app.path().data_dir() {
    candidates.push(p.join("pending_import.json"));
  }
  if let Ok(p) = app.path().app_data_dir() {
    candidates.push(p.join("pending_import.json"));
    // Parent might be the files dir
    if let Some(parent) = p.parent() {
      candidates.push(parent.join("pending_import.json"));
    }
  }

  // Known Android paths
  candidates.push(PathBuf::from("/data/data/com.lilongtao.talkio/files/pending_import.json"));
  candidates.push(PathBuf::from("/data/user/0/com.lilongtao.talkio/files/pending_import.json"));

  for path in candidates.iter() {
    if path.exists() {
      if let Ok(content) = fs::read_to_string(path) {
        let _ = fs::remove_file(path);
        if !content.is_empty() {
          return Some(content);
        }
      }
    }
  }
  None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init());

  // Desktop: register MCP stdio commands + managed state
  #[cfg(not(target_os = "android"))]
  let builder = builder
    .manage(mcp_stdio::Sessions::default())
    .manage(ProxyState::new())
    .invoke_handler(tauri::generate_handler![
      check_pending_import,
      mcp_stdio::mcp_stdio_start,
      mcp_stdio::mcp_stdio_send,
      mcp_stdio::mcp_stdio_stop,
      mcp_stdio::mcp_stdio_list,
      git_cmd::git_execute,
      builtin_tools::shell_exec,
      builtin_tools::read_text_file,
      builtin_tools::write_text_file,
      builtin_tools::list_directory,
      proxy_guard::start_proxy,
      proxy_guard::stop_proxy,
      proxy_guard::proxy_status,
    ]);

  // Mobile: only register base commands
  #[cfg(target_os = "android")]
  let builder = builder
    .invoke_handler(tauri::generate_handler![check_pending_import]);

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // 启动 bridge 守护（桌面版）
      #[cfg(not(target_os = "android"))]
      bridge_guard::start_bridge_guard(&app.handle());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
