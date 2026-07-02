<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import {
		streamText,
		stepCountIs,
	} from "ai";
	import LMStudioConnectPlugin from "src/main";
	import {
	toApiMessages,
		type Exchange,
		type InputValue,
		type ResponseMessage,
		type ToolCallMessage,
	} from "src/services/models";
	import { setPluginContext } from "src/services/context";
	import EmptyView from "./EmptyView.svelte";
	import ChatInput from "./ChatInput.svelte";
	import { createReadFileTool } from "src/llm/tools/readFile";
	import { createListFilesTool } from "src/llm/tools/listFiles";
	import { createWebFetchTool } from "src/llm/tools/webFetch";
	import { systemPrompt } from "src/llm/prompts";
	import TopToolbar from "./TopToolbar.svelte";
	import ExchangeView from "./Exchange.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	// svelte-ignore state_referenced_locally
	setPluginContext(plugin);
	const modelStore = $derived(plugin.modelStore);

	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL: modelStore.currentBaseUrl,
		}),
	);

	let exchanges: Exchange[] = $state([]);
	let currentExchange: Exchange | undefined = $state();
	let abortController: AbortController | undefined = $state();
	let onabort = $derived( abortController ? () => { abortController?.abort(); } : undefined);
	let bufferHeight = $state(0);
	let errored: boolean = false;
	let input: ChatInput;
	let cachedInput: InputValue;

	async function onsend() {
		if (errored) modelStore.refreshAvailableModels();

		const text = await input.text();
		const display = input.contentHTML();
		cachedInput = { text, display };

		await send(cachedInput);
	}

	async function send(message: InputValue) {
		errored = false;
		exchanges.push({
			created: Date.now(),
			userMessage: {
				content: message.text,
				displayHTML: message.display,
			},
			response: {
				status: "in-progress",
				messages: [],
			},
			ai_sdk_messages: [],
		});
		currentExchange = exchanges[exchanges.length - 1];

		abortController = new AbortController();
		const abortSignal = abortController.signal;

		const result = streamText({
			model: provider(modelStore.currentModel),
			system: systemPrompt,
			messages: toApiMessages(plugin, exchanges),
		tools: {
			readFile: createReadFileTool(plugin),
			listFiles: createListFilesTool(plugin),
			webFetch: createWebFetchTool()
		},
			stopWhen: stepCountIs(5),
			onStepFinish({ staticToolCalls }) {
				for (const call of staticToolCalls) {
					currentExchange?.response.messages.push({
						type: "tool-call",
						id: call.toolCallId,
						name: call.toolName,
						input: call.input,
					} as ToolCallMessage);
				}
			},
			onFinish({ response }) {
				if (currentExchange) {
					currentExchange.ai_sdk_messages = response.messages;
				}
			},
			abortSignal,
			onError({ error }) {
				errored = true;
				console.error(error);
				modelStore.refreshAvailableModels();
			},
		});
		input.clear();

		const finalMessage: ResponseMessage = $state({
			type: "text",
			parts: [],
			isFinal: true,
		});
		currentExchange.response.messages.push(finalMessage);
		for await (const part of result.textStream) {
			finalMessage.parts.push(part);
		}

		abortController = undefined;
		currentExchange.response.status = errored ? "error" : "completed";
	}

	function clearMessages(e: Event) {
		e.preventDefault();
		exchanges = [];
	}

	function resend() {
		modelStore.refreshAvailableModels();
		exchanges = exchanges.slice(0, -1);
		send(cachedInput);
	}

</script>

<div class="lmsc container">
	<TopToolbar onclear={clearMessages} />

	{#if exchanges.length}
		<ul
			bind:clientHeight={bufferHeight}
			style="--buffer-height: {bufferHeight}px"
		>
			{#each exchanges as exchange}
				<ExchangeView {exchange} onretry={resend} />
			{/each}
		</ul>
	{:else}
		<EmptyView />
	{/if}

	<ChatInput bind:this={input} {onsend} {onabort} />
</div>

<style>
	.container {
		container-type: inline-size;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		gap: var(--size-4-1);
		padding-bottom: var(--size-4-1);
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

	ul > :global(li:last-of-type) {
		min-height: var(--buffer-height);
		flex-shrink: 0;
	}
</style>
