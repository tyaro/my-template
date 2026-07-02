<script lang="ts">
	import '../app.css';
	import { settings } from '$lib/settings.svelte';

	let { children } = $props();

	// Start theme handling (applies persisted mode, watches OS changes).
	$effect(() => {
		settings.init();
	});
</script>

{@render children()}
