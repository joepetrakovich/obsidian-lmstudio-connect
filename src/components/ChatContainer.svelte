<script>
	import { lmstudio } from "src/services/llm";
	import ModelPicker from "./ModelPicker.svelte";
	import { generateText } from "ai";

	//most likely will have a global llm client rune thats configured via components rather than here.
	let model = $state();
	let message = $state();
	let response = $state(); //prob gonna use ai Chat sdk...

	$effect(() => console.log(model));

	async function send() {
		const result = await generateText({
			model: lmstudio(model.id),
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
				<ModelPicker bind:value={model} />
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
