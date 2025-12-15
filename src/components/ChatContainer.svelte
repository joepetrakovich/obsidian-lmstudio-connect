<script>
	import ModelPicker from "./ModelPicker.svelte";
</script>

<div class="container">
	<small>placeholder header</small>
	<div class="chatbox">
		<input type="text" />
		<div class="toolbar">
			<div>
				<ModelPicker />
			</div>
			<button>send</button>
		</div>
	</div>
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

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
</style>
