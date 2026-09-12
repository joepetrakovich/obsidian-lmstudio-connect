import { ItemView, WorkspaceLeaf } from 'obsidian';
import ChatContainer from './components/ChatContainer.svelte';
import { mount, unmount } from 'svelte';
import type LMStudioConnectPlugin from './main';
import { t } from './i18n';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
	plugin: LMStudioConnectPlugin;
	chatContainer: ReturnType<typeof ChatContainer> | undefined;

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
		this.chatContainer = mount(ChatContainer, {
			target: this.contentEl,
			props: { plugin: this.plugin }
		});
		await Promise.resolve();
	}

	async onClose() {
		if (this.chatContainer) {
			await unmount(this.chatContainer);
		}
	}
}
