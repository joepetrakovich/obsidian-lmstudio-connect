<script>
	import { icon } from "./Icon.svelte";

	let { message, onretry } = $props();
</script>

<li class="error">
	{message}&nbsp;
	<button onclick={onretry}>
		Retry<span {@attach icon("rotate-ccw")}></span>
	</button>
</li>


<style>
	li.error {
		font-size: var(--font-small);
		color: var(--text-error);
		font-style: italic;
		min-height: var(--buffer-height);
		flex-shrink: 0;
	}

	li.error button {
		height: 1.75em;
		display: inline-flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	li.error span :global(svg) {
		height: var(--icon-s);
		width: var(--icon-s);
	}
</style>
