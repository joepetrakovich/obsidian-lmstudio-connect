import { App, PluginSettingTab, Setting } from "obsidian";
import type LMStudioConnectPlugin from "./main";

export interface PluginSettings {
	baseURL: string;
	lastUsedModel: string
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	baseURL: 'http://localhost:1234/v1'
}

type PersistenceConfig = { save: (data: any) => Promise<void>, load: () => Promise<any> }; 

// Creates settings that auto-persist when modified using a provided save function.
export async function createSettings(persistence: PersistenceConfig) {
	let settings: PluginSettings = $state(Object.assign(DEFAULT_SETTINGS));
	let destroy: () => void | undefined;

	await persistence
		.load()
		.then(initial => {
			settings = Object.assign({}, DEFAULT_SETTINGS, initial);
			destroy = $effect.root(() => {
				$effect(() => {
					persistence.save(settings);
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
			.setName('Base URL')
			.setDesc('The base URL for your LM Studio instance.')
			.addText((text) =>
				text
					.setPlaceholder('http://localhost:1234/v1')
					.setValue(this.plugin.settings.baseURL)
					.onChange(async (value) => {
						this.plugin.settings.baseURL = value;
					})
			);
	}
}
