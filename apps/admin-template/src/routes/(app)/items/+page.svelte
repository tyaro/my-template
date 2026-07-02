<script lang="ts">
	import { sampleItems } from './data';
</script>

<p class="note">
	M0スケルトン: 固定サンプルデータの素朴なテーブルです。M1で @banto/grid-svelte
	（仮想スクロール・ソート/フィルタ）に、M2でDataProvider経由のRust連携に置き換わります。
</p>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th>ID</th>
				<th>商品名</th>
				<th class="num">価格</th>
				<th class="num">在庫</th>
				<th>更新日</th>
			</tr>
		</thead>
		<tbody>
			{#each sampleItems as item (item.id)}
				<tr>
					<td>{item.id}</td>
					<td><a href="/items/{item.id}">{item.name}</a></td>
					<td class="num">¥{item.price.toLocaleString()}</td>
					<td class="num">{item.stock}</td>
					<td>{item.updatedAt}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.note {
		margin: 0 0 1rem;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.table-wrap {
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	th,
	td {
		text-align: left;
		padding: 0.6rem 0.9rem;
		border-bottom: 1px solid var(--banto-border);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	th {
		color: var(--banto-text-muted);
		font-weight: 600;
		height: var(--banto-grid-header-height);
	}

	.num {
		text-align: right;
	}

	a {
		color: var(--banto-primary);
	}
</style>
