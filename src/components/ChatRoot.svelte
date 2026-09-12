<script lang="ts">
	import type LMStudioConnectPlugin from "src/main";
	import ChatContainer from "./ChatContainer.svelte";
	import LMSChatContainer from "./LMSChatContainer.svelte";

	let { plugin }: { plugin: LMStudioConnectPlugin } = $props();
	const useVaultTools = $derived(plugin.settings.useVaultTools);
</script>

{#if useVaultTools}
	<ChatContainer {plugin} />
{:else}
	<LMSChatContainer {plugin} />
{/if}
