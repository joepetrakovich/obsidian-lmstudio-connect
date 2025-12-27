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
	import {
		currentServer,
		requestServerRefresh,
		toV1BaseURL,
	} from "src/settings.svelte";
	import ErrorMessage from "./ErrorMessage.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	setPluginContext(plugin);

	let server = $derived(currentServer(plugin.settings));
	let baseURL = $derived(server ? toV1BaseURL(server.url) : "");
	let model = $derived(server?.lastUsedModel ?? "");

	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL,
		}),
	);

	let input = $state("");
	let messages: ChatMessage[] = $state([]);
	let bufferHeight = $state(0);
	let errorMessage = $state("");
	let messagesContainer: HTMLUListElement;

	const gap = 20;

	function toApiMessages(messages: ChatMessage[]): ModelMessage[] {
		return messages.map((m) => ({
			role: m.role,
			content: m.parts.join(""),
		}));
	}

	async function send() {
		errorMessage = "";
		messages.push({
			role: Role.User,
			status: Status.Complete,
			parts: [input],
		});
		messages.push({
			role: Role.Assistant,
			status: Status.Pending,
			parts: [],
		});
		const result = streamText({
			model: provider(model),
			prompt: toApiMessages(messages.slice(0, -1)),
			onError({ error }) {
				console.error(error);
				messages = messages.slice(0, -1);
				errorMessage = "Something went wrong.  Is LM Studio connected?";
				requestServerRefresh();
			},
		});
		input = "";

		await tick();
		const lastUserMessage = messagesContainer.children[messages.length - 2];
		bufferHeight =
			messagesContainer.clientHeight -
			(lastUserMessage?.clientHeight ?? 0) -
			gap;

		const response = messages[messages.length - 1];
		for await (const textPart of result.textStream) {
			response.parts.push(textPart);
			if (response.status === Status.Pending)
				response.status = Status.Streaming;
		}
		response.status = Status.Complete;
	}

	function clearMessages(e: Event) {
		e.preventDefault();
		messages = [];
	}

	function resend() {
		requestServerRefresh();
		const lastUserMessage = messages.last()?.parts.first() || "";
		input = lastUserMessage;
		messages = messages.slice(0, -1);
		send();
	}
</script>

<div class="container">
	<TopToolbar onclear={clearMessages} />

	{#if messages.length}
		<ul bind:this={messagesContainer} style="--buffer-height: {bufferHeight}px">
			{#each messages as message}
				<Message {message} />
			{/each}

			{#if errorMessage}
				<ErrorMessage message={errorMessage} onretry={resend} />
			{/if}
		</ul>
	{:else}
		<EmptyView />
	{/if}

	<ChatInput bind:input onsend={send} />
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		gap: var(--size-4-1);
	}

	ul {
		flex: 1;
		overflow-y: auto;
		list-style-type: none;
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		padding: 0;
		margin: var(--size-4-1) 0;
	}
</style>
