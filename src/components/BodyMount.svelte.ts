import type { Attachment } from 'svelte/attachments';

export function bodyMount(): Attachment {
	return (element) => {
		element.ownerDocument.body.appendChild(element);

		return () => {
			element.remove();
		};
	}
}
