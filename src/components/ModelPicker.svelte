<script lang="ts">
	import { lmstudio } from "src/services/llm.svelte";
	import type { ModelInfo } from "src/services/models";

	let value: ModelInfo | undefined = $state();
</script>

{#await lmstudio.listModels() }
	<p>waiting for the promise to resolve...</p>
{:then models}
	<select bind:value onchange={() => value && lmstudio.setModelId(value.id)}>
		{#each models as model}
			<option value={model}>
				{model.id}
			</option>
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
