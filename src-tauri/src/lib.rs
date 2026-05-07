use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use proxy_guard::ProxyState;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};

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

  if let Ok(p) = app.path().data_dir() {
    candidates.push(p.join("pending_import.json"));
  }
  if let Ok(p) = app.path().app_data_dir() {
    candidates.push(p.join("pending_import.json"));
    if let Some(parent) = p.parent() {
      candidates.push(parent.join("pending_import.json"));
    }
  }

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

      // ── 桌面端：系统托盘 + 关闭最小化 ──
      #[cfg(not(target_os = "android"))]
      {
        let handle = app.handle().clone();
        let window = app.get_webview_window("main").expect("main window not found");

        // 拦截关闭 → 隐藏到托盘
        let win_clone = window.clone();
        window.on_window_event(move |event| {
          if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = win_clone.hide();
          }
        });

        // 构建托盘菜单
        let show_item = tauri::menu::MenuItemBuilder::with_id("show", "显示窗口")
          .build(&handle)?;
        let exit_item = tauri::menu::MenuItemBuilder::with_id("exit", "退出")
          .build(&handle)?;

        let menu = tauri::menu::MenuBuilder::new(&handle)
          .item(&show_item)
          .separator()
          .item(&exit_item)
          .build()?;

        // 系统托盘
        let _tray = TrayIconBuilder::new()
          .icon(app.default_window_icon().cloned().unwrap())
          .tooltip("映创AI助手")
          .show_menu_on_left_click(false)
          .menu(&menu)
          .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event {
              let app = tray.app_handle();
              if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
              }
            }
          })
          .on_menu_event(move |app_handle, event| {
            match event.id().as_ref() {
              "show" => {
                if let Some(w) = app_handle.get_webview_window("main") {
                  let _ = w.show();
                  let _ = w.set_focus();
                }
              }
              "exit" => {
                app_handle.exit(0);
              }
              _ => {}
            }
          })
          .build(app)?;
      }

      // 启动 bridge 守护（桌面版）
      #[cfg(not(target_os = "android"))]
      bridge_guard::start_bridge_guard(&app.handle());

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
