<script lang="ts">
	import type { ModelInfo } from "../services/models";
	import { getPluginContext } from "src/services/context";
	import { DEFAULT_SERVER_NAME, type LMStudioServer } from "src/services/settings.svelte";
	import { tooltip } from "./Tooltip.svelte";
	import { icon } from "./Icon.svelte";
	import { t } from "src/i18n";

	const plugin = getPluginContext();
	const modelStore = plugin.modelStore;

	let select: HTMLSelectElement | undefined = $state();

	// Model names are usually formatted like 'company/model' so truncate company if it exists.
	function formatModelName(name: string) {
		const parts = name.split("/");
		return parts.length > 1
			? name.substring(parts[0].length + 1)
			: parts[0];
	}

	function toSelectOptionValue(server: LMStudioServer) {
		return JSON.stringify({
			server: server.name,
			model: server.lastUsedModel,
		});
	}

	let value: string | undefined = $state(
		modelStore.currentServer 
		? toSelectOptionValue(modelStore.currentServer) 
		: undefined,
	);

	function onchange() {
		if (value) {
			const key = JSON.parse(value) as { server: string; model: string };
			modelStore.setCurrentModel(key.server, key.model);
		}
	}
</script>

{#snippet error()}
	<div class="error" {@attach tooltip(t("modelPicker.verifySettings"))}>
		<span {@attach icon("circle-off")}></span>
		{t("modelPicker.noModelsFound")}
	</div>
{/snippet}

{#snippet modelOptions(server: LMStudioServer, models: ModelInfo[])}
	{#each models as model}
		<option
			value={JSON.stringify({ server: server.name, model: model.id })}
		>
			{model.id}
		</option>
	{/each}
{/snippet}

{#await modelStore.listModelsFromAllServers()}
	<div class="connecting" {@attach tooltip(t("modelPicker.lookingForServer"))}>
		<span {@attach icon("loader")}></span>
		{t("modelPicker.connecting")}
	</div>
{:then modelsByServer}
	{#if modelsByServer.every((s) => s.models.length === 0)}
		{@render error()}
	{:else}
		{@const multiserver = modelsByServer.length > 1}
		<div class="custom-dropdown">
			<select tabindex="-1" bind:this={select} bind:value {onchange}>
				{#each modelsByServer as { server, connected, models }}
					{@const name =
							server.name === DEFAULT_SERVER_NAME
								? t("serverModal.default")
								: server.name}
					{#if multiserver}
						<optgroup
							label={name +
								(!connected
									? ` (${t("serverModal.disconnected")})`
									: "")}
							disabled={!connected}
						>
							{@render modelOptions(server, models)}
						</optgroup>
					{:else}
						{@render modelOptions(server, models)}
					{/if}
				{/each}
			</select>
			<button
				onclick={() => {
					if (select?.showPicker) {
						select.focus();
						select.showPicker();
					} else {
						select?.focus();
					}
				}}
			>
				<div class="text">
					<span>
						{modelStore.currentModel
							? formatModelName(modelStore.currentModel)
							: t("modelPicker.chooseModel")}
					</span>
				</div>
				<span class="icon" {@attach icon("chevrons-up-down")}></span>
			</button>
		</div>
	{/if}
{:catch}
	{@render error()}
{/await}

<style>
	.custom-dropdown {
		display: flex;
		flex: 1;
		min-width: 0;
	}

	.custom-dropdown button {
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
	.custom-dropdown button:focus {
		background-color: var(--background-modifier-border-focus);
	}

	.custom-dropdown div.text {
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
		appearance: none;
		padding: unset;
		height: 1px;
		background: var(--interactive-normal);
		box-shadow: none;
		border: var(--border-width) solid var(--color-black);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 1px;
	}

	select:hover {
		background: var(--interactive-hover);
	}

	.connecting,
	.error {
		display: flex;
		align-items: center;
		align-self: flex-end;
	}

	.connecting span,
	.error span {
		display: flex;
		align-items: center;
	}

	.connecting,
	.error {
		gap: var(--size-4-1);
		color: var(--text-faint);
		font-size: var(--font-smaller);
	}

	.error {
		color: var(--text-error);
		opacity: 0.8;
	}

	.connecting :global(svg) {
		animation: spin 2s linear infinite;
	}
</style>
