<script lang="ts">
	import LMStudioConnectPlugin from "src/main";
	import { setPluginContext } from "src/services/context";
	import { ChatSession } from "src/services/chat-session.svelte";
	import EmptyView from "./EmptyView.svelte";
	import ChatInput from "./ChatInput.svelte";
	import TopToolbar from "./TopToolbar.svelte";
	import ExchangeView from "./Exchange.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	// svelte-ignore state_referenced_locally
	setPluginContext(plugin);
	const useVaultTools = $derived(plugin.settings.useVaultTools);

	let input = $state<ChatInput>();
	// svelte-ignore state_referenced_locally
	const session = new ChatSession(plugin, (text) => input?.set(text));
	let bufferHeight = $state(0);

	async function onsend() {
		if (!input) return;
		const text = await input.text();
		const display = input.contentHTML();
		input.clear();
		await session.send({ text, display });
	}

	function clearMessages(e: Event) {
		e.preventDefault();
		session.clear();
	}

	function resend() {
		void session.resend();
	}
</script>

<div class="lmsc container">
	<TopToolbar onclear={clearMessages} />

	{#if session.exchanges.length}
		<ul
			bind:clientHeight={bufferHeight}
			style="--buffer-height: {bufferHeight}px"
		>
			{#each session.exchanges as exchange}
				<ExchangeView {exchange} onretry={resend} />
			{/each}
		</ul>
	{:else}
		<EmptyView />
	{/if}

	{#key useVaultTools}
		<ChatInput
			bind:this={input}
			{onsend}
			onabort={session.onabort}
			disablenoterefs={!useVaultTools}
		/>
	{/key}
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
