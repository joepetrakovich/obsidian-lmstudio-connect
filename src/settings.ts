import { App, PluginSettingTab, Setting } from "obsidian";
import type LMStudioConnectPlugin from "./main";

export interface PluginSettings {
	baseURL: string;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	baseURL: 'http://localhost:1234/v1'
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
						await this.plugin.saveSettings();
					})
			);
	}
}
