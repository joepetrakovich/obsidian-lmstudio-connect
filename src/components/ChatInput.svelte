<script lang="ts">
	import { icon } from "./Icon.svelte";
	import ModelPicker from "./ModelPicker.svelte";

	let {
		input: value = $bindable(),
		model = $bindable(),
		baseURL,
		onsend,
	} = $props();

	function onkeydown(e: KeyboardEvent) {
		if (e.key == "Enter" && !e.shiftKey) {
			e.preventDefault();
			onsend();
		}
	}
</script>

<div class="chatbox">
	<textarea bind:value {onkeydown}></textarea>
	<div class="toolbar">
		<div>
			<ModelPicker {baseURL} bind:model />
		</div>
		<button title="send"
			disabled={!value}
			{@attach icon("arrow-up")}
			onclick={onsend}
		></button>
	</div>
</div>

<style>
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
	button {
		color: var(--text-on-accent);
		border-radius: 50%;
		box-shadow: none;
		padding: var(--size-2-2) var(--size-2-3);	
	}
	button:enabled {
		background-color: var(--interactive-accent);
		transition: all var(--anim-duration-fast) ease-in-out;
	}
	button:hover {
		background-color: var(--interactive-accent-hover);
	}
	button:disabled,button:disabled:hover {
		background-color: var(--background-primary);
		color: var(--text-muted);
		opacity: .6
	}
</style>
