import { App, PluginSettingTab, Modal, Setting } from "obsidian";
import type LMStudioConnectPlugin from "./main";
import ServerSettingsComponent from "./components/ServerSettingsModal.svelte";
import { mount, unmount, untrack } from "svelte";
import type { ServerConnection } from "./services/models";

export interface PluginSettings {
	lastUsedServer: string;
	servers: LMStudioServer[];
}

export interface LMStudioServer {
	name: string;
	url: string;
	lastUsedModel: string
}

export const MODELS_ENDPOINT = '/v1/models';
export const toV1BaseURL = (url: string) => url + '/v1';
export const currentServer = (settings: PluginSettings) => settings.servers.find(s => s.name === settings.lastUsedServer);
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:1234';
const DEFAULT_SERVER: LMStudioServer = { name: 'default', url: DEFAULT_SERVER_URL, lastUsedModel: '' };
const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	lastUsedServer: DEFAULT_SERVER.name,
	servers: [DEFAULT_SERVER]
}

type PersistenceConfig = { save: (data: any) => Promise<void>, load: () => Promise<any> };

// Creates settings that auto-persist when modified using a provided save function.
export async function createSettings(persistence: PersistenceConfig) {
	let settings: PluginSettings = $state(Object.assign(DEFAULT_SETTINGS));
	// ensure proper url format and that default server isn't removed
	let guardedSettings: PluginSettings = $derived.by(() => {
		let saved = Object.assign({}, settings);

		const defaultServer = saved.servers.find(s => s.name === 'default');
		if (defaultServer) {
			if (defaultServer.url.trim() === '') {
				defaultServer.url = DEFAULT_SERVER_URL;
			}
		} else {
			saved.servers.push(DEFAULT_SERVER);
		}
		
		// remove whitespace and trailing slashes
		saved.servers.forEach(s => s.url = s.url.trim().replace(/\/+$/, ''));

		return saved;
	});
	let destroy: () => void | undefined;

	await persistence
		.load()
		.then(initial => {
			settings = Object.assign({}, DEFAULT_SETTINGS, initial);
			destroy = $effect.root(() => {
				$effect(() => {
					persistence.save(guardedSettings);
					console.log('settings auto-saved');
					untrack(() => {
						Object.assign(settings, guardedSettings);
					})
				});
			});
		});

	const dispose = () => {
		if (destroy) {
			destroy();
		}
	}

	return { settings, dispose }
}

export class SettingsTab extends PluginSettingTab {
	plugin: LMStudioConnectPlugin;

	constructor(app: App, plugin: LMStudioConnectPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('LM Studio Server')
			.setDesc('Configure the connection to one or more LM Studio servers.')
			.addButton(button => button
				.setButtonText('Manage')
				.onClick(() => {
					new LMStudioServerSettingsModal(
						this.app,
						this.plugin.settings,
						(servers: ServerConnection[]) => {
							const current = this.plugin.settings.servers;

							//NOTE: To keep with current [save/cancel] modal ux in Obsidian
							//we'll save changes with a manual diff rather than editing in place. 
							servers.forEach(s => {
								const existing = current.find(c => c.name === s.name);
								if (existing) {
									existing.url = s.url;
									return;
								}

								current.push({ name: s.name, url: s.url, lastUsedModel: '' });
							});

							current.filter(c => !servers.find(s => s.name === c.name))
								.forEach(f => current.remove(f));
						}
					).open();
				})
			);
	}
}

export class LMStudioServerSettingsModal extends Modal {
	settingsComponent: ReturnType<typeof ServerSettingsComponent> | undefined;

	constructor(app: App, settings: PluginSettings, onSubmit: (result: ServerConnection[]) => void) {
		super(app);
		this.setTitle('LM Studio Server');
		this.settingsComponent = mount(ServerSettingsComponent, {
			target: this.contentEl,
			props: {
				settings,
				onClose: () => this.close(),
				onSubmit: (result: ServerConnection[]) => {
					this.close();
					onSubmit(result);
				}
			}
		});
	}

	onClose() {
		if (this.settingsComponent) {
			unmount(this.settingsComponent);
			console.log("unmounted");
		}
	}
}
