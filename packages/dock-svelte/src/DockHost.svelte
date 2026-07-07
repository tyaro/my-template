<script lang="ts">
	/**
	 * Host container for floating pseudo-windows (spec §5.2/§5.3, M7 scope).
	 * `position: relative; overflow: hidden`, measures itself via
	 * `bind:clientWidth`/`bind:clientHeight` (same plain-reactive-binding
	 * pattern as @banto/charts' ChartContainer.svelte - no separate
	 * ResizeObserver wiring needed), and renders every OPEN window from
	 * `dock.layout.floating`, in array order (render order = z-order, spec
	 * §5.2 - the last one is frontmost and simply painted last).
	 *
	 * The `panel` snippet receives each window's `FloatingWindow` record so
	 * the caller can switch on `win.id` to pick its content - DockHost itself
	 * has no notion of what a panel contains.
	 */
	import type { Snippet } from 'svelte';
	import type { DockState } from './state.svelte';
	import type { FloatingWindow } from './types';
	import DockWindow from './DockWindow.svelte';

	interface Props {
		dock: DockState;
		panel: Snippet<[FloatingWindow]>;
	}

	let { dock, panel }: Props = $props();

	let hostW: number = $state(0);
	let hostH: number = $state(0);

	const openWindows = $derived(dock.layout.floating.filter((w) => w.open));
</script>

<div class="dock-host" bind:clientWidth={hostW} bind:clientHeight={hostH}>
	{#each openWindows as win, index (win.id)}
		<DockWindow {win} {dock} {hostW} {hostH} frontmost={index === openWindows.length - 1} {panel} />
	{/each}
</div>

<style>
	.dock-host {
		position: relative;
		overflow: hidden;
		width: 100%;
		height: 100%;
		background: var(--banto-bg);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
	}
</style>
