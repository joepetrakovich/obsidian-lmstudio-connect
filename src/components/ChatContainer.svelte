<script lang="ts">
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { generateText } from "ai";
	import type LMStudioConnectPlugin from "src/main";
	import { customFetch } from "../services/fetch";
	import ModelPicker from "./ModelPicker.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	let provider = $derived(
		createOpenAICompatible({
			name: "lmstudio",
			baseURL: plugin.settings.baseURL,
			fetch: customFetch,
		}),
	);
	
	let model: string = $state(plugin.settings.lastUsedModel); 
	let message: string = $state("");
	let response = $state(); //prob gonna use ai Chat sdk...

	$effect(() => {
		plugin.settings.lastUsedModel = model;
		plugin.saveSettings();
	});
	
	async function send() {
		const result = await generateText({
			model: provider(model),
			prompt: message,
		});

		console.log(result);
		response = result.text;
	}
</script>

<div class="container">
	<small>placeholder header</small>
	{response}
	<div class="chatbox">
		<textarea bind:value={message}></textarea>
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
