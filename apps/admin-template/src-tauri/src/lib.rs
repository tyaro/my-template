//! Banto admin template — Tauri entry point.
//!
//! M0 wires up the app shell only. From M2 the service layer lives in a
//! `service` module and each resource registers thin `tauri::command`
//! adapters here (spec §10); the same services are exposed over REST by
//! `banto-server` in M6 (spec §11).

/// Smoke-test command used by the frontend to verify the bridge.
#[tauri::command]
fn ping() -> &'static str {
    concat!("banto ", env!("CARGO_PKG_VERSION"))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
