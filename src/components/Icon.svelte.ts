import { setIcon } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export function icon(name: string): Attachment {
	return (element) => {
		setIcon(element as HTMLElement, name);
	};
}
