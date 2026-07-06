<script lang="ts" generics="TRow">
	/**
	 * Line/area chart (spec §6). X is treated as an ordered category axis
	 * (index-spaced, see `core/ticks-time.ts` for why a real time scale is
	 * out of scope for v1) - a shared vertical crosshair + tooltip (spec rule
	 * 6) snaps to the nearest data index on hover anywhere over the plot.
	 * One y-axis only (rule 2); it does NOT force a zero baseline (that rule
	 * only applies to bar charts) - it "nice-ticks" the actual data range.
	 */
	import { linearScale, niceTicks } from './core/scale';
	import { linePath, areaPath } from './core/path';
	import { everyNthIndex } from './core/ticks-time';
	import { seriesColorVar } from './core/color';
	import { getValue, toNumber, type Accessor, type ChartMargin, type TooltipRow } from './types';
	import ChartContainer from './internal/ChartContainer.svelte';
	import Legend from './internal/Legend.svelte';
	import Tooltip from './internal/Tooltip.svelte';

	interface LineSeries {
		id: string;
		label: string;
		y: Accessor<TRow>;
	}

	interface Props {
		data: TRow[];
		x: Accessor<TRow>;
		series: LineSeries[];
		area?: boolean;
		label: string;
		height?: number;
		formatY?: (n: number) => string;
		formatX?: (v: unknown) => string;
		/** Per-side overrides merged over the defaults below. */
		margins?: Partial<ChartMargin>;
	}

	let { data, x, series, area = false, label, height = 240, formatY, formatX, margins }: Props =
		$props();

	const DEFAULT_MARGIN: ChartMargin = { top: 12, right: 16, bottom: 28, left: 48 };
	const MARGIN = $derived({ ...DEFAULT_MARGIN, ...margins });
	// Minimum px per x-axis tick label so dense datasets (e.g. one point per
	// day over a couple of years) don't overlap on narrower chart cards -
	// the actual tick count is derived per-render from the measured plot
	// width (see `maxXTicksFor` below), not a fixed constant.
	const MIN_TICK_SPACING = 70;

	const formatYValue = $derived(formatY ?? ((n: number) => n.toLocaleString()));
	const formatXValue = $derived(formatX ?? ((v: unknown) => String(v ?? '')));

	const xLabels = $derived(data.map((row) => getValue(row, x)));
	const seriesValues = $derived(series.map((s) => data.map((row) => toNumber(getValue(row, s.y)))));

	const allFiniteValues = $derived(seriesValues.flat().filter((v) => Number.isFinite(v)));
	const isEmpty = $derived(data.length === 0 || series.length === 0 || allFiniteValues.length === 0);

	const yTicks = $derived(
		isEmpty ? [0, 1] : niceTicks(Math.min(...allFiniteValues), Math.max(...allFiniteValues), 5)
	);

	const legendItems = $derived(
		series.map((s, i) => ({ id: s.id, label: s.label, colorVar: seriesColorVar(i) }))
	);

	function maxXTicksFor(innerWidth: number): number {
		return Math.max(2, Math.min(8, Math.floor(innerWidth / MIN_TICK_SPACING)));
	}

	let hoveredIndex: number | null = $state(null);

	function plotMetrics(width: number, plotHeight: number) {
		const innerLeft = MARGIN.left;
		const innerTop = MARGIN.top;
		const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
		const innerHeight = Math.max(0, plotHeight - MARGIN.top - MARGIN.bottom);
		return { innerLeft, innerTop, innerWidth, innerHeight };
	}

	function xAt(index: number, innerLeft: number, innerWidth: number): number {
		if (data.length <= 1) return innerLeft + innerWidth / 2;
		return innerLeft + (index / (data.length - 1)) * innerWidth;
	}

	function indexFromX(clientX: number, innerLeft: number, innerWidth: number): number {
		if (data.length <= 1) return 0;
		const ratio = (clientX - innerLeft) / innerWidth;
		const idx = Math.round(ratio * (data.length - 1));
		return Math.max(0, Math.min(data.length - 1, idx));
	}

	// ChartContainer sets the <svg> viewBox to exactly the measured container
	// pixel size (no `preserveAspectRatio` scaling), so 1 viewBox unit === 1
	// screen px: the hover rect's own bounding box left edge already sits at
	// `innerLeft` in viewBox-space, letting us convert clientX -> viewBox-space
	// without needing a reference to the outer <svg> element at all.
	function handlePointerMove(event: PointerEvent, innerLeft: number, innerWidth: number) {
		const target = event.currentTarget as SVGRectElement;
		const bounds = target.getBoundingClientRect();
		const localX = innerLeft + (event.clientX - bounds.left);
		hoveredIndex = indexFromX(localX, innerLeft, innerWidth);
	}

	function tooltipRows(index: number): TooltipRow[] {
		return series.map((s, i) => {
			const raw = seriesValues[i][index];
			return {
				label: s.label,
				value: Number.isFinite(raw) ? formatYValue(raw) : '-',
				colorVar: seriesColorVar(i)
			};
		});
	}
</script>

<div class="banto-linechart">
	<Legend items={legendItems} />
	<ChartContainer {label} {height} empty={isEmpty}>
		{#snippet plot({ width, height: plotHeight })}
			{@const m = plotMetrics(width, plotHeight)}
			{@const yScale = linearScale([yTicks[0], yTicks[yTicks.length - 1]], [m.innerTop + m.innerHeight, m.innerTop])}
			<!-- Gridlines (recessive, rule 4) -->
			{#each yTicks as tick (tick)}
				<line
					x1={m.innerLeft}
					x2={m.innerLeft + m.innerWidth}
					y1={yScale(tick)}
					y2={yScale(tick)}
					class="gridline"
				/>
				<text x={m.innerLeft - 8} y={yScale(tick)} class="tick-label y-tick" text-anchor="end" dominant-baseline="middle">
					{formatYValue(tick)}
				</text>
			{/each}

			<!-- Axis lines -->
			<line x1={m.innerLeft} x2={m.innerLeft} y1={m.innerTop} y2={m.innerTop + m.innerHeight} class="axis-line" />
			<line
				x1={m.innerLeft}
				x2={m.innerLeft + m.innerWidth}
				y1={m.innerTop + m.innerHeight}
				y2={m.innerTop + m.innerHeight}
				class="axis-line"
			/>

			<!-- X labels. The last tick sits at the exact right edge of the plot
			     (everyNthIndex always includes the final index), so a middle-
			     anchored label there would overhang past the default right
			     margin and clip - anchor it "end" instead. -->
			{@const xTickIndices = everyNthIndex(data.length, maxXTicksFor(m.innerWidth))}
			{#each xTickIndices as i (i)}
				<text
					x={xAt(i, m.innerLeft, m.innerWidth)}
					y={m.innerTop + m.innerHeight + 18}
					class="tick-label x-tick"
					text-anchor={i === data.length - 1 ? 'end' : 'middle'}
				>
					{formatXValue(xLabels[i])}
				</text>
			{/each}

			<!-- Series lines/areas -->
			{#each series as s, i (s.id)}
				{@const points = seriesValues[i]
					.map((v, idx) => ({ v, idx }))
					.filter((p) => Number.isFinite(p.v))
					.map((p) => ({ x: xAt(p.idx, m.innerLeft, m.innerWidth), y: yScale(p.v) }))}
				{#if area}
					<path
						d={areaPath(points, m.innerTop + m.innerHeight)}
						fill={seriesColorVar(i)}
						fill-opacity="0.16"
						stroke="none"
					/>
				{/if}
				<path d={linePath(points)} fill="none" stroke={seriesColorVar(i)} stroke-width="2" />
			{/each}

			<!-- Crosshair + hover markers -->
			{#if hoveredIndex !== null}
				<line
					x1={xAt(hoveredIndex, m.innerLeft, m.innerWidth)}
					x2={xAt(hoveredIndex, m.innerLeft, m.innerWidth)}
					y1={m.innerTop}
					y2={m.innerTop + m.innerHeight}
					class="crosshair"
				/>
				{#each series as s, i (s.id)}
					{@const raw = seriesValues[i][hoveredIndex]}
					{#if Number.isFinite(raw)}
						<circle
							cx={xAt(hoveredIndex, m.innerLeft, m.innerWidth)}
							cy={yScale(raw)}
							r="4"
							fill={seriesColorVar(i)}
							stroke="var(--banto-surface)"
							stroke-width="2"
						/>
					{/if}
				{/each}
			{/if}

			<!--
				Hover capture surface (mandatory tooltip, rule 6: hover anywhere on
				the plot). Pointer-only by design: the tooltip is a supplementary
				visual aid, not the sole way to read a value (every value is also
				in the accessible-fallback table view planned for a later milestone,
				per the ChartContainer role="img" comment), so no keyboard
				equivalent is required here.
			-->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<rect
				x={m.innerLeft}
				y={m.innerTop}
				width={m.innerWidth}
				height={m.innerHeight}
				fill="transparent"
				onpointermove={(event) => handlePointerMove(event, m.innerLeft, m.innerWidth)}
				onpointerleave={() => (hoveredIndex = null)}
			/>
		{/snippet}
		{#snippet overlay({ width, height: plotHeight })}
			{#if hoveredIndex !== null}
				{@const m = plotMetrics(width, plotHeight)}
				<Tooltip
					x={xAt(hoveredIndex, m.innerLeft, m.innerWidth)}
					y={m.innerTop}
					containerWidth={width}
					containerHeight={plotHeight}
					title={formatXValue(xLabels[hoveredIndex])}
					rows={tooltipRows(hoveredIndex)}
				/>
			{/if}
		{/snippet}
	</ChartContainer>
</div>

<style>
	.banto-linechart {
		width: 100%;
	}

	.gridline {
		stroke: var(--banto-chart-grid);
		stroke-width: 1;
	}

	.axis-line {
		stroke: var(--banto-chart-axis);
		stroke-width: 1;
	}

	.crosshair {
		stroke: var(--banto-chart-axis);
		stroke-width: 1;
		pointer-events: none;
	}

	.tick-label {
		fill: var(--banto-text-muted);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
</style>
