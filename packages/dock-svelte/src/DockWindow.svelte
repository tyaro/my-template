<script lang="ts">
	/**
	 * Internal chrome for one floating pseudo-window (spec §5.2, M7 scope):
	 * titlebar (icon + title + close button) + scrollable body + 8 resize
	 * handles (4 edges, 4 corners). Not exported from index.ts - DockHost is
	 * the only public surface.
	 *
	 * Drag/resize use pointer events with window-level pointermove/pointerup
	 * listeners added on pointerdown (see grid-svelte's HeaderCell.svelte for
	 * why: setPointerCapture is per-element and a stray double-click can wedge
	 * a later, unrelated drag). Each move/resize event applies an INCREMENTAL
	 * delta (this event's client position minus the previous one, not the
	 * original pointerdown position) so that once the pointer re-enters the
	 * host's valid range after dragging past a clamp boundary, the window
	 * immediately starts following it again instead of staying stuck until
	 * the cumulative delta "catches up".
	 */
	import type { Snippet } from 'svelte';
	import type { DockState } from './state.svelte';
	import type { FloatingWindow, ResizeEdge } from './types';

	interface Props {
		win: FloatingWindow;
		dock: DockState;
		hostW: number;
		hostH: number;
		frontmost: boolean;
		panel: Snippet<[FloatingWindow]>;
	}

	let { win, dock, hostW, hostH, frontmost, panel }: Props = $props();

	function focusThis(): void {
		dock.focus(win.id);
	}

	function trackPointer(
		event: PointerEvent,
		onDelta: (dx: number, dy: number) => void
	): void {
		if (event.button !== 0) return;
		event.preventDefault();
		focusThis();

		const pointerId = event.pointerId;
		let lastX = event.clientX;
		let lastY = event.clientY;

		function onMove(moveEvent: PointerEvent) {
			if (moveEvent.pointerId !== pointerId) return;
			const dx = moveEvent.clientX - lastX;
			const dy = moveEvent.clientY - lastY;
			lastX = moveEvent.clientX;
			lastY = moveEvent.clientY;
			onDelta(dx, dy);
		}
		function onUp(upEvent: PointerEvent) {
			if (upEvent.pointerId !== pointerId) return;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		}
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function handleTitlebarPointerDown(event: PointerEvent) {
		trackPointer(event, (dx, dy) => dock.move(win.id, dx, dy, hostW, hostH));
	}

	function handleResizePointerDown(event: PointerEvent, edge: ResizeEdge) {
		// The handle sits on the window's own edge, so a pointerdown here would
		// otherwise also bubble into the titlebar/body focus handler below -
		// harmless (focus is idempotent) but stopped anyway for clarity.
		event.stopPropagation();
		trackPointer(event, (dx, dy) => dock.resize(win.id, edge, dx, dy, hostW, hostH));
	}

	const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
</script>

<!--
	role="dialog": each floating window is a self-contained pseudo-window
	(spec §5.3: single-webview, not a real OS window). No focus trap - v1
	pseudo-windows are non-modal, so Tab is free to move between them and the
	rest of the page. tabindex="-1" satisfies the interactive-role a11y rule
	(a dialog must be programmatically focusable) without joining the natural
	Tab order - the titlebar's close button is the real keyboard entry point.
-->
<div
	class="dock-window"
	class:frontmost
	role="dialog"
	aria-label={win.title}
	tabindex="-1"
	style:left={`${win.x}px`}
	style:top={`${win.y}px`}
	style:width={`${win.width}px`}
	style:height={`${win.height}px`}
	onpointerdown={focusThis}
>
	<!--
		Titlebar + body live in `.frame`, which is what actually clips content
		to the window's rounded corners (`overflow: hidden`). The resize
		handles below are siblings of `.frame`, NOT inside it - they're
		positioned a few px OUTSIDE the window's own box (e.g. `right: -3px`)
		to make them easy to grab, and `.frame`'s overflow:hidden would clip
		them (and swallow their pointer events) if they were nested inside it.
	-->
	<div class="frame">
		<!--
			Dragging the titlebar is pointer-only in v1 (spec §5.2 describes free
			drag/resize for floating panels; no keyboard-move equivalent is
			specified). Same class of limitation as the resize handles below -
			suppressed rather than "fixed" by inventing a keyboard interaction
			that isn't part of this milestone's scope.
		-->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="titlebar" onpointerdown={handleTitlebarPointerDown}>
			{#if win.icon}
				<span class="icon" aria-hidden="true">{win.icon}</span>
			{/if}
			<span class="title">{win.title}</span>
			<button
				type="button"
				class="close-btn"
				aria-label={`${win.title}を閉じる`}
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => dock.close(win.id)}
			>
				✕
			</button>
		</div>

		<div class="body">
			{@render panel(win)}
		</div>
	</div>

	<!-- Resize handles: pointer-only in v1 (no keyboard resize equivalent yet), so hidden from assistive tech. -->
	{#each RESIZE_EDGES as edge (edge)}
		<div
			class={`handle handle-${edge}`}
			aria-hidden="true"
			onpointerdown={(event) => handleResizePointerDown(event, edge)}
		></div>
	{/each}
</div>

<style>
	.dock-window {
		position: absolute;
		border-radius: calc(var(--banto-radius) * 2);
		border: 1px solid var(--banto-border);
		box-shadow: var(--banto-dock-shadow);
		background: var(--banto-surface);
	}

	.dock-window.frontmost {
		border-color: color-mix(in srgb, var(--banto-primary) 55%, var(--banto-border));
	}

	.frame {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: inherit;
	}

	.titlebar {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		height: var(--banto-dock-titlebar-height);
		padding: 0 0.4rem 0 0.7rem;
		background: var(--banto-surface-raised);
		border-bottom: 1px solid var(--banto-border);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--banto-text);
		user-select: none;
		touch-action: none;
		cursor: move;
	}

	.icon {
		flex: 0 0 auto;
		font-size: 0.9rem;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.close-btn {
		flex: 0 0 auto;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: var(--banto-radius);
		background: transparent;
		color: var(--banto-text-muted);
		cursor: pointer;
		font-size: 0.75rem;
		touch-action: none;
	}

	.close-btn:hover {
		background: color-mix(in srgb, var(--banto-danger) 15%, transparent);
		color: var(--banto-danger);
	}

	.close-btn:focus-visible {
		outline: none;
		box-shadow: var(--banto-focus-ring);
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		background: var(--banto-surface);
	}

	.handle {
		position: absolute;
		touch-action: none;
		z-index: 5;
	}

	.handle-n {
		top: -3px;
		left: 10px;
		right: 10px;
		height: 6px;
		cursor: ns-resize;
	}

	.handle-s {
		bottom: -3px;
		left: 10px;
		right: 10px;
		height: 6px;
		cursor: ns-resize;
	}

	.handle-e {
		right: -3px;
		top: 10px;
		bottom: 10px;
		width: 6px;
		cursor: ew-resize;
	}

	.handle-w {
		left: -3px;
		top: 10px;
		bottom: 10px;
		width: 6px;
		cursor: ew-resize;
	}

	.handle-ne {
		top: -5px;
		right: -5px;
		width: 10px;
		height: 10px;
		cursor: nesw-resize;
	}

	.handle-nw {
		top: -5px;
		left: -5px;
		width: 10px;
		height: 10px;
		cursor: nwse-resize;
	}

	.handle-se {
		bottom: -5px;
		right: -5px;
		width: 10px;
		height: 10px;
		cursor: nwse-resize;
	}

	.handle-sw {
		bottom: -5px;
		left: -5px;
		width: 10px;
		height: 10px;
		cursor: nesw-resize;
	}
</style>
