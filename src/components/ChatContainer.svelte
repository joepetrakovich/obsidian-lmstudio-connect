<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { streamText } from "ai";
	import type LMStudioConnectPlugin from "src/main";
	import { Role, type ChatMessage } from "src/services/models";
	import Messages from "./Messages.svelte";
	import { icon } from "./Icon.svelte";
    import ChatInput from "./ChatInput.svelte";
	
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

	//dummy text
	messages.push({ role: Role.User, parts: ["how how r u?"] });
	messages.push({ role: Role.AI, parts: ["not bad, hbu tho?"] });

	async function send() {
		messages.push({ role: Role.User, parts: [input] });
		const result = streamText({
			model: provider(model),
			prompt: input,
		});
		input = "";

		messages.push({ role: Role.AI, parts: [] });
		const response = messages[messages.length - 1];
		for await (const textPart of result.textStream) {
			response.parts.push(textPart);
		}
	}
	//TODO: move to top toolbar component
	function clearMessages(e: Event) {
		e.preventDefault();
		messages = [];
	}
</script>

<div class="container">
	<div>
		<div class="top-toolbar">
			<div
				tabindex="0"
				{@attach icon("trash")}
				class="clickable-icon"
				onclick={clearMessages}
				onkeydown={clearMessages}
				aria-label="delete-chat"
				role="button"
			></div>
		</div>
		<Messages {messages} />
	</div>

	<ChatInput bind:input bind:model baseURL={plugin.settings.baseURL} onsend={send} />
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.top-toolbar {
		display: flex;
	}
	.chatbox {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
		border: var(--border-width) solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		padding: var(--size-4-1);
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-1);
	}

	textarea {
		field-sizing: content;
		max-height: 10lh;
		overflow: auto;
		resize: none;
		border: none;
		background: transparent;
	}

	textarea:focus,
	textarea:active {
		border: none;
		outline: none;
		box-shadow: none;
	}
</style>
