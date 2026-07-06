<script lang="ts">
	/**
	 * Shared chart shell (spec §6.2): measures the container width via
	 * `bind:clientWidth` (a plain reactive binding is enough per spec - no
	 * separate ResizeObserver wiring needed), sets up an SVG whose `viewBox`
	 * exactly matches the rendered pixel size (so the coordinate space used by
	 * `plot` is 1:1 with real pixels, with no scale distortion), and hosts an
	 * absolutely-positioned HTML `overlay` snippet for tooltips (spec rule 6).
	 *
	 * Accessibility (spec rule 8): the root gets `role="img"` and the
	 * required `label` prop as `aria-label`. A table-view fallback for
	 * screen-reader users is out of scope for v1 (later milestone).
	 */
	import type { Snippet } from 'svelte';

	export interface PlotMetrics {
		width: number;
		height: number;
	}

	interface Props {
		label: string;
		height?: number;
		empty?: boolean;
		plot: Snippet<[PlotMetrics]>;
		overlay?: Snippet<[PlotMetrics]>;
	}

	let { label, height = 240, empty = false, plot, overlay }: Props = $props();

	let width: number = $state(0);
</script>

<div
	class="chart-container"
	role="img"
	aria-label={label}
	style:height={`${height}px`}
	bind:clientWidth={width}
>
	{#if empty}
		<div class="empty-state">データがありません</div>
	{:else if width > 0}
		<svg class="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
			{@render plot({ width, height })}
		</svg>
		{#if overlay}
			{@render overlay({ width, height })}
		{/if}
	{/if}
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}

	.chart-svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.empty-state {
		height: 100%;
		display: grid;
		place-items: center;
		color: var(--banto-text-muted);
		font-size: 0.85rem;
	}
</style>
