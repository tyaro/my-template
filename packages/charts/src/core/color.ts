/**
 * Categorical series color slots (spec §6 design rules, rule 1):
 * series take CSS var slots 1..8 IN FIXED ORDER by series index - never
 * cycle, never reassign when a series is removed (color follows the
 * entity, i.e. its position in the caller's `series`/`data` array).
 * More than 8 series is out of scope for v1; overflow series are clamped
 * to the last slot rather than wrapping back to slot 1 (wrapping would
 * silently alias a later series onto an earlier one's color).
 */
export const MAX_CHART_SERIES = 8;

export function seriesColorVar(index: number): string {
	const slot = Math.min(Math.max(index, 0) + 1, MAX_CHART_SERIES);
	return `var(--banto-chart-${slot})`;
}
