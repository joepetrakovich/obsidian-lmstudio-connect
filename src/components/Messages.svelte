<script lang="ts">
	import { setIcon } from "obsidian";
	import { type ChatMessage } from "src/services/models";
	import { icon } from "./Icon.svelte";
	let { messages }: { messages: ChatMessage[] } = $props();
</script>

<div class="container">
	<ul>
		{#each messages as message}
			<li class={message.role}>
				<div>
					{#each $state.eager(message.parts) as part}
						{part}
					{/each}
				</div>
			</li>
		{/each}
	</ul>
</div>

<style>
	ul {
		list-style-type: none;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 0;
	}

	li {
		padding-left: 0;
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
</style>
