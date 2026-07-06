//! Banto admin template — Tauri entry point.
//!
//! Thin `tauri::command` adapters only (spec §10): all real logic lives in
//! `admin-template-core` (`apps/admin-template/core`), which has no `tauri`
//! dependency and is exercised by `cargo test -p admin-template-core` in
//! environments (e.g. CI containers without webkit2gtk) that cannot build
//! this crate. The same services will back the embedded REST server in M6
//! (spec §11) - commands here must stay thin pass-throughs so the logic is
//! never duplicated.

use admin_template_core::db::init_db;
use admin_template_core::items::{Item, ItemInput, ItemsService};
use banto_core::{BantoError, ListParams, ListResult};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, State};

/// App-wide state managed by Tauri: the items service (holding the sqlx
/// pool) and a placeholder auth flag.
///
/// TODO(M6+): replace the `Mutex<bool>` auth flag with a real credential
/// store (spec §8.2 suggests `keyring` for resolving actual credentials;
/// v1's admin/admin check here is a demo only).
struct AppState {
    items: ItemsService,
    auth: Mutex<bool>,
}

#[derive(Debug, Clone, Serialize)]
struct LoginResult {
    success: bool,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct Identity {
    id: String,
    name: String,
}

/// Smoke-test command used by the frontend to verify the bridge.
#[tauri::command]
fn ping() -> &'static str {
    concat!("banto ", env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
async fn items_list(
    state: State<'_, AppState>,
    params: ListParams,
) -> Result<ListResult<Item>, BantoError> {
    state.items.list(params).await
}

#[tauri::command]
async fn items_get(state: State<'_, AppState>, id: i64) -> Result<Item, BantoError> {
    state.items.get(id).await
}

#[tauri::command]
async fn items_create(state: State<'_, AppState>, values: ItemInput) -> Result<Item, BantoError> {
    state.items.create(values).await
}

#[tauri::command]
async fn items_update(
    state: State<'_, AppState>,
    id: i64,
    values: ItemInput,
) -> Result<Item, BantoError> {
    state.items.update(id, values).await
}

#[tauri::command]
async fn items_delete(state: State<'_, AppState>, id: i64) -> Result<(), BantoError> {
    state.items.delete(id).await
}

/// Demo credential check (admin/admin). See the `TODO` on [`AppState`].
#[tauri::command]
fn auth_login(state: State<'_, AppState>, username: String, password: String) -> LoginResult {
    if username == "admin" && password == "admin" {
        *state.auth.lock().expect("auth mutex poisoned") = true;
        LoginResult {
            success: true,
            error: None,
        }
    } else {
        LoginResult {
            success: false,
            error: Some("ユーザー名またはパスワードが違います".to_string()),
        }
    }
}

#[tauri::command]
fn auth_logout(state: State<'_, AppState>) {
    *state.auth.lock().expect("auth mutex poisoned") = false;
}

#[tauri::command]
fn auth_check(state: State<'_, AppState>) -> bool {
    *state.auth.lock().expect("auth mutex poisoned")
}

#[tauri::command]
fn auth_identity(state: State<'_, AppState>) -> Option<Identity> {
    if *state.auth.lock().expect("auth mutex poisoned") {
        Some(Identity {
            id: "admin".to_string(),
            name: "管理者".to_string(),
        })
    } else {
        None
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("resolve app data dir");
            std::fs::create_dir_all(&data_dir).expect("create app data dir");
            let db_path = data_dir.join("admin-template.sqlite3");

            // init_db takes a filesystem path (not a sqlite:// URL) so
            // Windows paths with drive letters/backslashes work unchanged.
            let pool =
                tauri::async_runtime::block_on(init_db(&db_path)).expect("init_db should succeed");

            app.manage(AppState {
                items: ItemsService::new(pool),
                auth: Mutex::new(false),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            items_list,
            items_get,
            items_create,
            items_update,
            items_delete,
            auth_login,
            auth_logout,
            auth_check,
            auth_identity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
