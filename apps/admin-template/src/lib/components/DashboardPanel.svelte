<script lang="ts">
	/**
	 * Shared body renderer for a single dashboard dock panel (spec §5.3 v2
	 * pop-out): extracted from the dashboard page's `dockPanel` snippet so the
	 * SAME markup can render inside the dashboard's `DockHost` (docked pane or
	 * floating pseudo-window) AND, unmodified, as the standalone content of a
	 * REAL Tauri `WebviewWindow` at `routes/panel/[id]` once a panel is popped
	 * out - that route has no access to the dashboard page's own locals, so
	 * this component is fully self-contained: it loads its own `items` data
	 * rather than receiving already-aggregated rows as props.
	 *
	 * NOTE (perf): this loads the full item list (up to 20,000 rows, same
	 * `initialParams` as the dashboard page) independently, once per
	 * component instance. That means a popped-out panel's native window loads
	 * its own copy on top of whatever the main window already holds - fine
	 * here since each Tauri window is its own document/JS heap with no shared
	 * cache between them (no cross-window `admin-core` cache exists yet); an
	 * app with a heavier data provider would want to add one before relying on
	 * this pattern for many simultaneous pop-out windows.
	 */
	import { LineChart, PieChart } from '@banto/charts';
	import { createListResource } from '@banto/admin-core';
	import type { Item } from '$lib/banto/sampleData';
	import { priceBuckets, updatesByMonth } from '$lib/banto/dashboard';

	interface Props {
		id: string;
		/** Chart height in px; the caller measures its own container (dashboard: the dock pane's body; `/panel/[id]`: the route's viewport). */
		height?: number;
	}

	let { id, height = 280 }: Props = $props();

	const list = createListResource<Item>('items', {
		initialParams: { pagination: { offset: 0, limit: 20_000 } }
	});

	$effect(() => {
		void list.load();
		return () => list.dispose();
	});

	const monthCounts = $derived(updatesByMonth(list.rows));
	const buckets = $derived(priceBuckets(list.rows));

	const countLabel = (n: number) => `${n.toLocaleString()}件`;
</script>

{#if list.loading && list.rows.length === 0}
	<p class="status">読み込み中…</p>
{:else if id === 'monthly'}
	<LineChart
		data={monthCounts}
		x={(row) => row.month}
		series={[{ id: 'count', label: '更新件数', y: (row) => row.count }]}
		area
		label="月別更新件数の面グラフ"
		{height}
		formatY={(n) => n.toLocaleString()}
	/>
{:else if id === 'priceBuckets'}
	<PieChart
		data={buckets}
		category={(row) => row.bucket}
		value={(row) => row.count}
		donut
		label="価格帯分布のドーナツグラフ"
		{height}
		formatValue={countLabel}
	/>
{:else if id === 'memo'}
	<p class="memo">
		タイトルバー/タブをドラッグして分割・タブ化・再配置、仕切りでサイズ変更を試せます。レイアウトは自動保存されます。
	</p>
{:else}
	<p class="status">不明なパネルです</p>
{/if}

<style>
	.status {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.85rem;
	}

	.memo {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.85rem;
		line-height: 1.6;
	}
</style>
