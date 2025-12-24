<script lang="ts">
	import {
		DEFAULT_SERVER_URL,
		MODELS_ENDPOINT,
		type PluginSettings,
	} from "src/settings.svelte";
	import { requestUrl } from "obsidian";
	import { icon } from "./Icon.svelte";

	let {
		settings,
		onClose,
		onSubmit,
	}: {
		settings: PluginSettings;
		onClose: () => void;
		onSubmit: (result: any) => void;
	} = $props();

	type ServerConnection = {
		name: string;
		url: string;
		status: "pending" | "ok" | "error";
		isDefault: boolean;
	};

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

	let showAdditional = $state(servers.length > 1);

	async function healthcheck(server: ServerConnection) {
		console.log("hc ", server.url);
		server.status = "pending";
		let status = false;
		try {
			const resp = await requestUrl(server.url + MODELS_ENDPOINT);
			console.log(resp.status);
			status = resp.status == 200 ? true : false; //might return 200 when not ok tho.
		} catch (e) {
			console.log(e);
		}

		server.status = status ? "ok" : "error";
	}

	const debounce = (callback: (...args: any[]) => void, wait: number) => {
		let timeoutId: NodeJS.Timeout | undefined;
		return (...args: any[]) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				callback(...args);
			}, wait);
		};
	};
	//TODO: test when we have more than 1 server
	// this would be shared amongst each server right? unless have child components or an array.
	const debouncedHealthCheck = debounce(healthcheck, 1000);
</script>

<div class="instructions">
	{#if servers.length == 1}
		Override the default server URL or add additional servers below.
	{/if}
</div>

<div class="servers">
	{#each servers as server}
		<div class="server">
			{server.name}
			<div>
				{#if server.status === "pending"}
					<span {@attach icon("loader")}></span>
				{:else}
					<span
						{@attach icon(
							server.status === "ok"
								? "circle-check"
								: "circle-off",
						)}
					></span>
				{/if}
				<input
					type="text"
					bind:value={server.url}
					oninput={() => {
						server.status = "pending";
						debouncedHealthCheck(server);
					}}
					placeholder={server.isDefault
						? DEFAULT_SERVER_URL
						: "Example: https://0.0.0.0:1234"}
				/>
			</div>
		</div>
	{/each}
</div>

<div class="modal-buttons">
	<button class="cta" onclick={onSubmit}>Save</button>
	<button onclick={onClose}>Cancel</button>
</div>

<style>
	.instructions {
		padding-bottom: 2em;
	}

	.servers {
		display: flex;
		flex-direction: column;
	}
	.server,
	.server > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-4-2);
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
	/**/
	/* .controls:not(.showAdditional) { */
	/* 	display: none; */
	/* } */

	.modal-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
	.modal-buttons button.cta {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
	}
	.modal-buttons button.cta:hover {
		background: var(--interactive-accent-hover);
		color: var(--text-on-accent-hover);
	}

	.modal-buttons,
	.modal-buttons :global(.settings) {
		border-top: none;
		margin-top: 2.5em;
		margin-bottom: 0;
		padding-bottom: 0;
	}
</style>
