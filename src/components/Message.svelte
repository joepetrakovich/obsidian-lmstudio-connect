<script lang="ts">
	import { fade } from "svelte/transition";
	import { icon } from "./Icon.svelte";
	import { type ChatMessage, Status } from "src/services/models";

	let { message }: { message: ChatMessage } = $props();
</script>

<li class={message.role} {@attach (node) => { node.scrollIntoView({ behavior: "smooth" }); }}>
	<div in:fade>
		{#if message.status === Status.Pending}
			<div class="loading" {@attach icon("loader-pinwheel")}></div>
		{:else if message.status === Status.Streaming}
			{#each message.parts as part}<span in:fade>{part}</span>{/each}
		{:else}
			{message.parts.join("")}
		{/if}
	</div>
</li>

<style>
	li {
		padding-left: 0;
		font-size: (--var-font-small);
	}

	li.user {
		align-self: flex-end;
		background: var(--background-primary);
		padding: var(--size-4-2);
		border-radius: var(--radius-l);
	}

	li.ai {
		color: white;
		align-self: flex-start;
	}

	li.ai:last-of-type {
		min-height: var(--buffer-height);
		flex-shrink: 0;
	}

	.loading :global(svg) {
		animation: spin 2s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
