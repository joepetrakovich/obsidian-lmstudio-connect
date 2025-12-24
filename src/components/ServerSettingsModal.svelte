<script lang="ts">
	import {
		DEFAULT_SERVER_URL,
		MODELS_ENDPOINT,
		type LMStudioServer,
		type PluginSettings,
	} from "src/settings.svelte";
	import { ExtraButtonComponent, requestUrl, Setting } from "obsidian";
	import { onMount } from "svelte";
	import type { ModelInfo } from "src/services/models";

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
		isConnected: boolean;
		isDefault: boolean;
	};

	let servers: ServerConnection[] = $state(
		$state.snapshot(settings.servers).map((s) => {
			return {
				name: s.name,
				url: s.url,
				isConnected: false,
				isDefault: s.name === "default",
			};
		}),
	);

	let showAdditional = $state(servers.length > 1);

	let serversDiv: HTMLDivElement;
	let controlsDiv: HTMLDivElement;
	let modalButtonsDiv: HTMLDivElement;

	// NOTE: an attempt to stay within the confines of Obsidian's Settings SDK while benefiting from
	// a modicum of Svelte reactivity... May scrap it and go full Svelte and just use Obsidian styles.
	// The hope is that we gain some cross-platform hooks.

	// destroy and recreate Obsidian Setting nodes whenever state changes.
	$effect(() => {
		servers.forEach((server, i) => {
			const serverSetting = new Setting(serversDiv)
				.setClass("server-item")
				.setName(server.name);
			let statusIcon: ExtraButtonComponent | undefined;
			let timeoutId: NodeJS.Timeout | undefined;

			if (server.isDefault) {
				//TODO: can I filter it out rather than use if?
				serverSetting
					.addExtraButton((btn) => {
						statusIcon = btn;
						btn.setIcon(
							server.isConnected ? "circle-check" : "circle-off",
						),
							healthcheck(server.url).then((ok) => {
								btn.setIcon(ok ? "circle-check" : "circle-off");
							});
					})
					.addText((text) => {
						text.setPlaceholder(DEFAULT_SERVER_URL).onChange(
							async (value) => {
								server.url = value;
								clearTimeout(timeoutId);
								timeoutId = setTimeout(async () => {
									const ok = await healthcheck(server.url);
									console.log("checked ", server.url);
									statusIcon?.setIcon(
										ok ? "circle-check" : "circle-off",
									);
								}, 400);

								console.log("default url change: ", value);
							},
						);
						if (server.url.toLowerCase() !== DEFAULT_SERVER_URL) {
							text.setValue(server.url);
						}
					});
			} else {
				serverSetting.addExtraButton((btn) =>
					btn.setIcon("x").onClick(() => {
						servers.splice(i, 1);
					}),
				);
			}
		});

		return () => {
			serversDiv.empty();
		};
	});

	onMount(() => {
		new Setting(controlsDiv); //for spacer
		new Setting(controlsDiv)
			.setName("Server")
			.addText(
				(text) => text.setPlaceholder("Display Name"),
				// .setValue(this.plugin.settings.baseURL)
				// .onChange(async (value) => {
				// 	this.plugin.settings.baseURL = value;
				// })
			)
			.addText(
				(text) => text.setPlaceholder("http://localhost:1234"),
				// .setValue(this.plugin.settings.baseURL)
				// .onChange(async (value) => {
				// 	this.plugin.settings.baseURL = value;
				// })
			)
			.addButton((button) =>
				button.setButtonText("Add").onClick(() => {}),
			);

		new Setting(modalButtonsDiv)
			.setClass("settings")
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						onSubmit("todo, hi from component");
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					onClose();
				}),
			);
	});

	async function healthcheck(url: string) {
		let status = false;
		try {
			const resp = await requestUrl(url + MODELS_ENDPOINT);
			console.log(resp.status);
			status = resp.status == 200 ? true : false; //might return 200 when not ok tho.
		} catch (e) {
			console.log(e);
		}

		return status;
	}
</script>

<div class="instructions">
	{#if servers.length == 1}
		Override the default server URL or add additional servers below.
	{/if}
</div>
<div class="servers" bind:this={serversDiv}></div>
<div class={["controls", showAdditional]} bind:this={controlsDiv}></div>
<div class="modal-buttons" bind:this={modalButtonsDiv}></div>

<style>
	.instructions {
		padding-bottom: 2em;
	}

	.servers :global(.server-item) {
		padding-bottom: 0;
	}

	.servers :global(svg.lucide-circle-off) {
		color: var(--text-error);
	}

	.servers :global(svg.lucide-circle-check) {
		color: var(--text-success);
	}

	.controls:not(.showAdditional) {
		display: none;
	}

	.modal-buttons,
	.modal-buttons :global(.settings) {
		border-top: none;
		margin-top: 2.5em;
		margin-bottom: 0;
		padding-bottom: 0;
	}
</style>
