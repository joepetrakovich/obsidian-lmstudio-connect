<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { streamText, type ModelMessage } from "ai";
	import LMStudioConnectPlugin from "src/main";
	import { Role, Status, type ChatMessage } from "src/services/models";
	import ChatInput from "./ChatInput.svelte";
	import TopToolbar from "./TopToolbar.svelte";
	import { tick } from "svelte";
	import { setPluginContext } from "src/services/context";
	import EmptyView from "./EmptyView.svelte";
	import Message from "./Message.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	setPluginContext(plugin);		

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
		{#if messages.length}
			{#each messages as message}
				<Message {message} />
			{/each}
		{:else}
			<EmptyView />
		{/if}
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

</style>
