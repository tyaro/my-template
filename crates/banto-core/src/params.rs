use serde::{Deserialize, Serialize};

/// Sort direction for a single column.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortDirection {
    Asc,
    Desc,
}

/// One entry of a multi-column sort. Order in the containing `Vec` is the
/// sort priority.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SortState {
    /// Column/field identifier as declared in the frontend column definition.
    pub field: String,
    pub direction: SortDirection,
}

/// Filter operators shared by the grid column filters and REST queries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FilterOp {
    Eq,
    Ne,
    Lt,
    Lte,
    Gt,
    Gte,
    Contains,
    StartsWith,
    In,
    IsNull,
    NotNull,
}

/// A single column filter condition. Conditions in a list are combined
/// with AND; OR groups can be added later without breaking this shape.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FilterState {
    pub field: String,
    pub op: FilterOp,
    /// JSON value so string/number/date/list operands share one type.
    #[serde(default)]
    pub value: serde_json::Value,
}

/// Offset-based pagination. Cursor-based paging can be introduced as an
/// enum variant later (spec §10 keeps the wire shape forward-compatible).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pagination {
    pub offset: u64,
    pub limit: u64,
}

impl Default for Pagination {
    fn default() -> Self {
        Self { offset: 0, limit: 50 }
    }
}

/// Parameters for `DataProvider.getList` (spec §3.2).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub pagination: Option<Pagination>,
    #[serde(default)]
    pub sort: Vec<SortState>,
    #[serde(default)]
    pub filters: Vec<FilterState>,
}

/// Result envelope for `DataProvider.getList`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListResult<T> {
    pub rows: Vec<T>,
    pub total_count: u64,
}
