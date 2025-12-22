<script lang="ts">
	import { requestUrl } from "obsidian";
	import type { ModelInfo } from "../services/models";
	import { getPluginContext } from "src/services/context";
	import type { PluginSettings } from "src/settings.svelte";
	import type LMStudioConnectPlugin from "src/main";
	import { tooltip } from "./Tooltip.svelte";
	import { icon } from "./Icon.svelte";

	const plugin: LMStudioConnectPlugin = getPluginContext();
	const settings: PluginSettings = plugin.settings;
	
	let listModels = $derived(async () => {
		return await requestUrl(`${settings.baseURL}/models`).then((response) => {
			const { data } = response.json as { data: ModelInfo[] };
			return data;
		})
		.catch((error) => {
			console.error(error);
			throw error;
		});
	});

	// Model names are usually formatted like 'company/model' so truncate company
	// if it exists.
	function formatModelName(name: string) {
		const parts = name.split('/');
		return parts.length > 1 ? name.substring(parts[0].length + 1) : parts[0];
	}
</script>

{#snippet error()}
	<div class="error" {@attach tooltip("Verify base URL and enable CORS in LM Studio")}>
		<span {@attach icon('circle-off')}></span>
		No models found
	</div>
{/snippet}

{#await listModels()}
		<div class="connecting" {@attach tooltip('Looking for LM Studio...')}>
			<span {@attach icon("loader")}></span>
			Connecting...
		</div>
{:then models}
	{#if models?.length}
		<select bind:value={settings.lastUsedModel}> 
			{#each models as model}
				<option value={model.id}>{formatModelName(model.id)}</option>
			{/each}
		</select>
	{:else}
		{@render error()}
	{/if}
{:catch}
		{@render error()}
{/await}


<style>
	select {
		appearance: base-select;
		padding: unset;
		height: unset;
		padding: var(--size-4-2);
		background: var(--interactive-normal);
		box-shadow: none;
		border: var(--border-width) solid var(--color-black);
	}

	select:hover {
		background: var(--interactive-hover);
	}

	span, .connecting, .error {
		display: flex;
		align-items: center;
		align-self: flex-end;
	}

	.connecting,.error {
		gap: var(--size-4-1);
		color: var(--text-faint);
		font-size: var(--font-smaller);
	}
	
	.error {
		color: var(--text-error);
		opacity: .8;
	}

	.connecting :global(svg) {
		animation: spin 2s linear infinite;
	}
</style>
