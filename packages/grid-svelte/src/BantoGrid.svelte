<script lang="ts" generics="TRow">
	/**
	 * Client-mode data grid (spec §4): filter -> sort -> virtualize -> render.
	 * Single scroll container for header + body; the header row is
	 * `position: sticky` so horizontal scroll stays in sync automatically
	 * and vertical scroll drives the virtualization window.
	 */
	import { DEFAULT_COLUMN_WIDTH, type GridColumn } from './types';
	import { GridState } from './state.svelte';
	import { getColumnValue, sortRows } from './core/sort';
	import { filterRows } from './core/filter';
	import { computeWindow } from './core/virtual';
	import HeaderCell from './HeaderCell.svelte';

	interface Props {
		rows: TRow[];
		columns: GridColumn<TRow>[];
		state?: GridState<TRow>;
		getRowId: (row: TRow) => string | number;
		rowHeight?: number;
		onRowClick?: (row: TRow) => void;
	}

	// Aliased to avoid clashing with the `$state` rune (a local binding named
	// exactly `state` makes the compiler treat `$state(...)` calls below as
	// store-subscription syntax instead of rune usage).
	let { rows, columns, state: externalState, getRowId, rowHeight, onRowClick }: Props = $props();

	// Created once per component instance. If the caller passes `state`, that
	// instance is the single source of truth (including its own rowHeight);
	// otherwise we own one internally, seeded from the `rowHeight` prop.
	// Capturing only the initial prop values here is by design.
	// svelte-ignore state_referenced_locally
	const gridState: GridState<TRow> = externalState ?? new GridState(columns, { rowHeight });

	const OVERSCAN = 8;

	let containerEl: HTMLDivElement | undefined = $state();
	let headerRowEl: HTMLDivElement | undefined = $state();

	let scrollTop = $state(0);
	let viewportHeight = $state(0);
	let headerHeight = $state(40);

	$effect(() => {
		if (!containerEl) return;
		viewportHeight = containerEl.clientHeight;
		const observer = new ResizeObserver(() => {
			viewportHeight = containerEl!.clientHeight;
		});
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!headerRowEl) return;
		headerHeight = headerRowEl.offsetHeight;
		const observer = new ResizeObserver(() => {
			headerHeight = headerRowEl!.offsetHeight;
		});
		observer.observe(headerRowEl);
		return () => observer.disconnect();
	});

	function handleScroll(event: Event) {
		scrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
	}

	const filtered = $derived(filterRows(rows, gridState.filters, columns));
	const sorted = $derived(sortRows(filtered, gridState.sort, columns));

	const rowsViewportHeight = $derived(Math.max(0, viewportHeight - headerHeight));
	const effectiveScrollTop = $derived(Math.max(0, scrollTop - headerHeight));

	const windowResult = $derived(
		computeWindow({
			scrollTop: effectiveScrollTop,
			viewportHeight: rowsViewportHeight,
			rowHeight: gridState.rowHeight,
			rowCount: sorted.length,
			overscan: OVERSCAN
		})
	);

	const visibleRows = $derived(sorted.slice(windowResult.start, windowResult.end));

	const showSortPriority = $derived(gridState.sort.length > 1);

	function widthOf(column: GridColumn<TRow>): number {
		return gridState.widths[column.id] ?? column.width ?? DEFAULT_COLUMN_WIDTH;
	}

	const templateColumns = $derived(
		gridState.orderedColumns.map((column) => `${widthOf(column)}px`).join(' ')
	);
	const totalColumnsWidth = $derived(
		gridState.orderedColumns.reduce((sum, column) => sum + widthOf(column), 0)
	);

	function renderCell(column: GridColumn<TRow>, row: TRow): string {
		const raw = getColumnValue(row, column);
		if (column.format) return column.format(raw, row);
		if (raw === null || raw === undefined) return '';
		return String(raw);
	}

	// .cell is a flex container with a single text node, so horizontal
	// alignment must go through justify-content (text-align has no effect
	// on flex layout).
	function justifyFor(align: GridColumn<TRow>['align']): string {
		if (align === 'right') return 'flex-end';
		if (align === 'center') return 'center';
		return 'flex-start';
	}

	// --- Column drag-reorder (pointer events, driven from HeaderCell) ---
	let dragColumnId: string | null = $state(null);
	let dropIndex: number | null = $state(null);

	function handleDragStart(columnId: string) {
		dragColumnId = columnId;
		dropIndex = gridState.order.indexOf(columnId);
	}

	function handleDragMove(clientX: number) {
		if (!headerRowEl) return;
		const rect = headerRowEl.getBoundingClientRect();
		const x = clientX - rect.left;
		let cumulative = 0;
		const cols = gridState.orderedColumns;
		let index = cols.length;
		for (let i = 0; i < cols.length; i++) {
			const w = widthOf(cols[i]);
			if (x < cumulative + w / 2) {
				index = i;
				break;
			}
			cumulative += w;
		}
		dropIndex = index;
	}

	function handleDragEnd() {
		if (dragColumnId !== null && dropIndex !== null) {
			gridState.moveColumn(dragColumnId, dropIndex);
		}
		dragColumnId = null;
		dropIndex = null;
	}

	const dropIndicatorX = $derived.by(() => {
		if (dropIndex === null) return null;
		let x = 0;
		const cols = gridState.orderedColumns;
		for (let i = 0; i < dropIndex && i < cols.length; i++) {
			x += widthOf(cols[i]);
		}
		return x;
	});
</script>

<div
	class="banto-grid"
	bind:this={containerEl}
	role="grid"
	aria-rowcount={sorted.length + 1}
	aria-colcount={gridState.orderedColumns.length}
	onscroll={handleScroll}
>
	<div class="scroll-content" role="presentation" style:width={`${totalColumnsWidth}px`}>
		<div
			class="header-row"
			role="row"
			aria-rowindex={1}
			bind:this={headerRowEl}
			style:grid-template-columns={templateColumns}
		>
			{#each gridState.orderedColumns as column (column.id)}
				<HeaderCell
					{column}
					state={gridState}
					width={widthOf(column)}
					showPriority={showSortPriority}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
				/>
			{/each}
		</div>

		{#if dropIndicatorX !== null}
			<div
				class="drop-indicator"
				style:left={`${dropIndicatorX}px`}
				style:height={`${headerHeight + windowResult.totalHeight}px`}
			></div>
		{/if}

		{#if sorted.length === 0}
			<div class="empty-row">データがありません</div>
		{:else}
			<div class="rows-viewport" role="presentation" style:height={`${windowResult.totalHeight}px`}>
				<div
					class="rows-block"
					role="rowgroup"
					style:transform={`translateY(${windowResult.offsetY}px)`}
				>
					{#each visibleRows as row, i (getRowId(row))}
						<div
							class="row"
							role="row"
							aria-rowindex={windowResult.start + i + 2}
							style:grid-template-columns={templateColumns}
							style:height={`${gridState.rowHeight}px`}
							tabindex={onRowClick ? 0 : undefined}
							onclick={() => onRowClick?.(row)}
							onkeydown={(event) => {
								if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
									event.preventDefault();
									onRowClick(row);
								}
							}}
						>
							{#each gridState.orderedColumns as column (column.id)}
								<div class="cell" role="gridcell" style:justify-content={justifyFor(column.align)}>
									{renderCell(column, row)}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.banto-grid {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: auto;
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		font-size: 0.875rem;
	}

	.scroll-content {
		min-width: 100%;
		position: relative;
	}

	.header-row {
		position: sticky;
		top: 0;
		z-index: 10;
		display: grid;
		height: var(--banto-grid-header-height);
		background: var(--banto-surface);
		border-bottom: 1px solid var(--banto-border);
	}

	.drop-indicator {
		position: absolute;
		top: 0;
		width: 2px;
		background: var(--banto-primary);
		pointer-events: none;
	}

	.rows-viewport {
		position: relative;
	}

	.rows-block {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.row {
		display: grid;
		border-bottom: 1px solid var(--banto-border);
		box-sizing: border-box;
	}

	.row:hover {
		background: color-mix(in srgb, var(--banto-primary) 6%, transparent);
	}

	.row[tabindex='0'] {
		cursor: pointer;
	}

	.row:focus-visible {
		outline: 2px solid var(--banto-primary);
		outline-offset: -2px;
	}

	.cell {
		padding: 0 0.6rem;
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--banto-text);
	}

	.empty-row {
		padding: 1.5rem;
		text-align: center;
		color: var(--banto-text-muted);
	}
</style>
