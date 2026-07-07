/**
 * Public entry point for @banto/dock-svelte (spec §5).
 * M7 scope: floating pseudo-windows only (draggable/resizable, focus/
 * z-order, open/close, JSON layout serialize/restore) inside a host
 * container. No docking/splits/tabs/snap zones and no Tauri native windows -
 * both are M8+ (spec §5.2/§5.3); the layout model is shaped so M8 can extend
 * it (a sibling `docked` tree) without a breaking format change.
 */
export { default as DockHost } from './DockHost.svelte';
export { DockState, createDockState } from './state.svelte';

export {
	applyDrag,
	applyResize,
	bringToFront,
	cascadePosition,
	clampWindowToHost,
	DEFAULT_MIN_HEIGHT,
	DEFAULT_MIN_VISIBLE,
	DEFAULT_MIN_WIDTH,
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_WINDOW_WIDTH,
	type ClampOptions
} from './core/geometry';

export type { DockLayout, FloatingWindow, FloatingWindowDef, ResizeEdge } from './types';
