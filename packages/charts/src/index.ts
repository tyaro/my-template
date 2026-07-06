/**
 * Public entry point for @banto/charts (spec §6).
 * v1 scope: LineChart (line/area), BarChart (vertical/horizontal, stacked),
 * PieChart (pie/donut), ScatterChart, Sparkline. No Canvas renderer, no
 * export, no animation beyond simple CSS hover transitions (spec limit).
 */
export { default as LineChart } from './LineChart.svelte';
export { default as BarChart } from './BarChart.svelte';
export { default as PieChart } from './PieChart.svelte';
export { default as ScatterChart } from './ScatterChart.svelte';
export { default as Sparkline } from './Sparkline.svelte';

export type { Accessor, ChartMargin, SeriesBase, TooltipRow } from './types';
export { getValue, toNumber } from './types';

export { linearScale, niceTicks, bandScale, type LinearScale, type BandScale } from './core/scale';
export { stackSeries, type StackSegment } from './core/stack';
export { pieSlices, arcPath, type PieSlice } from './core/pie';
export { linePath, areaPath, roundedTopBarPath, type Point } from './core/path';
export { everyNthIndex } from './core/ticks-time';
export { seriesColorVar, MAX_CHART_SERIES } from './core/color';
export {
	estimateLabelWidth,
	leftMarginFor,
	rightMarginForLastTick,
	type AxisMarginOptions
} from './core/labels';
