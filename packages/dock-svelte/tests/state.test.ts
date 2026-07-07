import { describe, expect, it } from 'vitest';
import { DockState, createDockState } from '../src/state.svelte';
import type { DockLayout } from '../src/types';

const HOST_W = 800;
const HOST_H = 600;

describe('DockState.ensureWindow', () => {
	it('adds a window once, at a cascade position', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		expect(dock.layout.floating).toHaveLength(1);
		expect(dock.layout.floating[0]).toMatchObject({ id: 'a', title: 'A', open: true });

		dock.ensureWindow({ id: 'a', title: 'A (renamed, ignored)' }, HOST_W, HOST_H);
		expect(dock.layout.floating).toHaveLength(1);
		expect(dock.layout.floating[0].title).toBe('A');
	});

	it('keeps saved geometry for an existing (even closed) window instead of re-cascading it', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.move('a', 123, 45, HOST_W, HOST_H);
		dock.close('a');
		const before = { ...dock.layout.floating[0] };

		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);

		expect(dock.layout.floating[0]).toEqual(before);
		expect(dock.isOpen('a')).toBe(false);
	});

	it('cascades multiple new windows at increasing offsets', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.ensureWindow({ id: 'b', title: 'B' }, HOST_W, HOST_H);
		const [a, b] = dock.layout.floating;
		expect(b.x).toBeGreaterThan(a.x);
		expect(b.y).toBeGreaterThan(a.y);
	});
});

describe('DockState open/close/toggle', () => {
	function seeded(): DockState {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		return dock;
	}

	it('open/close/isOpen roundtrip', () => {
		const dock = seeded();
		expect(dock.isOpen('a')).toBe(true);
		dock.close('a');
		expect(dock.isOpen('a')).toBe(false);
		dock.open('a');
		expect(dock.isOpen('a')).toBe(true);
	});

	it('toggle flips open state', () => {
		const dock = seeded();
		dock.toggle('a');
		expect(dock.isOpen('a')).toBe(false);
		dock.toggle('a');
		expect(dock.isOpen('a')).toBe(true);
	});

	it('open/close/toggle on an unknown id is a no-op', () => {
		const dock = seeded();
		dock.open('zzz');
		dock.close('zzz');
		dock.toggle('zzz');
		expect(dock.layout.floating).toHaveLength(1);
	});
});

describe('DockState.focus', () => {
	it('reorders the target window to the end (frontmost)', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.ensureWindow({ id: 'b', title: 'B' }, HOST_W, HOST_H);
		dock.ensureWindow({ id: 'c', title: 'C' }, HOST_W, HOST_H);

		dock.focus('a');
		expect(dock.layout.floating.map((w) => w.id)).toEqual(['b', 'c', 'a']);
	});

	it('open() brings the window to front too', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.ensureWindow({ id: 'b', title: 'B' }, HOST_W, HOST_H);
		dock.close('a');

		dock.open('a');
		expect(dock.layout.floating.map((w) => w.id)).toEqual(['b', 'a']);
	});
});

describe('DockState move/resize', () => {
	it('move shifts the window and clamps to the host', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A', width: 300, height: 200 }, HOST_W, HOST_H);
		const before = dock.layout.floating[0];
		dock.move('a', 50, 20, HOST_W, HOST_H);
		const after = dock.layout.floating[0];
		expect(after.x).toBe(before.x + 50);
		expect(after.y).toBe(before.y + 20);
	});

	it('resize changes size via the se handle', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A', width: 300, height: 200 }, HOST_W, HOST_H);
		const before = dock.layout.floating[0];
		dock.resize('a', 'se', 80, 60, HOST_W, HOST_H);
		const after = dock.layout.floating[0];
		expect(after.width).toBe(before.width + 80);
		expect(after.height).toBe(before.height + 60);
		expect(after.x).toBe(before.x);
		expect(after.y).toBe(before.y);
	});
});

describe('DockState serialize/hydrate', () => {
	it('round-trips through JSON', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.ensureWindow({ id: 'b', title: 'B' }, HOST_W, HOST_H);
		dock.move('b', 10, 10, HOST_W, HOST_H);
		dock.close('a');

		const json = dock.serialize();
		const restored = createDockState();
		restored.hydrate(json);

		expect(restored.layout).toEqual(dock.layout);
	});

	it('hydrate on garbage input is a no-op', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		const before = JSON.parse(JSON.stringify(dock.layout));

		dock.hydrate('not json{{{');
		expect(dock.layout).toEqual(before);

		dock.hydrate(JSON.stringify({ version: 2, floating: [] }));
		expect(dock.layout).toEqual(before);

		dock.hydrate(JSON.stringify({ version: 1, floating: [{ id: 'a' }] }));
		expect(dock.layout).toEqual(before);

		dock.hydrate('null');
		expect(dock.layout).toEqual(before);
	});

	it('hydrate keeps unknown ids as-is (pruning is the host component job)', () => {
		const layout: DockLayout = {
			version: 1,
			floating: [{ id: 'ghost', title: 'Ghost', x: 0, y: 0, width: 200, height: 150, open: true }]
		};
		const dock = createDockState();
		dock.hydrate(JSON.stringify(layout));
		expect(dock.layout.floating).toHaveLength(1);
		expect(dock.layout.floating[0].id).toBe('ghost');
	});

	it('the constructor accepts a serialized string directly', () => {
		const seed = createDockState();
		seed.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		const dock = createDockState(seed.serialize());
		expect(dock.layout).toEqual(seed.layout);
	});

	it('the constructor accepts a DockLayout object directly', () => {
		const layout: DockLayout = { version: 1, floating: [] };
		const dock = createDockState(layout);
		expect(dock.layout).toEqual(layout);
	});
});

describe('DockState.reset', () => {
	it('restores cascade defaults for the given defs, all open', () => {
		const dock = createDockState();
		dock.ensureWindow({ id: 'a', title: 'A' }, HOST_W, HOST_H);
		dock.move('a', 500, 400, HOST_W, HOST_H);
		dock.close('a');

		dock.reset([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], HOST_W, HOST_H);

		expect(dock.layout.floating).toHaveLength(2);
		expect(dock.layout.floating.every((w) => w.open)).toBe(true);
		const a = dock.layout.floating.find((w) => w.id === 'a')!;
		expect(a.x).toBe(0);
		expect(a.y).toBe(0);
	});
});
