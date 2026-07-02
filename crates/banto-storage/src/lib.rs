//! Banto storage: sqlx-based repository implementations (spec §12).
//!
//! Planned for M2:
//! - repository trait implementations for SQLite (app settings DB) and
//!   PostgreSQL/TimescaleDB (domain data)
//! - sqlx migrations for the settings DB schema
//!
//! Kept dependency-free until M2 so the workspace stays fast to build.
