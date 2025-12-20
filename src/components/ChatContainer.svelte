<script lang="ts">
	import { tick } from "svelte";
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { streamText } from "ai";
	import type LMStudioConnectPlugin from "src/main";
	import { Role, type ChatMessage } from "src/services/models";
	import Messages from "./Messages.svelte";
	import ChatInput from "./ChatInput.svelte";
	import TopToolbar from "./TopToolbar.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL: plugin.settings.baseURL,
		}),
	);
	let model: string = $state(plugin.settings.lastUsedModel);

	//TODO: check, does this cause looping since model and lastused are state?
	$effect(() => {
		plugin.settings.lastUsedModel = model;
		plugin.saveSettings();
	});

	let input = $state("");
	let messages: ChatMessage[] = $state([]);

	async function send() {
		messages.push({ role: Role.User, parts: [input] });
		const result = streamText({
			model: provider(model),
			prompt: input,
		});

		// await tick();
		// scrollToUserMessage()
		input = "";

		messages.push({ role: Role.AI, parts: [] });
		const response = messages[messages.length - 1];
		for await (const textPart of result.textStream) {
			response.parts.push(textPart);
		}
	}
	
	// function scrollToUserMessage() {
	// 	const items = document.querySelectorAll("li.user");
	// 	const lastItem = items[items.length - 1];
	//
	// 	if (lastItem) {
	// 		lastItem.scrollIntoView({
	// 			behavior: "smooth",
	// 			block: "start",
	// 		});
	// 	}
	// }

	function clearMessages(e: Event) {
		e.preventDefault();
		messages = [];
	}
</script>

<div class="container">
	<TopToolbar onclear={clearMessages} />

	<Messages {messages} />

	<ChatInput
		bind:input
		bind:model
		baseURL={plugin.settings.baseURL}
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
</style>
