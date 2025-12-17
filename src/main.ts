import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ChatView, VIEW_TYPE_CHAT } from './chatview';
import { DEFAULT_SETTINGS, SettingsTab, type PluginSettings, createSettings } from './settings.svelte';

export default class LMStudioConnectPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		console.log("onload LMStudioConnectPlugin");
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf, this)
		);

		this.addRibbonIcon('bot-message-square', 'LMStudio Chat', () => {
			this.activateView()
		});
	}

	async onunload() {
		console.log("unload LMStudioConnectPlugin");
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_CHAT, active: true });
		}

		workspace.revealLeaf(leaf)
	}

	async loadSettings() {
		this.settings = createSettings();
		Object.assign(this.settings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
