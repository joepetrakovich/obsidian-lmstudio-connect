import { ItemView, WorkspaceLeaf } from 'obsidian';
import Counter from './components/Counter.svelte';
import { mount, unmount } from 'svelte';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
	counter: ReturnType<typeof Counter> | undefined;

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
		this.counter = mount(Counter, {
			target: this.contentEl,
		});
	}

	async onClose() {
		if (this.counter) {
			unmount(this.counter);
		}
	}
}
