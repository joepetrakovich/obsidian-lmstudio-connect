<script lang="ts">
	import { lmstudio } from "src/services/llm";
	import ModelPicker from "./ModelPicker.svelte";
	import { generateText } from "ai";
	import type LMStudioConnectPlugin from "src/main";
	import type { ModelInfo } from "src/services/models";

	//most likely will have a global llm client rune thats configured via components rather than here.
	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	let { baseURL } = plugin.settings;

	let model: ModelInfo | null = $state(null);
	let message: string = $state('');
	let response = $state(); //prob gonna use ai Chat sdk...

	$effect(() => {
		console.log(plugin);
		console.log(model);
	});

	async function send() {
		const result = await generateText({
			model: lmstudio(baseURL, model!.id),
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
				<ModelPicker {baseURL} bind:value={model} />
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
