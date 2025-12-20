import { setTooltip, type TooltipOptions } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export function tooltip(tooltip: string, options?: TooltipOptions): Attachment {
	return (element) => {
		setTooltip(element as HTMLElement, tooltip, options);
	};
}
