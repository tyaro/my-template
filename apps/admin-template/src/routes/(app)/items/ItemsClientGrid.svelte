<script lang="ts">
	/**
	 * クライアントモード (spec §4.1, M2-M4): unchanged from before M5 - fetch
	 * the whole demo dataset once (limit large enough to cover it) and let
	 * BantoGrid do client-side sort/filter/paging under virtualization.
	 *
	 * Split out from +page.svelte (M5 Phase A) so the mode toggle can fully
	 * mount/unmount whichever side is inactive: `createListResource`
	 * subscribes to `onInvalidate('items')` in its constructor, so keeping
	 * both this and ItemsServerGrid always alive at the parent level would
	 * leave two live subscriptions (and two in-flight resources) at once.
	 * A plain `{#if}` in the parent already destroys this component (running
	 * the `$effect` cleanup below) when the toggle flips to サーバー.
	 */
	import { BantoGrid, type CellEdit, type GridColumn } from '@banto/grid-svelte';
	import { createListResource } from '@banto/admin-core';
	import type { Item } from '$lib/banto/sampleData';

	interface Props {
		columns: GridColumn<Item>[];
		onRowClick: (item: Item) => void;
		onCellEdit: (edit: CellEdit<Item>) => void | Promise<void>;
		onRangePaste: (edits: CellEdit<Item>[], info: { skipped: number }) => void | Promise<void>;
	}

	let { columns, onRowClick, onCellEdit, onRangePaste }: Props = $props();

	const list = createListResource<Item>('items', {
		initialParams: { pagination: { offset: 0, limit: 20_000 } }
	});

	$effect(() => {
		void list.load();
		return () => list.dispose();
	});
</script>

<p class="note">{list.totalCount.toLocaleString()}件のデータを表示しています。</p>

{#if list.loading && list.rows.length === 0}
	<p class="loading">読み込み中…</p>
{:else}
	<div class="grid-wrap">
		<BantoGrid
			rows={list.rows}
			{columns}
			getRowId={(item) => item.id}
			{onRowClick}
			{onCellEdit}
			{onRangePaste}
		/>
	</div>
{/if}

<style>
	.note {
		flex: 0 0 auto;
		margin: 0 0 0.75rem;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.loading {
		flex: 1;
		display: grid;
		place-items: center;
		color: var(--banto-text-muted);
	}

	.grid-wrap {
		flex: 1;
		min-height: 0;
	}
</style>
