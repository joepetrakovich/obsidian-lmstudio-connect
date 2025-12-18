<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { streamText } from "ai";
	import type LMStudioConnectPlugin from "src/main";
	import ModelPicker from "./ModelPicker.svelte";
	import type { ChatMessage } from "src/services/models";

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

	function onkeydown(e: KeyboardEvent) {
		if (e.key == "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	let input = $state("");
	let chat: ChatMessage[] = $state([]);

	async function send() {
		chat.push({ role: "user", parts: [input] });
		const result = streamText({
			model: provider(model),
			prompt: input,
		});
		input = "";

		chat.push({ role: "ai", parts: [] });
		const response = chat[chat.length - 1];
		for await (const textPart of result.textStream) {
			response.parts.push(textPart);
		}
	}
</script>

<div class="container">
	<small>placeholder header</small>
	<ul>
		{#each chat as message}
			<li>
				<div>{message.role}</div>
				<div>
					{#each $state.eager(message.parts) as part}
						{part}
					{/each}
				</div>
			</li>
		{/each}
	</ul>
	<div class="chatbox">
		<textarea bind:value={input} {onkeydown}></textarea>
		<div class="toolbar">
			<div>
				<ModelPicker baseURL={plugin.settings.baseURL} bind:model />
			</div>
			<button onclick={send}>send</button>
		</div>
	</div>
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
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
