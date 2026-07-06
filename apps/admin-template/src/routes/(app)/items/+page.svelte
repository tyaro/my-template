<script lang="ts">
	import type { CellEdit, GridColumn } from '@banto/grid-svelte';
	import { getDataProvider, getResource, invalidate, isProviderError, notify } from '@banto/admin-core';
	import { goto } from '$app/navigation';
	import type { Item } from '$lib/banto/sampleData';
	import ItemsClientGrid from './ItemsClientGrid.svelte';
	import ItemsServerGrid from './ItemsServerGrid.svelte';

	const resource = getResource('items');

	// M5 Phase A (spec §4.1, §10): the items page demonstrates both grid data
	// modes side by side via a toggle. Plain $state, not persisted - the
	// default is サーバー so a fresh visit shows the real client->
	// DataProvider->(Rust+SQLite in Tauri) path this milestone adds.
	let mode: 'client' | 'server' = $state('server');

	const columns: GridColumn<Item>[] = [
		{
			id: 'open',
			header: '',
			accessor: () => '',
			width: 70,
			resizable: false,
			sortable: false,
			cell: (row) => ({ text: '開く', href: `/items/${row.id}` })
		},
		{
			id: 'id',
			header: 'ID',
			accessor: 'id',
			width: 80,
			align: 'right',
			filterable: true,
			filterType: 'number'
		},
		{
			id: 'name',
			header: '商品名',
			accessor: 'name',
			width: 260,
			filterable: true,
			filterType: 'text',
			editable: true,
			editor: 'text',
			// Same rules/messages as itemsSchema.name (src/lib/banto/setup.ts).
			// Trim before checking emptiness/length, matching Rust's
			// `input.name.trim()` in validate_item_input (items.rs) exactly -
			// otherwise a whitespace-only name passes here and only fails
			// after a round trip to the real Tauri backend.
			validate: (value) => {
				const str = String(value ?? '').trim();
				if (str.length === 0) return '必須項目です';
				if (str.length > 40) return '40文字以内で入力してください';
				return null;
			}
		},
		{
			id: 'price',
			header: '価格',
			accessor: 'price',
			width: 120,
			align: 'right',
			filterable: true,
			filterType: 'number',
			format: (value) => `¥${(value as number).toLocaleString()}`,
			editable: true,
			editor: 'number',
			// Same rules/messages as itemsSchema.price (src/lib/banto/setup.ts).
			// Rust's ItemInput.price is `i64` (items.rs), so a fractional value
			// (e.g. "10.5") must be rejected here too, not just bounds-checked.
			validate: (value) => {
				const num = Number(value);
				if (num < 0) return '0以上で入力してください';
				if (num > 99999) return '99999以下で入力してください';
				if (!Number.isInteger(num)) return '整数で入力してください';
				return null;
			}
		},
		{
			id: 'stock',
			header: '在庫',
			accessor: 'stock',
			width: 100,
			align: 'right',
			filterable: true,
			filterType: 'number',
			editable: true,
			editor: 'number',
			// Same rule/message as itemsSchema.stock (src/lib/banto/setup.ts).
			// Rust's ItemInput.stock is `i64` (items.rs), so a fractional value
			// must be rejected here too, not just bounds-checked.
			validate: (value) => {
				const num = Number(value);
				if (num < 0) return '0以上で入力してください';
				if (!Number.isInteger(num)) return '整数で入力してください';
				return null;
			}
		},
		{
			id: 'updatedAt',
			header: '更新日',
			accessor: 'updatedAt',
			width: 140
		}
	];

	function handleRowClick(item: Item) {
		goto(`/items/${item.id}`);
	}

	/** Merge one edited field onto the row's other current values (DataProvider.update expects the full editable value set). */
	function mergedValues(row: Item, field: string, value: unknown): Record<string, unknown> {
		return { name: row.name, price: row.price, stock: row.stock, [field]: value };
	}

	// M3 (spec §4.5): commit a single inline cell edit. A validation error
	// from the provider is re-thrown as a plain Error so BantoGrid re-enters
	// edit mode on that cell and shows the message inline; any other
	// provider error is unexpected, so it's also toasted before rethrowing.
	//
	// BantoGrid's onCellEdit contract only understands `Error.message` - a
	// cell can display exactly one message, no structured shape - so when the
	// provider returns several field_errors (mergedValues always sends the
	// full row, so an edit to one field can surface a violation on another),
	// we must pick just one. Priority: the entry for the field the user
	// actually edited wins if present (that's the one they can see and fix
	// inline); only fall back to the first entry when the edited field itself
	// has no violation (rare - e.g. some other field was already invalid).
	// This is a known limitation of the current onCellEdit contract, pending
	// a richer (multi-field) error shape in a later milestone.
	//
	// Works unchanged in both grid modes: on success it calls invalidate(),
	// which client mode picks up via ListResource's onInvalidate-triggered
	// reload and server mode via WindowedListResource's onInvalidate-
	// triggered refresh() (re-fetching just the currently visible blocks).
	async function handleCellEdit(edit: CellEdit<Item>) {
		try {
			await getDataProvider().update('items', edit.rowId, mergedValues(edit.row, edit.field, edit.value));
			invalidate('items');
		} catch (err) {
			if (isProviderError(err) && err.body.kind === 'validation') {
				const fieldError =
					err.body.field_errors.find((fe) => fe.field === edit.field) ?? err.body.field_errors[0];
				throw new Error(fieldError?.message ?? err.message);
			}
			notify('error', isProviderError(err) ? err.message : String(err));
			throw err;
		}
	}

	// M3 (spec §4.5): a pasted TSV range can touch several rows/columns at
	// once. Group by row so multi-column pastes on one row become a single
	// `update()` call with all of that row's edited fields merged.
	async function handleRangePaste(edits: CellEdit<Item>[], info: { skipped: number }) {
		const byRow = new Map<string | number, { row: Item; values: Record<string, unknown> }>();
		for (const edit of edits) {
			const entry = byRow.get(edit.rowId) ?? {
				row: edit.row,
				values: { name: edit.row.name, price: edit.row.price, stock: edit.row.stock }
			};
			entry.values[edit.field] = edit.value;
			byRow.set(edit.rowId, entry);
		}

		let updated = 0;
		for (const [rowId, entry] of byRow) {
			try {
				await getDataProvider().update('items', rowId, entry.values);
				updated++;
			} catch (err) {
				notify('error', isProviderError(err) ? err.message : String(err));
			}
		}

		if (updated > 0) {
			invalidate('items');
			notify('success', `${updated}件更新しました`);
		}
		if (info.skipped > 0) {
			notify('info', `${info.skipped}セルはスキップされました`);
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<h2>{resource.label}</h2>
		<div class="page-header-actions">
			<div class="mode-toggle" role="group" aria-label="表示モード切り替え">
				<button type="button" class:active={mode === 'client'} onclick={() => (mode = 'client')}>
					クライアント
				</button>
				<button type="button" class:active={mode === 'server'} onclick={() => (mode = 'server')}>
					サーバー
				</button>
			</div>
			<button type="button" onclick={() => goto('/items/new')}>新規作成</button>
		</div>
	</div>

	<p class="note">
		セル編集（ダブルクリック/Enter）・範囲選択・コピー&ペースト対応（M3）。「クライアント」は全件を一度に取得し、ソート/フィルタ/ページングをブラウザ側（BantoGrid）で行います。「サーバー」ではソート/フィルタ/ページングをDataProvider（ブラウザ=InMemory、Tauri=Rust+SQLite）が実行し、行はスクロールに応じてブロック単位で遅延取得します（M5）。
	</p>

	{#if mode === 'client'}
		<ItemsClientGrid
			{columns}
			onRowClick={handleRowClick}
			onCellEdit={handleCellEdit}
			onRangePaste={handleRangePaste}
		/>
	{:else}
		<ItemsServerGrid
			{columns}
			onRowClick={handleRowClick}
			onCellEdit={handleCellEdit}
			onRangePaste={handleRangePaste}
		/>
	{/if}
</div>

<style>
	.page {
		height: calc(100vh - var(--banto-shell-header-height) - 2.5rem);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: 0 0 auto;
		margin-bottom: 0.5rem;
		gap: 1rem;
	}

	.page-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.page-header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.page-header button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--banto-radius);
		background: var(--banto-primary);
		color: var(--banto-text-inverse);
		font-weight: 600;
		cursor: pointer;
	}

	.page-header button:hover {
		background: var(--banto-primary-hover);
	}

	.mode-toggle {
		display: inline-flex;
		border: 1px solid var(--banto-border);
		border-radius: var(--banto-radius);
		overflow: hidden;
	}

	.mode-toggle button {
		padding: 0.4rem 0.8rem;
		border: none;
		background: var(--banto-surface);
		color: var(--banto-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.mode-toggle button:hover {
		background: color-mix(in srgb, var(--banto-primary) 8%, transparent);
	}

	.mode-toggle button.active {
		background: var(--banto-primary);
		color: var(--banto-text-inverse);
	}

	.note {
		flex: 0 0 auto;
		margin: 0 0 0.75rem;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}
</style>
