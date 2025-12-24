import { setIcon } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export function icon(name: string): Attachment {
	return (element) => {
		element.addClass('lmsc-icon');
		setIcon(element as HTMLElement, name);
	};
}
