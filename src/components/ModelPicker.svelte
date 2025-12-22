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
	
	let select: HTMLSelectElement;

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
		<div class="custom-dropdown">
			<button onclick={() => select.showPicker()}>
				<span class="text">{formatModelName(settings.lastUsedModel)}</span>
				<span class="icon" {@attach icon('chevrons-up-down')}></span>
			</button>
			<select bind:this={select} bind:value={settings.lastUsedModel}> 
				{#each models as model}
					<option>{model.id}</option>
				{/each}
			</select>
		</div>
	{:else}
		{@render error()}
	{/if}
{:catch}
		{@render error()}
{/await}


<style>
	.custom-dropdown {
		display: flex;
		position: relative;
		flex: 1;
	}

	.custom-dropdown button {
		position: absolute;	
		top: 0;
		left: 0;
		display: flex;
		gap: var(--size-4-1); 
		max-width: 100%;
		box-shadow: none;
		color: var(--text-muted);
		background-color: var(--dropdown-background);
	}

	.custom-dropdown button:hover {
		background-color: var(--dropdown-background-hover);
	}

	.custom-dropdown span.text {
		max-width: 130px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.custom-dropdown span.icon {
		display: flex;
		align-items: center;
		height: var(--icon-s);
		width: var(--icon-s);
	}

	select {	
		visibility:hidden; 
		appearance: none;
		padding: unset;
		height:0;	
		/* height: unset; */
		padding: var(--size-4-2);
		background: var(--interactive-normal);
		box-shadow: none;
		border: var(--border-width) solid var(--color-black);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 110px;
	}

	select:hover {
		background: var(--interactive-hover);
	}

	.connecting, .error {
		display: flex;
		align-items: center;
		align-self: flex-end;
	}

	.connecting span,
	.error span {
		display: flex;
		align-items: center;
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
