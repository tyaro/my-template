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
	import { DockHost, createDockState, type FloatingWindow, type FloatingWindowDef } from '@banto/dock-svelte';
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

	/**
	 * M7 dock demo (spec §5, @banto/dock-svelte): three floating windows over
	 * the same monthCounts/buckets data already charted above, showing
	 * drag/resize/close/reopen + saved layout. M8 adds split/tab/snap on top
	 * of this same DockState/DockLayout shape (no breaking format change).
	 */
	const DOCK_STORAGE_KEY = 'banto.dock.dashboard';

	const DOCK_WINDOW_DEFS: FloatingWindowDef[] = [
		{ id: 'monthly', title: '月別更新件数', icon: '📈', width: 420, height: 320 },
		{ id: 'priceBuckets', title: '価格帯分布', icon: '🥧', width: 360, height: 320 },
		{ id: 'memo', title: 'メモ', icon: '📝', width: 320, height: 220 }
	];

	function loadDockLayout(): string | undefined {
		if (typeof localStorage === 'undefined') return undefined;
		return localStorage.getItem(DOCK_STORAGE_KEY) ?? undefined;
	}

	// Persistence is localStorage for now (M7). Per spec §12.1 ("UIレイアウト
	// ... は同上（リモートブラウザ利用時はクライアント側localStorage）"), this
	// moves behind the SettingsProvider abstraction once it exists: local
	// SQLite settings DB in the webview, localStorage for remote browser
	// clients (same migration already planned for `settings.svelte.ts`'s
	// theme mode).
	const dock = createDockState(loadDockLayout());

	let dockHostW = $state(0);
	let dockHostH = $state(0);

	// Only place windows once the host has a real measured size - ensureWindow
	// is a no-op for ids already in the (possibly hydrated) layout, so this is
	// safe to re-run on every resize.
	$effect(() => {
		if (dockHostW === 0 || dockHostH === 0) return;
		for (const def of DOCK_WINDOW_DEFS) {
			dock.ensureWindow(def, dockHostW, dockHostH);
		}
	});

	// Autosave the whole layout (position/size/open-state/z-order) on every
	// change. Reading `dock.serialize()` (which reads `dock.layout`
	// internally) inside this effect is what makes it re-run after every
	// move/resize/focus/open/close.
	$effect(() => {
		const json = dock.serialize();
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(DOCK_STORAGE_KEY, json);
		}
	});

	function resetDockLayout() {
		dock.reset(DOCK_WINDOW_DEFS, dockHostW, dockHostH);
	}

	/** Chart height inside a dock window body: window height minus titlebar + panel padding (spec: "height fits window body"). Recomputed reactively since `win` is the live FloatingWindow record. */
	function chartHeightFor(win: FloatingWindow): number {
		return Math.max(140, win.height - 64);
	}
</script>

<div class="page">
	<p class="note">
		商品データ（{list.totalCount.toLocaleString()}件）から集計したダッシュボードです（M4）。折れ線・棒・円・散布図はすべて
		@banto/charts のSVGフルスクラッチ実装。下部のドッキングレイアウトは@banto/dock-svelteによるフローティングウィンドウのデモです（M7）。
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
				<p>
					フローティングウィンドウのデモです（M7、@banto/dock-svelte）。ドラッグ・リサイズ・閉じる/開くを試せます。レイアウトは自動保存されます。M8で分割・タブ化・スナップが追加されます。
				</p>
				<div class="dock-toolbar" role="toolbar" aria-label="ドックウィンドウ操作">
					{#each DOCK_WINDOW_DEFS as def (def.id)}
						<button
							type="button"
							class="dock-toggle"
							class:active={dock.isOpen(def.id)}
							aria-pressed={dock.isOpen(def.id)}
							onclick={() => dock.toggle(def.id)}
						>
							{def.icon}
							{def.title}
						</button>
					{/each}
					<button type="button" class="dock-reset" onclick={resetDockLayout}>リセット</button>
				</div>
				<div class="dock-wrapper" bind:clientWidth={dockHostW} bind:clientHeight={dockHostH}>
					<DockHost {dock} panel={dockPanel} />
				</div>
			</section>
		</div>
	{/if}
</div>

{#snippet dockPanel(win: FloatingWindow)}
	{#if win.id === 'monthly'}
		<div class="dock-panel">
			<LineChart
				data={monthCounts}
				x={(row) => row.month}
				series={[{ id: 'count', label: '更新件数', y: (row) => row.count }]}
				area
				label="月別更新件数の面グラフ"
				height={chartHeightFor(win)}
				formatY={(n) => n.toLocaleString()}
			/>
		</div>
	{:else if win.id === 'priceBuckets'}
		<div class="dock-panel">
			<PieChart
				data={buckets}
				category={(row) => row.bucket}
				value={(row) => row.count}
				donut
				label="価格帯分布のドーナツグラフ"
				height={chartHeightFor(win)}
				formatValue={countLabel}
			/>
		</div>
	{:else}
		<div class="dock-panel dock-memo">
			<p>
				ドラッグ・リサイズ・閉じる/開くを試せます。レイアウトは自動保存されます。M8で分割・タブ化・スナップが追加されます。
			</p>
		</div>
	{/if}
{/snippet}

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

	.dock-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.75rem 0;
	}

	.dock-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid var(--banto-border);
		border-radius: 999px;
		background: var(--banto-surface);
		color: var(--banto-text-muted);
		padding: 0.35rem 0.9rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.dock-toggle.active {
		border-color: var(--banto-primary);
		color: var(--banto-primary);
		background: color-mix(in srgb, var(--banto-primary) 8%, transparent);
	}

	.dock-toggle:focus-visible,
	.dock-reset:focus-visible {
		outline: none;
		box-shadow: var(--banto-focus-ring);
	}

	.dock-reset {
		border: 1px solid var(--banto-border);
		border-radius: 999px;
		background: var(--banto-surface);
		color: var(--banto-text);
		padding: 0.35rem 0.9rem;
		font-size: 0.8rem;
		cursor: pointer;
		margin-left: auto;
	}

	.dock-reset:hover {
		border-color: var(--banto-primary);
	}

	.dock-wrapper {
		height: 520px;
	}

	.dock-panel {
		height: 100%;
		box-sizing: border-box;
		padding: 0.75rem;
	}

	.dock-memo p {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.85rem;
		line-height: 1.6;
	}
</style>
