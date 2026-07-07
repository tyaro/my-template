/**
 * Reactive dock state (Svelte 5 runes): the list of floating pseudo-windows,
 * their geometry, open/closed state, and z-order (spec §5.1/§5.2, M7 scope).
 * All geometry decisions delegate to the pure `core/geometry.ts` helpers;
 * this class only owns reassigning `layout` so Svelte's reactivity picks up
 * each change.
 */
import {
	DEFAULT_MIN_HEIGHT,
	DEFAULT_MIN_WIDTH,
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_WINDOW_WIDTH,
	applyDrag,
	applyResize,
	bringToFront,
	cascadePosition,
	clampWindowToHost
} from './core/geometry';
import type { DockLayout, FloatingWindow, FloatingWindowDef, ResizeEdge } from './types';

function isFloatingWindow(value: unknown): value is FloatingWindow {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.title === 'string' &&
		(candidate.icon === undefined || typeof candidate.icon === 'string') &&
		typeof candidate.x === 'number' &&
		typeof candidate.y === 'number' &&
		typeof candidate.width === 'number' &&
		typeof candidate.height === 'number' &&
		typeof candidate.open === 'boolean'
	);
}

function isDockLayout(value: unknown): value is DockLayout {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return candidate.version === 1 && Array.isArray(candidate.floating) && candidate.floating.every(isFloatingWindow);
}

function emptyLayout(): DockLayout {
	return { version: 1, floating: [] };
}

function placeNew(def: FloatingWindowDef, index: number, hostW: number, hostH: number): FloatingWindow {
	const width = def.width ?? DEFAULT_WINDOW_WIDTH;
	const height = def.height ?? DEFAULT_WINDOW_HEIGHT;
	const { x, y } = cascadePosition(index, hostW, hostH, width, height);
	return clampWindowToHost(
		{ id: def.id, title: def.title, icon: def.icon, x, y, width, height, open: true },
		hostW,
		hostH
	);
}

export class DockState {
	layout: DockLayout = $state(emptyLayout());

	constructor(initial?: DockLayout | string) {
		if (typeof initial === 'string') {
			this.hydrate(initial);
		} else if (initial) {
			this.layout = initial;
		}
	}

	isOpen(id: string): boolean {
		return this.layout.floating.find((w) => w.id === id)?.open ?? false;
	}

	/** Opens (marking `open: true`) and brings the window to front. No-op if the id doesn't exist yet - see `ensureWindow`. */
	open(id: string): void {
		if (!this.layout.floating.some((w) => w.id === id)) return;
		this.#update(id, (w) => ({ ...w, open: true }));
		this.focus(id);
	}

	/** Closes the window but keeps its geometry so a later `open`/`toggle` restores the same position/size. */
	close(id: string): void {
		this.#update(id, (w) => ({ ...w, open: false }));
	}

	toggle(id: string): void {
		if (this.isOpen(id)) this.close(id);
		else this.open(id);
	}

	/** Bring a window to the front of z-order (render order = z-order; spec §5.2). */
	focus(id: string): void {
		this.layout = bringToFront(this.layout, id);
	}

	move(id: string, dx: number, dy: number, hostW: number, hostH: number): void {
		this.#update(id, (w) => applyDrag(w, dx, dy, hostW, hostH));
	}

	resize(id: string, edge: ResizeEdge, dx: number, dy: number, hostW: number, hostH: number): void {
		this.#update(id, (w) =>
			applyResize(w, edge, dx, dy, hostW, hostH, DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT)
		);
	}

	/** Adds `def` with a cascade position if it isn't in the layout yet; otherwise a no-op (existing geometry/open-state is left untouched). */
	ensureWindow(def: FloatingWindowDef, hostW: number, hostH: number): void {
		if (this.layout.floating.some((w) => w.id === def.id)) return;
		const win = placeNew(def, this.layout.floating.length, hostW, hostH);
		this.layout = { ...this.layout, floating: [...this.layout.floating, win] };
	}

	/** Serialize the whole layout for persistence (spec §5.1). */
	serialize(): string {
		return JSON.stringify(this.layout);
	}

	/**
	 * Apply a previously-serialized layout onto this instance. Malformed JSON
	 * or a payload that doesn't match `DockLayout`'s shape is ignored (state
	 * is left unchanged). Ids that no longer correspond to a known window
	 * definition are deliberately kept as-is - pruning them is the host
	 * component's job at render time (`ensureWindow` never removes anything).
	 */
	hydrate(json: string): void {
		let parsed: unknown;
		try {
			parsed = JSON.parse(json);
		} catch {
			return;
		}
		if (!isDockLayout(parsed)) return;
		this.layout = parsed;
	}

	/** Discard the current layout and re-place every def at its cascade default, all open. */
	reset(defs: FloatingWindowDef[], hostW: number, hostH: number): void {
		this.layout = {
			version: 1,
			floating: defs.map((def, index) => placeNew(def, index, hostW, hostH))
		};
	}

	#update(id: string, fn: (win: FloatingWindow) => FloatingWindow): void {
		const index = this.layout.floating.findIndex((w) => w.id === id);
		if (index === -1) return;
		const next = this.layout.floating.slice();
		next[index] = fn(next[index]);
		this.layout = { ...this.layout, floating: next };
	}
}

/** Create a `DockState`, optionally seeded from a `DockLayout` or a serialized JSON string (see `hydrate`). */
export function createDockState(initial?: DockLayout | string): DockState {
	return new DockState(initial);
}
