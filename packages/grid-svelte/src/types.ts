/**
 * Public types for @banto/grid-svelte.
 *
 * `SortState` / `FilterOp` / `FilterState` mirror the Rust types in
 * `crates/banto-core/src/params.rs` field-for-field so the same
 * client-side state can later drive server mode (spec §4.1, §10) without a
 * shape change. Keep these two definitions in sync by hand.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState {
	field: string;
	direction: SortDirection;
}

export type FilterOp =
	| 'eq'
	| 'ne'
	| 'lt'
	| 'lte'
	| 'gt'
	| 'gte'
	| 'contains'
	| 'starts_with'
	| 'in'
	| 'is_null'
	| 'not_null';

export interface FilterState {
	field: string;
	op: FilterOp;
	value: unknown;
}

export type FilterType = 'text' | 'number';

export interface GridColumn<TRow> {
	/** Stable identifier; used as SortState.field / FilterState.field. */
	id: string;
	header: string;
	accessor: keyof TRow | ((row: TRow) => unknown);
	/** Width in px. Default 150. */
	width?: number;
	/** Default 60. */
	minWidth?: number;
	maxWidth?: number;
	/** Default true. */
	resizable?: boolean;
	/** Default true. */
	sortable?: boolean;
	/** Default false. */
	filterable?: boolean;
	/** Default 'text'; controls which ops FilterPopover offers. */
	filterType?: FilterType;
	align?: 'left' | 'right' | 'center';
	format?: (value: unknown, row: TRow) => string;
	comparator?: (a: unknown, b: unknown) => number;
}

/** Resolved defaults applied on top of a user-supplied GridColumn. */
export const DEFAULT_COLUMN_WIDTH = 150;
export const DEFAULT_MIN_WIDTH = 60;

/** Shape persisted by GridState.serialize() (spec §4.4). */
export interface SerializedGridState {
	sort: SortState[];
	filters: FilterState[];
	order: string[];
	widths: Record<string, number>;
}
