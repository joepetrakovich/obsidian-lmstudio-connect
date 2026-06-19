<script lang="ts">
	import { t } from "src/i18n";
	import { icon } from "./Icon.svelte";
	import { tooltip } from "./Tooltip.svelte";

	let { onclick, disabled }: { onclick: () => void; disabled: boolean } =
		$props();
</script>

<button
	class="send"
	{onclick}
	{disabled}
	{@attach icon("arrow-up")}
	{@attach tooltip(t("chat.send"))}
	aria-label={t("chat.send")}
></button>

<style>
	button.send {
		color: var(--text-on-accent);
		border-radius: 50%;
		box-shadow: none;
		padding: var(--size-2-2) var(--size-2-3);
		aspect-ratio: 1 / 1;
		corner-shape: round;
	}
	button.send:enabled {
		background-color: var(--interactive-accent);
		transition: all var(--anim-duration-fast) ease-in-out;
	}
	button.send:hover {
		background-color: var(--interactive-accent-hover);
	}
	button.send:disabled,
	button.send:disabled:hover {
		background-color: var(--background-primary);
		color: var(--text-muted);
		opacity: 0.6;
	}
</style>
