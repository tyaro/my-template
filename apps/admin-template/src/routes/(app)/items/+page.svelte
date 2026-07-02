<script lang="ts">
	import { BantoGrid, type GridColumn } from '@banto/grid-svelte';
	import { goto } from '$app/navigation';
	import { items, type Item } from './data';

	const columns: GridColumn<Item>[] = [
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
			filterType: 'text'
		},
		{
			id: 'price',
			header: '価格',
			accessor: 'price',
			width: 120,
			align: 'right',
			filterable: true,
			filterType: 'number',
			format: (value) => `¥${(value as number).toLocaleString()}`
		},
		{
			id: 'stock',
			header: '在庫',
			accessor: 'stock',
			width: 100,
			align: 'right',
			filterable: true,
			filterType: 'number'
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
</script>

<div class="page">
	<p class="note">
		M1グリッドデモ: @banto/grid-svelte（仮想スクロール・複数列ソート・列フィルタ・列リサイズ/並び替え）で
		{items.length.toLocaleString()}件のサンプルデータを表示しています。M2でDataProvider経由のRust連携に
		置き換わります。
	</p>

	<div class="grid-wrap">
		<BantoGrid rows={items} {columns} getRowId={(item) => item.id} onRowClick={handleRowClick} />
	</div>
</div>

<style>
	.page {
		height: calc(100vh - var(--banto-shell-header-height) - 2.5rem);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.note {
		flex: 0 0 auto;
		margin: 0 0 0.75rem;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.grid-wrap {
		flex: 1;
		min-height: 0;
	}
</style>
