<script lang="ts">
	import { listModels } from "../services/llm";
	let { value = $bindable() } = $props();
</script>

{#await listModels()}
	<p>waiting for the promise to resolve...</p>
{:then models}
	<select bind:value>
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
