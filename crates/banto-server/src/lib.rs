//! Banto server: embedded HTTP server for LAN browser access (spec §11).
//!
//! Planned for M6:
//! - axum server started on `tauri::async_runtime`, opt-in via settings
//! - REST endpoints mapped 1:1 onto the shared service layer
//! - token auth + CSRF, SSE endpoint for `EventProvider`
//! - static serving of the embedded SvelteKit build (`rust-embed`)
//!
//! Kept dependency-free until M6 so the workspace stays fast to build.
