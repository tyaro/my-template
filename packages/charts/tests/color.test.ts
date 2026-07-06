import { describe, expect, it } from 'vitest';
import { seriesColorVar } from '../src/core/color';

describe('seriesColorVar', () => {
	it('maps series index 0..7 to slots 1..8 in fixed order', () => {
		for (let i = 0; i < 8; i++) {
			expect(seriesColorVar(i)).toBe(`var(--banto-chart-${i + 1})`);
		}
	});

	it('clamps overflow (index >= 8) to slot 8 instead of cycling back to slot 1', () => {
		expect(seriesColorVar(8)).toBe('var(--banto-chart-8)');
		expect(seriesColorVar(20)).toBe('var(--banto-chart-8)');
	});
});
