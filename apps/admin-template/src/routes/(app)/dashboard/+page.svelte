<script lang="ts">
	/**
	 * M4 dashboard (spec §6): real charts built from the `items` data, in
	 * place of the M1-M3 placeholder cards. Same "load once, whole dataset"
	 * pattern as the items page ($effect load/dispose around
	 * createListResource) since the dashboard needs the full set to
	 * aggregate, not a paginated window.
	 */
	import { BarChart, LineChart, PieChart, ScatterChart, Sparkline } from '@banto/charts';
	import { createListResource } from '@banto/admin-core';
	import type { Item } from '$lib/banto/sampleData';
	import {
		byCategory,
		computeStatTiles,
		priceBuckets,
		scatterSample,
		updatesByMonth
	} from '$lib/banto/dashboard';

	const list = createListResource<Item>('items', {
		initialParams: { pagination: { offset: 0, limit: 20_000 } }
	});

	$effect(() => {
		void list.load();
		return () => list.dispose();
	});

	const stats = $derived(computeStatTiles(list.rows));
	const categoryStock = $derived(byCategory(list.rows));
	const buckets = $derived(priceBuckets(list.rows));
	const monthCounts = $derived(updatesByMonth(list.rows));
	const scatterRows = $derived(scatterSample(list.rows));

	const yen = (n: number) => `¥${n.toLocaleString()}`;
	const countLabel = (n: number) => `${n.toLocaleString()}件`;
</script>

<div class="page">
	<p class="note">
		商品データ（{list.totalCount.toLocaleString()}件）から集計したダッシュボードです（M4）。折れ線・棒・円・散布図はすべて
		@banto/charts のSVGフルスクラッチ実装。ドッキングレイアウトのデモはM6-M7で追加されます。
	</p>

	<div class="stat-row">
		<section class="stat-tile">
			<span class="stat-label">商品数</span>
			<span class="stat-value">{stats.count.toLocaleString()}</span>
		</section>
		<section class="stat-tile">
			<span class="stat-label">在庫合計</span>
			<div class="stat-value-row">
				<span class="stat-value">{stats.stockTotal.toLocaleString()}</span>
				<Sparkline values={monthCounts.map((m) => m.count)} width={72} height={24} />
			</div>
		</section>
		<section class="stat-tile">
			<span class="stat-label">平均価格</span>
			<span class="stat-value">{yen(stats.avgPrice)}</span>
		</section>
		<section class="stat-tile">
			<span class="stat-label">在庫僅少（50未満）</span>
			<span class="stat-value">{stats.lowStockCount.toLocaleString()}</span>
		</section>
	</div>

	{#if list.loading && list.rows.length === 0}
		<p class="loading">読み込み中…</p>
	{:else}
		<div class="chart-grid">
			<section class="card">
				<h2>カテゴリ別在庫</h2>
				<BarChart
					data={categoryStock}
					category={(row) => row.category}
					series={[{ id: 'stock', label: '在庫', value: (row) => row.stock }]}
					horizontal
					label="カテゴリ別在庫の横棒グラフ"
					height={280}
					formatValue={(n) => n.toLocaleString()}
				/>
			</section>

			<section class="card">
				<h2>価格帯分布</h2>
				<PieChart
					data={buckets}
					category={(row) => row.bucket}
					value={(row) => row.count}
					donut
					label="価格帯分布のドーナツグラフ"
					height={280}
					formatValue={countLabel}
				/>
			</section>

			<section class="card">
				<h2>月別更新件数</h2>
				<LineChart
					data={monthCounts}
					x={(row) => row.month}
					series={[{ id: 'count', label: '更新件数', y: (row) => row.count }]}
					area
					label="月別更新件数の面グラフ"
					height={280}
					formatY={(n) => n.toLocaleString()}
				/>
			</section>

			<section class="card">
				<h2>価格×在庫</h2>
				<ScatterChart
					data={scatterRows}
					x={(row) => row.price}
					y={(row) => row.stock}
					pointLabel={(row) => row.name}
					label="価格と在庫の散布図"
					height={280}
					formatX={(v) => yen(Number(v))}
					formatY={(v) => countLabel(Number(v))}
				/>
			</section>

			<section class="card wide">
				<h2>ドッキングレイアウト</h2>
				<p>M6-M7で @banto/dock-svelte によるパネル分割・タブ化・レイアウト保存のデモが入ります。</p>
			</section>
		</div>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.note {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.loading {
		color: var(--banto-text-muted);
	}

	.stat-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-tile {
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.stat-label {
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.stat-value {
		font-size: 1.6rem;
		font-weight: 600;
		color: var(--banto-text);
		font-variant-numeric: tabular-nums;
	}

	.stat-value-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.chart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1rem;
	}

	.card {
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		padding: 1rem 1.25rem;
		min-width: 0;
	}

	.card.wide {
		grid-column: 1 / -1;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.card p {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.875rem;
	}
</style>
