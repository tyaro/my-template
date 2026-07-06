/**
 * Pure aggregation helpers for the M4 dashboard (spec §6 integration): all
 * derived from the `items` list resource, kept side-effect free so they stay
 * type-checked and trivially testable even though this milestone only wires
 * them into `+page.svelte` (no dedicated Vitest suite for this app-level
 * glue - the chart math itself is covered in @banto/charts).
 */
import type { Item } from './sampleData';

export interface StatTiles {
	count: number;
	stockTotal: number;
	avgPrice: number;
	lowStockCount: number;
}

const LOW_STOCK_THRESHOLD = 50;

/** 商品数 / 在庫合計 / 平均価格 (rounded mean) / 在庫僅少 (stock < 50) counts. */
export function computeStatTiles(items: Item[]): StatTiles {
	const count = items.length;
	const stockTotal = items.reduce((sum, item) => sum + item.stock, 0);
	const avgPrice = count === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + item.price, 0) / count);
	const lowStockCount = items.filter((item) => item.stock < LOW_STOCK_THRESHOLD).length;
	return { count, stockTotal, avgPrice, lowStockCount };
}

export interface CategoryStock {
	category: string;
	stock: number;
}

/** Category = the item name's first whitespace-separated token (e.g. "緑茶 500ml" -> "緑茶"). */
export function categoryOf(name: string): string {
	return name.split(/\s+/)[0] || name;
}

/**
 * Sum of stock per category, ALL categories, sorted desc. No 「その他」 fold:
 * the demo dataset's category set is small and bounded (12), and folding the
 * tail into a single bar summed several categories into one bar ~5x longer
 * than any real one - a misleading chart. Folding is only warranted when the
 * category count is unbounded. Note the 8-color-slot design rule constrains
 * SERIES count, not bar count; this feeds a single-series (single-hue) bar
 * chart, so any number of bars is fine.
 */
export function byCategory(items: Item[]): CategoryStock[] {
	const totals = new Map<string, number>();
	for (const item of items) {
		const cat = categoryOf(item.name);
		totals.set(cat, (totals.get(cat) ?? 0) + item.stock);
	}
	return [...totals.entries()]
		.map(([category, stock]) => ({ category, stock }))
		.sort((a, b) => b.stock - a.stock);
}

export interface PriceBucket {
	bucket: string;
	count: number;
}

const PRICE_BUCKET_LABELS = ['〜¥99', '¥100〜149', '¥150〜199', '¥200〜'] as const;

/** 〜¥99 / ¥100〜149 / ¥150〜199 / ¥200〜 item counts. */
export function priceBuckets(items: Item[]): PriceBucket[] {
	const counts = [0, 0, 0, 0];
	for (const item of items) {
		if (item.price <= 99) counts[0]++;
		else if (item.price <= 149) counts[1]++;
		else if (item.price <= 199) counts[2]++;
		else counts[3]++;
	}
	return PRICE_BUCKET_LABELS.map((bucket, i) => ({ bucket, count: counts[i] }));
}

export interface MonthCount {
	/** `YYYY-MM`. */
	month: string;
	count: number;
}

/**
 * Count of items per updatedAt MONTH (`YYYY-MM` = first 7 chars of the ISO
 * date), ascending; lexicographic sort of `YYYY-MM` is chronological. Daily
 * granularity (~900 points over the demo dataset's 2.5-year span) rendered
 * as an unreadable noise band in a ~300px-wide card, so the dashboard
 * aggregates monthly (~30 points) instead.
 */
export function updatesByMonth(items: Item[]): MonthCount[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const month = item.updatedAt.slice(0, 7);
		counts.set(month, (counts.get(month) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([month, count]) => ({ month, count }))
		.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

const SCATTER_SAMPLE_SIZE = 500;

/** First N rows, deterministic (no shuffling) - a stable sample for the scatter chart. */
export function scatterSample(items: Item[], limit: number = SCATTER_SAMPLE_SIZE): Item[] {
	return items.slice(0, limit);
}
