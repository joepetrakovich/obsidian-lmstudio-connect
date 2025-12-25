<script lang="ts">
	import {
		DEFAULT_SERVER_URL,
		MODELS_ENDPOINT,
		type PluginSettings,
	} from "src/settings.svelte";
	import { requestUrl } from "obsidian";
	import { icon } from "./Icon.svelte";
	import { tooltip } from "./Tooltip.svelte";
	import { onDestroy, tick } from "svelte";
	import type { ServerConnection } from "src/services/models";

	let { settings, onClose, onSubmit }: 
		{ settings: PluginSettings; onClose: () => void; onSubmit: (result: ServerConnection[]) => void; } 
		= $props();


	let servers: ServerConnection[] = $state(
		$state.snapshot(settings.servers).map((s) => {
			return {
				name: s.name,
				url: s.url,
				status: "pending",
				isDefault: s.name === "default",
			};
		}),
	);

	servers.forEach(healthcheck);

	let addControlsVisible = $state(false);
	let additionalServerName = $state("");
	let additionalServerURL = $state("");

	let form: HTMLFormElement;
	let additionalServerNameInput: HTMLInputElement;

	async function showAddControls() {
		addControlsVisible = true;
		await tick();
		additionalServerNameInput.focus();
	}

	function addServer(event: Event) {
		if (!form.checkValidity()) return;
		event.preventDefault();

		servers.push({
			name: additionalServerName,
			url: additionalServerURL,
			status: "pending",
			isDefault: false,
		});

		healthcheck(servers.last()!);

		form.reset();
		additionalServerNameInput.focus();
	}

	function removeServer(server: ServerConnection) {
		servers.remove(server);
		additionalServerNameInput.focus();
	}

	async function healthcheck(server: ServerConnection) {
		server.status = "pending";
		let status = false;
		try {
			const resp = await requestUrl(server.url + MODELS_ENDPOINT);
			status = resp.status == 200 ? true : false; //might return 200 when not ok tho.
		} catch (e) {
			console.log(e);
		}

		server.status = status ? "ok" : "error";
	}

	const debounce = (callback: (...args: any[]) => void, wait: number) => {
		let timeoutId: NodeJS.Timeout | undefined;
		const func = (...args: any[]) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				callback(...args);
			}, wait);
		};
		func.cancel = () => { clearTimeout(timeoutId); }

		return func;
	};

	const debouncedHealthCheck = debounce(healthcheck, 1000);

	onDestroy(() => { debouncedHealthCheck.cancel() });
</script>

<div class={[addControlsVisible && "add-controls-visible"]}>
	<div class="instructions">
		Override the default server URL or add additional servers below.
	</div>

	<!-- svelte-ignore a11y_consider_explicit_label -->
	<div class={["servers", servers.length > 1 && "many"]}>
		{#each servers as server}
			<div class={["server", server.isDefault && "default"]}>
				<span class="name">{server.name}</span>
				<div>
					{#if server.status === "pending"}
						<button
							class="clickable-icon"
							onclick={() => healthcheck(server)}
							{@attach icon("loader")}
						></button>
					{:else}
						<button
							class="clickable-icon"
							onclick={() => healthcheck(server)}
							{@attach tooltip(
								server.status === "ok"
									? "LM Studio is detected at this URL."
									: "LM Studio not found.  Is CORS enabled?",
							)}
							{@attach icon(
								server.status === "ok"
									? "circle-check"
									: "circle-off",
							)}
						>
						</button>
					{/if}
					<input
						type="text"
						bind:value={server.url}
						oninput={() => {
							server.status = "pending";
							debouncedHealthCheck(server);
						}}
						size="22"
						placeholder={server.isDefault
							? DEFAULT_SERVER_URL
							: "Example: https://0.0.0.0:1234"}
					/>
					<button
						disabled={server.isDefault}
						class="remove clickable-icon"
						onclick={() => removeServer(server)}
						{@attach icon("x")}
						{@attach tooltip("Delete")}
					></button>
				</div>
			</div>
		{/each}

		<div class="add-controls">
			Server
			<form bind:this={form} onsubmit={addServer}>
				<input
					type="text"
					bind:this={additionalServerNameInput}
					bind:value={additionalServerName}
					size="15"
					required
					placeholder="Display Name"
				/>
				<input
					type="text"
					bind:value={additionalServerURL}
					size="22"
					required
					placeholder="URL"
				/>
				<button onclick={addServer}>Add</button>
			</form>
		</div>
	</div>

	<div class="modal-buttons">
		<button class="add-additional" onclick={showAddControls}>
			Add additional servers
		</button>
		<div>
			<button class="cta" onclick={() => onSubmit($state.snapshot(servers))}>Save</button>
			<button onclick={onClose}>Cancel</button>
		</div>
	</div>
</div>

<style>
	.instructions {
		padding-bottom: 2em;
	}

	.servers {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}
	.server,
	.server > div,
	.add-controls-visible .add-controls,
	.add-controls-visible .add-controls > form {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-4-2);
	}
	.server.default button.remove {
		display: none;
	}
	.server.default .name {
		color: var(--text-faint);
	}
	.many .server.default button.remove {
		display: inline-block;
		visibility: hidden;
	}

	.add-controls {
		display: none;
		border-top: 1px solid var(--background-modifier-border);
		padding-top: var(--size-4-2);
	}

	.server :global(svg.lucide-loader) {
		animation: spin 2s linear infinite;
	}

	.servers :global(svg.lucide-circle-off) {
		color: var(--text-error);
	}

	.servers :global(svg.lucide-circle-check) {
		color: var(--text-success);
	}

	.modal-buttons,
	.modal-buttons > div {
		display: flex;
		gap: var(--size-4-2);
	}
	.modal-buttons {
		justify-content: space-between;
	}
	.modal-buttons > div button.cta {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
	}
	.modal-buttons > div button.cta:hover {
		background: var(--interactive-accent-hover);
		color: var(--text-on-accent-hover);
	}

	.modal-buttons,
	.modal-buttons :global(.settings) {
		border-top: none;
		margin-top: 2.25em;
		margin-bottom: 0;
		padding-bottom: 0;
	}
	button.add-additional {
		display: inline;
		background: none;
		box-shadow: none;
		align-self: flex-start;
		color: var(--link-color);
		padding: var(--size-2-2) 0;
		text-decoration: var(--link-decoration);
	}
	button.add-additional:hover {
		color: var(--link-color-hover);
		cursor: var(--cursor-link);
	}
	.add-controls-visible button.add-additional {
		visibility: hidden;
	}
</style>
