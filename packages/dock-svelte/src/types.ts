/**
 * Public types for @banto/dock-svelte (spec §5, M7 scope: floating pseudo-
 * windows only - no docking/splits/tabs/snap zones yet, no Tauri native
 * windows).
 *
 * `DockLayout` is deliberately shaped so M8 (spec §5.1, §5.2: split
 * containers, tab groups, snap-to-edge) can extend it without a breaking
 * format change: `version` lets `hydrate` distinguish payload shapes, and
 * `floating` only ever grows a sibling (e.g. a `docked` tree) rather than
 * being restructured itself. z-order is intentionally just array order (last
 * = frontmost) - no numeric z field to keep in sync or serialize.
 */

/** One floating pseudo-window's persisted geometry + open/closed state. */
export interface FloatingWindow {
	/** Panel id, unique within a DockLayout. */
	id: string;
	title: string;
	/** Emoji, shown in the titlebar. */
	icon?: string;
	/** Position in px, relative to the DockHost's top-left. */
	x: number;
	y: number;
	width: number;
	height: number;
	/** Closed panels keep their geometry around so reopening restores it. */
	open: boolean;
}

/** Full serializable dock layout (spec §5.1: "レイアウト全体をJSONにシリアライズ/デシリアライズ可能に"). */
export interface DockLayout {
	/** Bump on breaking changes - M8 adds a `docked` tree alongside `floating`, not a replacement for it. */
	version: 1;
	/** Render order = z-order; last entry is frontmost. */
	floating: FloatingWindow[];
}

/** Definition passed to `DockState.ensureWindow` / `reset` for a window that may not exist in the layout yet. */
export interface FloatingWindowDef {
	id: string;
	title: string;
	icon?: string;
	/** Falls back to geometry.ts's DEFAULT_WINDOW_WIDTH/HEIGHT when omitted. */
	width?: number;
	height?: number;
}

/** Resize handle positions (4 edges + 4 corners; spec §5.2 "自由な位置・サイズ変更"). */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
