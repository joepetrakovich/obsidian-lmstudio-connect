import { ItemView, WorkspaceLeaf } from 'obsidian';
import ChatContainer from './components/ChatContainer.svelte';
import { mount, unmount } from 'svelte';
import type LMStudioConnectPlugin from './main';

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
		return 'Chat view';
	}

	async onOpen() {
		this.chatContainer = mount(ChatContainer, {
			target: this.contentEl,
			props: { plugin: this.plugin }
		});
	}

	async onClose() {
		if (this.chatContainer) {
			unmount(this.chatContainer);
		}
	}
}
