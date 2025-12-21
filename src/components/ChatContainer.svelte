<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { streamText, type ModelMessage } from "ai";
	import LMStudioConnectPlugin from "src/main";
	import { Role, Status, type ChatMessage } from "src/services/models";
	import ChatInput from "./ChatInput.svelte";
	import TopToolbar from "./TopToolbar.svelte";
	import { icon } from "./Icon.svelte";
	import { tick } from "svelte";
	import { fade } from "svelte/transition";
	import { setSettingsContext } from "src/services/context";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	setSettingsContext(plugin.settings);

	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL: plugin.settings.baseURL,
		}),
	);

	let input = $state("");
	let messages: ChatMessage[] = $state([]);
	let bufferHeight = $state(0);

	let messagesContainer: HTMLUListElement;
	const gap = 20;

	function toApiMessages(messages: ChatMessage[]): ModelMessage[] {
		return messages.map(m => 
			m.role === Role.AI ? { role: 'system', content: m.parts.join('') } 
				: { role: 'user', content: m.parts.join('') } 
		);
	}

	async function send() {
		messages.push({ role: Role.User, status: Status.Complete, parts: [input] });
		messages.push({ role: Role.AI, status: Status.Pending, parts: [] });
		const result = streamText({
			model: provider(plugin.settings.lastUsedModel),
			prompt: toApiMessages(messages.slice(0,-1)),
		});
		input = "";
			
		// push user message to top. $effect?
		await tick();	
		const lastUserMessage = messagesContainer.children[messages.length-2];
		bufferHeight = messagesContainer.clientHeight - (lastUserMessage?.clientHeight ?? 0) - gap; 

		const response = messages[messages.length - 1];
		for await (const textPart of result.textStream) {
			response.parts.push(textPart);
			if (response.status === Status.Pending) response.status = Status.Streaming;	
		}
		response.status = Status.Complete;
	}

	function clearMessages(e: Event) {
		e.preventDefault();
		messages = [];
	}
</script>

<div class="container">
	<TopToolbar onclear={clearMessages} />

	<ul bind:this={messagesContainer} style="--buffer-height: {bufferHeight}px">
		{#each messages as message}
			<li class={message.role} {@attach (node) => {node.scrollIntoView({ behavior: "smooth" })}}>
				<div in:fade>
					{#if message.status === Status.Pending}
						<div class="loading" {@attach icon('loader-pinwheel')}></div>
					{:else if message.status === Status.Streaming}
						{#each message.parts as part}<span in:fade>{part}</span>{/each}
					{:else}
						{message.parts.join('')}
					{/if}
				</div>
			</li>
		{/each}
	</ul>

	<ChatInput
		bind:input
		onsend={send}
	/>
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	ul {
		flex: 1;
		overflow-y: auto;
		list-style-type: none;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 0;
		margin: var(--size-4-1) 0;
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

	li.ai:last-of-type {
		min-height: var(--buffer-height);
		flex-shrink: 0;
	}

	.loading :global(svg) {
		animation: spin 2s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
