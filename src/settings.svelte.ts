import { App, PluginSettingTab, Modal, Setting } from "obsidian";
import type LMStudioConnectPlugin from "./main";
import ServerSettingsComponent from "./components/ServerSettingsModal.svelte";
import { mount, unmount, untrack } from "svelte";

export interface PluginSettings {
	servers: LMStudioServer[];
}

export interface LMStudioServer {
	name: string;
	url: string;
	lastUsedModel: string
}


export const DEFAULT_SERVER_URL = 'http://127.0.0.1:1234';
export const MODELS_ENDPOINT = '/v1/models'; 

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	servers: [{ name: 'default', url: DEFAULT_SERVER_URL, lastUsedModel: '' }]
}

type PersistenceConfig = { save: (data: any) => Promise<void>, load: () => Promise<any> };

// Creates settings that auto-persist when modified using a provided save function.
export async function createSettings(persistence: PersistenceConfig) {
	let settings: PluginSettings = $state(Object.assign(DEFAULT_SETTINGS));
	let guardedSettings: PluginSettings = $derived.by(() => {
		let saved = Object.assign({}, settings);
		if (saved.servers.length === 0) {
			DEFAULT_SETTINGS.servers?.forEach(ds => saved.servers.push(ds));
		}

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
					console.log('auto-save');
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
						(result) => { console.log("res: ", result); }).open();
				})
			);
	}
}

export class LMStudioServerSettingsModal extends Modal {
	settingsComponent: ReturnType<typeof ServerSettingsComponent> | undefined;

	constructor(app: App, settings: PluginSettings, onSubmit: (result: string) => void) {
		super(app);
		this.setTitle('LM Studio Servers');
		this.settingsComponent = mount(ServerSettingsComponent, {
			target: this.contentEl,
			props: { 
				settings, 
				onClose: () => this.close(), 
				onSubmit: (result: string) => { 
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
