<script lang="ts">
	import LMStudioConnectPlugin from "src/main";
	import type { InputValue } from "src/services/models";
	import { setPluginContext } from "src/services/context";
	import EmptyView from "./EmptyView.svelte";
	import ChatInput from "./ChatInput.svelte";
	import TopToolbar from "./TopToolbar.svelte";
	import { streamChat } from "src/services/lms-api";
	import type {
		ChatRequest,
		LMSExchange,
		OutputItemView,
	} from "src/services/lms-api";
	import LMSExchangeView from "./LMSExchange.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	// svelte-ignore state_referenced_locally
	setPluginContext(plugin);
	const modelStore = $derived(plugin.modelStore);

	let exchanges: LMSExchange[] = $state([]);
	let currentExchange: LMSExchange | undefined = $state();
	let previousResponseId: string | undefined = undefined;
	let abortController: AbortController | undefined = $state();
	let onabort = $derived(
		abortController
			? () => {
					abortController?.abort();
				}
			: undefined,
	);
	let bufferHeight = $state(0);
	let errored: boolean = false;
	let input: ChatInput;
	let cachedInput: InputValue;

	async function onsend() {
		if (errored) modelStore.refreshAvailableModels();

		const text = await input.text();
		const display = input.contentHTML();
		cachedInput = { text, display };
		input.clear();

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
		});
		currentExchange = exchanges[exchanges.length - 1];

		abortController = new AbortController();
		let currentOutputItem: OutputItemView | undefined;

		try {
			const apiRequest: ChatRequest = {
				model: modelStore.currentModel,
				input: [{ type: "text", content: message.text }],
				previous_response_id: previousResponseId,
				stream: true,
				integrations: modelStore.currentIntegrations,
			};

			for await (const event of streamChat(
				`${modelStore.currentServer?.url}/api/v1/chat`,
				apiRequest,
				{
					apiKey: modelStore.currentApiKey,
					signal: abortController.signal,
				},
			)) {
				switch (event.type) {
					case "model_load.start":
						break;
					case "model_load.progress":
						break;
					case "model_load.end":
						break;
					case "prompt_processing.start":
						break;
					case "prompt_processing.progress":
						break;
					case "prompt_processing.end":
						break;
					case "chat.start":
						break;
					case "reasoning.start":
						currentExchange.response.messages.push({
							type: "reasoning",
							content: "",
							status: "in-progress",
						});
						currentOutputItem =
							currentExchange.response.messages[
								currentExchange.response.messages.length - 1
							];
						break;
					case "reasoning.delta":
						if (currentOutputItem?.type === "reasoning") {
							currentOutputItem.content += event.content;
						}
						break;
					case "reasoning.end":
						if (currentOutputItem?.type === "reasoning") {
							currentOutputItem.status = "done";
						}
						currentOutputItem = undefined;
						break;
					case "message.start":
						currentExchange.response.messages.push({
							type: "message",
							content: "",
						});
						currentOutputItem =
							currentExchange.response.messages[
								currentExchange.response.messages.length - 1
							];
						break;
					case "message.delta":
						if (currentOutputItem?.type === "message") {
							currentOutputItem.content += event.content;
						}
						break;
					case "message.end": {
						const messages = currentExchange.response.messages;
						if (
							currentOutputItem?.type === "message" &&
							!currentOutputItem.content.trim()
						) {
							messages.pop();
						}
						currentOutputItem = undefined;
						break;
					}
					case "error":
						currentExchange.response.messages.push({
							type: "stream_error",
							message: event.error.message,
						});
						input.set(cachedInput.text);
						break;
					case "tool_call.start":
						currentExchange.response.messages.push({
							type: "tool_call",
							tool: event.tool,
							arguments: {},
							output: "",
							provider_info: event.provider_info,
						});
						currentOutputItem =
							currentExchange.response.messages[
								currentExchange.response.messages.length - 1
							];
						break;
					case "tool_call.name":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.tool = event.tool_name
							currentOutputItem.provider_info = event.provider_info;
						}
						break;
					case "tool_call.arguments":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.arguments = {
								...currentOutputItem.arguments,
								...event.arguments,
							};
						}
						break;
					case "tool_call.success":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.arguments = event.arguments;
							currentOutputItem.output = event.output;
						}
						currentOutputItem = undefined;
						break;
					case "tool_call.failure": {
						const messages = currentExchange.response.messages;
						if (currentOutputItem?.type === "tool_call") {
							messages.pop();
						}
						messages.push({
							type: "invalid_tool_call",
							reason: event.reason,
							metadata: event.metadata,
						});
						currentOutputItem = undefined;
						break;
					}
					case "chat.end":
						previousResponseId = event.result.response_id;
						//todo: can do a self heal to sync it at end
						break;
				}
			}
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				errored = true;
				console.error(e);
				modelStore.refreshAvailableModels();
			}
			input.set(cachedInput.text);
		}

		abortController = undefined;
		currentExchange.response.status = errored ? "error" : "completed";
	}

	function clearMessages(e: Event) {
		e.preventDefault();
		exchanges = [];
		previousResponseId = undefined; //prob need to be managed better, stored on message obj
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
				<LMSExchangeView {exchange} onretry={resend} />
			{/each}
		</ul>
	{:else}
		<EmptyView />
	{/if}

	<ChatInput bind:this={input} {onsend} {onabort} disablenoterefs />
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
