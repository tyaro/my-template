//! Banto storage: sqlx-based repository implementations (spec §12).
//!
//! - [`list_query`]: whitelist-based `ListParams` -> SQL (`WHERE`/
//!   `ORDER BY`/`LIMIT..OFFSET..`), shared by every resource's service layer
//!   so query construction is never duplicated (spec §10).
//! - [`error`]: `sqlx::Error` -> `banto_core::BantoError` mapping.
//! - [`sqlite`] (feature `sqlite`, default): SQLite connection helpers
//!   (WAL + foreign keys, spec §11.3).
//!
//! PostgreSQL/TimescaleDB support (feature `postgres`) currently covers
//! `list_query`'s `Postgres` instantiation; connection helpers land
//! alongside the first PostgreSQL-backed resource.
//!
//! No `sqlx::query!`/`query_as!` compile-time macros are used anywhere in
//! this crate - only runtime queries, so building never requires a
//! `DATABASE_URL` (CI-friendly, spec's "no compile-time DB access" design).

pub mod error;
pub mod list_query;

#[cfg(feature = "sqlite")]
pub mod sqlite;

pub use error::{not_found, storage_error};
pub use list_query::ColumnMap;

#[cfg(feature = "sqlite")]
pub use sqlite::{connect as connect_sqlite, connect_memory as connect_sqlite_memory};
