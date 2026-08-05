<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import {
		streamText,
		stepCountIs,
	} from "ai";
	import LMStudioConnectPlugin from "src/main";
	import {
		Config,
		toApiMessages,
		type Exchange,
		type ResponseMessage,
		type ToolCallMessage,
	} from "src/services/models";
	import ExchangeView from "./Exchange.svelte";
	import { setPluginContext } from "src/services/context";
	import { createReadFileTool } from "src/llm/tools/readFile";
	import { createListFilesTool } from "src/llm/tools/listFiles";
	import { createWebFetchTool } from "src/llm/tools/webFetch";
	import { systemPrompt, } from "src/llm/prompts";
	import CancelButton from "./CancelButton.svelte";
	import SendButton from "./SendButton.svelte";

	let { plugin, config }: { plugin: LMStudioConnectPlugin; config: Config } = $props();

	// svelte-ignore state_referenced_locally
	setPluginContext(plugin);
	const modelStore = $derived(plugin.modelStore);

	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL: modelStore.currentBaseUrl,
		}),
	);

	let exchange: Exchange | undefined = $state();
	let abortController: AbortController | undefined = $state();
	let onabort = $derived(
		abortController ? () => { abortController?.abort(); } : undefined
	);
	let errored: boolean = false;

	async function send() {
		errored = false;
		exchange = {
			created: Date.now(),
			userMessage: {
				content: config.prompt,
				displayHTML: config.prompt,
			},
			response: {
				status: "in-progress",
				messages: [],
			},
			ai_sdk_messages: [],
		};

		abortController = new AbortController();
		const abortSignal = abortController.signal;

		const result = streamText({
			model: provider(modelStore.currentModel),
			system: systemPrompt,
			messages: toApiMessages(plugin, [exchange]),
		tools: {
			readFile: createReadFileTool(plugin),
			listFiles: createListFilesTool(plugin),
			webFetch: createWebFetchTool(),
		},
			stopWhen: stepCountIs(20),
			onStepFinish({ staticToolCalls }) {
				for (const call of staticToolCalls) {
					exchange?.response.messages.push({
						type: "tool-call",
						id: call.toolCallId,
						name: call.toolName,
						input: call.input,
					} as ToolCallMessage);
				}
			},
			onFinish({ response }) {
				if (exchange) {
					exchange.ai_sdk_messages = response.messages;
				}
			},
			abortSignal,
			onError({ error }) {
				errored = true;
				console.error(error);
			},
		});

		const finalMessage: ResponseMessage = $state({
			type: "text",
			parts: [],
			isFinal: true,
		});
		exchange.response.messages.push(finalMessage);
		for await (const part of result.textStream) {
			finalMessage.parts.push(part);
		}

		abortController = undefined;
		if (exchange) {
			exchange.response.status = errored ? "error" : "completed";
		}
	}

	function onretry() {
		exchange = undefined;
		send();
	}
</script>

<div class="lmsc-codeblock">
	<div class="lmsc-prompt">
		<span>{config.prompt}</span>

		{#if abortController}
			<CancelButton onclick={() => onabort?.()} />
		{:else}
			<SendButton onclick={send} disabled={false} />
		{/if}
	</div>

	{#if exchange}
		<ExchangeView {exchange} {onretry} hideUserMessage={true} hideToolUse={config.hideToolUse} />
	{/if}
</div>

<style>
	.lmsc-codeblock {
		padding: var(--size-2-2);
	}

	.lmsc-prompt {
		display: flex;
		align-items: center;
		gap: var(--size-4-3);
		color: var(--text-faint);
	}

	.lmsc-prompt span {
		font-style: italic;
	}

	.lmsc-prompt :global(svg) {
		rotate: 90deg;
	}

	.lmsc-prompt :global(button) {
		height: 24px;
		width: 24px;
		padding: var(--size-2-2);
	}

	.lmsc-codeblock div.lmsc-prompt :global(button.send) {
		background-color: var(--interactive-normal);
		color: var(--text-muted);
	}

	.lmsc-codeblock div.lmsc-prompt :global(button:hover) {
		background-color: var(--interactive-hover);
	}
</style>
