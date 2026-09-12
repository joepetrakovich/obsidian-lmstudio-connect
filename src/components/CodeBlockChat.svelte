<script lang="ts">
	import LMStudioConnectPlugin from "src/main";
	import { Config } from "src/services/models";
	import ExchangeView from "./Exchange.svelte";
	import { setPluginContext } from "src/services/context";
	import { ChatSession } from "src/services/chat-session.svelte";
	import CancelButton from "./CancelButton.svelte";
	import SendButton from "./SendButton.svelte";

	let { plugin, config }: { plugin: LMStudioConnectPlugin; config: Config } =
		$props();

	// svelte-ignore state_referenced_locally
	setPluginContext(plugin);
	// svelte-ignore state_referenced_locally
	const session = new ChatSession(plugin);
	const exchange = $derived(session.current);

	function send() {
		void session.send({ text: config.prompt, display: config.prompt });
	}

	function onretry() {
		session.clear();
		send();
	}
</script>

<div class="lmsc-codeblock">
	<div class="lmsc-prompt">
		<span>{config.prompt}</span>

		{#if session.abortController}
			<CancelButton onclick={() => session.abortController?.abort()} />
		{:else}
			<SendButton onclick={send} disabled={false} />
		{/if}
	</div>

	{#if exchange}
		<ExchangeView
			{exchange}
			{onretry}
			hideUserMessage={true}
			hideToolUse={config.hideToolUse}
			hideReasoning={config.hideReasoning}
		/>
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
