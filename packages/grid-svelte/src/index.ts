/**
 * Public entry point for @banto/grid-svelte (spec §4).
 * M1 scope: client-mode data, row virtualization, multi-column sort,
 * per-column filters, column resize/reorder. No editing/grouping/pinning/
 * server mode yet (later milestones).
 */
export { default as BantoGrid } from './BantoGrid.svelte';
export { GridState, DEFAULT_ROW_HEIGHT, type GridStateOptions } from './state.svelte';

export { sortRows, getColumnValue } from './core/sort';
export { filterRows } from './core/filter';
export { computeWindow, type ComputeWindowParams, type WindowResult } from './core/virtual';

export type {
	SortDirection,
	SortState,
	FilterOp,
	FilterState,
	FilterType,
	GridColumn,
	SerializedGridState
} from './types';
export { DEFAULT_COLUMN_WIDTH, DEFAULT_MIN_WIDTH } from './types';
