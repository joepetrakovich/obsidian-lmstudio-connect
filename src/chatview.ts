import { ItemView, WorkspaceLeaf } from 'obsidian';
import ChatContainer from './components/ChatContainer.svelte';
import { mount, unmount } from 'svelte';
import type LMStudioConnectPlugin from './main';
import { lmstudio } from './services/llm.svelte';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
	plugin: LMStudioConnectPlugin;
	chatContainer: ReturnType<typeof ChatContainer> | undefined;

	constructor(leaf: WorkspaceLeaf, plugin: LMStudioConnectPlugin) {
		super(leaf);
		this.plugin = plugin;

		// TODO: have a more gaurded singleton that ensures initialization and updates w/ settings.
		lmstudio.setBaseURL(this.plugin.settings.baseURL);
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
		});
	}

	async onClose() {
		if (this.chatContainer) {
			unmount(this.chatContainer);
		}
	}
}
