<script lang="ts">
	import { t } from "src/i18n";
	import { icon } from "./Icon.svelte";
	import { tooltip } from "./Tooltip.svelte";

	let { onclick }: { onclick: () => void } = $props();
</script>

<button
	class="cancel"
	{onclick}
	{@attach icon("square")}
	{@attach tooltip(t("chat.cancel"))}
	aria-label={t("chat.cancel")}
></button>

<style>
	button.cancel:focus {
		background-color: var(--background-modifier-border-focus);
	}

	button.cancel {
		border-radius: 50%;
		color: var(--interactive-accent);
		box-shadow: none;
		padding: var(--size-2-2) var(--size-2-3);
		aspect-ratio: 1 / 1;
		corner-shape: round;
	}
	button.cancel :global(svg) {
		fill: var(--interactive-accent);
	}
</style>
