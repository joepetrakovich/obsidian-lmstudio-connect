<script lang="ts">
	import { requestUrl } from "obsidian";
	import type { ModelInfo } from "../services/models";

	let { baseURL, model: value = $bindable() } = $props();

	let listModels = $derived(async () => {
		return await requestUrl(`${baseURL}/models`).then((response) => {
			const { data } = response.json as { data: ModelInfo[] };
			return data;
		});
	});
</script>

{#await listModels()}
	<p>waiting for the promise to resolve...</p>
{:then models}
	<select bind:value> 
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
