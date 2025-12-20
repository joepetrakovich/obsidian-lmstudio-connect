<script lang="ts">
	import { icon } from "./Icon.svelte";
	import { tooltip } from "./Tooltip.svelte";
	let { onclear }: { onclear: (e: Event) => void } = $props();
</script>

<div class="container">
	<div
		tabindex="0"
		{@attach icon("trash")}
		{@attach tooltip("Clear chat")}
		class="clickable-icon"
		onclick={onclear}
		onkeydown={onclear}
		aria-label="delete-chat"
		role="button"
	></div>
</div>

<style>
	.container {
		display: flex;
	}
</style>
