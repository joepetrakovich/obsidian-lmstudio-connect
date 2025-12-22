<script lang="ts">
	import { fade } from "svelte/transition";
	import { icon } from "./Icon.svelte";
	import { type ChatMessage, Role, Status } from "src/services/models";
	import { MarkdownRenderer } from "obsidian";
	import { getPluginContext } from "src/services/context";
	import type { Attachment } from "svelte/attachments";

	const plugin = getPluginContext();	
	let { message }: { message: ChatMessage } = $props();
	
	export function markdown(content: string): Attachment {
		return (element) => {
			 element.innerHTML = "";		
			 MarkdownRenderer.render(plugin.app, content, element as HTMLElement, '', plugin);				
		};
	}

	let content: HTMLDivElement;
	$effect(() => {
		if (message.role === Role.Assistant && message.status === Status.Complete) {
			//TODO: component may need to be the leaf for proper cleanup
			MarkdownRenderer.render(plugin.app, message.parts.join(''), content, '', plugin);
		}
	});
</script>

<li class={[ message.role, message.status ]} {@attach (node) => { node.scrollIntoView({ behavior: "smooth" }); }}>
	<div in:fade bind:this={content}>
		{#if message.role === Role.User}
			{message.parts.join('')}	
		{:else if message.status === Status.Pending}
			<div class="loading" {@attach icon("loader")}></div>
		{:else if message.status === Status.Streaming}
			{#key message.parts}
				<div {@attach markdown(message.parts.join(''))}></div>
			{/key}	
		{/if}
	</div>
</li>

<style>
	li {
		padding-left: 0;
		font-size: var(--font-small);
		color: var(--text-normal); 
	}

	li > div :global(p:first-child) {
		margin-top: 0;
		padding-top: 0;
	}

	li.user {
		align-self: flex-end;
		background: var(--background-primary); 
		padding: var(--size-4-2);
		border-radius: var(--radius-l);
	}

	li.assistant {
		align-self: flex-start;
	}

	li.assistant > div {
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
		transition: background-color var(--anim-duration-fast) ease-in-out;
	}

	li.assistant.complete > div {
		background-color: color-mix(in srgb, var(--background-primary), transparent 80%);
	}

	li.assistant.complete > div:hover {
		background-color: var(--background-primary);
	}
	
	li.assistant:last-of-type {
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
