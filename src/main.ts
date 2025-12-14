import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ChatView, VIEW_TYPE_CHAT } from './chatview';

export default class LMStudioConnectPlugin extends Plugin {

	async onload() {
		console.log("onload LMStudioConnectPlugin");
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf)
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
}
