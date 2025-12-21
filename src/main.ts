import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ChatView, VIEW_TYPE_CHAT } from './chatview';
import { SettingsTab, type PluginSettings, createSettings } from './settings.svelte';

export default class LMStudioConnectPlugin extends Plugin {
	settings: PluginSettings;
	unloadSettings: () => void;
	
	async onload() {
		console.log("onload LMStudioConnectPlugin");

		const { settings, dispose } = await createSettings({
			save: this.saveData.bind(this),
			load: this.loadData.bind(this)
		});
		this.settings = settings!;
		this.unloadSettings = dispose;

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
		this.unloadSettings();
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
}
