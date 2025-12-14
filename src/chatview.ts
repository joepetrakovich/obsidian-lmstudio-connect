import { ItemView, WorkspaceLeaf } from 'obsidian';
import ChatContainer from './components/ChatContainer.svelte';
import { mount, unmount } from 'svelte';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
	counter: ReturnType<typeof ChatContainer> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText() {
		return 'Chat view';
	}

	async onOpen() {
		this.counter = mount(ChatContainer, {
			target: this.contentEl,
		});
	}

	async onClose() {
		if (this.counter) {
			unmount(this.counter);
		}
	}
}
