import { ItemView, WorkspaceLeaf } from 'obsidian';
import ChatRoot from './components/ChatRoot.svelte';
import { mount, unmount } from 'svelte';
import type LMStudioConnectPlugin from './main';
import { t } from './i18n';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
	plugin: LMStudioConnectPlugin;
	chatRoot: ReturnType<typeof ChatRoot> | undefined;

	constructor(leaf: WorkspaceLeaf, plugin: LMStudioConnectPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText() {
		return t('plugin.name')
	}

	getIcon(): string {
		return 'bot-message-square';
	}

	async onOpen() {
		this.chatRoot = mount(ChatRoot, {
			target: this.contentEl,
			props: { plugin: this.plugin }
		});
		await Promise.resolve();
	}

	async onClose() {
		if (this.chatRoot) {
			await unmount(this.chatRoot);
		}
	}
}
