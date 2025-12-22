<script lang="ts">
	import { requestUrl } from "obsidian";
	import type { ModelInfo } from "../services/models";
	import { getPluginContext } from "src/services/context";
	import type { PluginSettings } from "src/settings.svelte";
	import type LMStudioConnectPlugin from "src/main";

	const plugin: LMStudioConnectPlugin = getPluginContext();
	const settings: PluginSettings = plugin.settings;
	
	let listModels = $derived(async () => {
		return await requestUrl(`${settings.baseURL}/models`).then((response) => {
			const { data } = response.json as { data: ModelInfo[] };
			return data;
		});
	});
</script>

{#await listModels()}
	<p>waiting for the promise to resolve...</p>
{:then models}
	<select bind:value={settings.lastUsedModel}> 
		{#each models as model}
			<option>{model.id}</option>
		{/each}
	</select>
{:catch error}
	<p>Something went wrong: {error.message}</p>
{/await}

<style>
	select {
		max-width: 110px;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
