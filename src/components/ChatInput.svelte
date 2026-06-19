<script lang="ts">
	import { EditorView, minimalSetup } from "codemirror";
	import { placeholder, ViewUpdate } from "@codemirror/view";
	import { icon } from "./Icon.svelte";
	import ModelPicker from "./ModelPicker.svelte";
	import { onDestroy, onMount } from "svelte";
	import FileSuggest from "./FileSuggest.svelte";
	import { fileRefHighlighter } from "./codemirror/filerefhighlighter";
	import { cursorWithinFileRef } from "./codemirror/cursorwithinfileref";
	import {
		addFileReference,
		fileReferenceField,
	} from "./codemirror/filerefwidget";
	import type { TFile } from "obsidian";
	import { tooltip } from "./Tooltip.svelte";
	import { type Replacement } from "src/services/models";
	import { t } from "src/i18n";
	import { chatViewActive } from "src/services/settings.svelte";
	import CancelButton from "./CancelButton.svelte";
	import SendButton from "./SendButton.svelte";

	let {
		onsend,
		onabort,
	}: {
		onsend: () => void;
		onabort: (() => void) | undefined;
	} = $props();

	$effect(() => {
		chatViewActive.watch;
		editor?.focus();
	});

	/**
	 * Returns text with file refs mentioned like [[filename.md]].
	 */
	export const text = async () => {
		const text = editor.state.doc.toString();
		const fileRefs = editor.state.field(fileReferenceField);
		if (!fileRefs.size) {
			return text;
		}

		//NOTE: if we go this route, codemirror can do this anyway cant it?
		//the inserfileref would insert and then replace it, then the above
		//toString would obviate this.

		//swap file ref markers for their actual note content
		let replacements: Replacement[] = [];
		for (let iter = fileRefs.iter(); iter.value; iter.next()) {
			const file: TFile = iter.value.spec.file;
			const inserted = `[[${file.path}]]`;
			replacements.push({
				from: iter.from,
				to: iter.to,
				value: inserted,
			});
		}

		return replaceByPosition(text, replacements);
	};

	export const contentHTML = () => {
		const div = document.createElement("div");
		div.className = editor.contentDOM.className;
		div.innerHTML = editor.contentDOM.innerHTML;
		const html = div.outerHTML;
		div.remove();

		return html;
	};

	function replaceByPosition(source: string, replacements: Replacement[]) {
		let parts = [];
		let cursor = 0;

		for (const item of replacements) {
			parts.push(source.slice(cursor, item.from));
			parts.push(item.value);
			cursor = item.to;
		}

		parts.push(source.slice(cursor));
		return parts.join("");
	}

	export function set(value: string) {
		const length = editor.state.doc.length;
		editor.dispatch({
			changes: [
				{ from: 0, to: length },
				{ from: 0, insert: value },
			],
		});
	}

	export function clear() {
		const length = editor.state.doc.length;
		editor.dispatch({ changes: [{ from: 0, to: length }] });
	}

	let chatbox: HTMLDivElement;
	let editorDiv: HTMLDivElement;
	let editor: EditorView;
	// svelte-ignore non_reactive_update
	let popoverRef: HTMLDivElement;
	let popoverRefOffset: { x: number; y: number } = $state({ x: 0, y: 0 });
	let fileSuggest: FileSuggest;
	let canSend = $state(false);

	function onkeydown(e: KeyboardEvent) {
		fileSuggest.dispatch(e);
		if (e.defaultPrevented) return;

		if (e.key == "Enter" && !e.shiftKey) {
			e.preventDefault();
			canSend && onsend();
		}
	}

	function addFileRef() {
		popoverRef.innerText = "[]"; //simulate same size box as match text
		const btn = chatbox.getElementsByClassName("addFileRef")[0];
		const pos = btn.getBoundingClientRect();
		const chatboxRect = chatbox.getBoundingClientRect();
		popoverRefOffset = {
			x: pos.left - chatboxRect.x,
			y: pos.top - chatboxRect.y,
		};
		fileSuggest.open("", true);
	}

	// insert file widget based on cursor position
	function onFileSelected(file: TFile) {
		const cursorFileRef = editor.state.field(cursorWithinFileRef);

		if (!cursorFileRef) {
			const cursorPos = editor.state.selection.main.head;
			editor.dispatch({
				changes: [{ from: cursorPos, insert: "0 " }],
				effects: [
					addFileReference.of({
						from: cursorPos,
						to: cursorPos + 1,
						file,
					}),
				],
				selection: { anchor: cursorPos + 2 },
			});
			editor.focus();
			return;
		}

		//TODO: may need to replace 0 with something I can regex match out with context or prompt;
		const { from, to } = cursorFileRef;
		editor.dispatch({
			changes: [{ from, to, insert: "0 " }],
			effects: [addFileReference.of({ from, to: from + 1, file })],
		});
	}

	onMount(() => {
		editor = new EditorView({
			doc: "",
			extensions: [
				placeholder(t("chat.placeholder")),
				fileRefHighlighter,
				cursorWithinFileRef,
				fileReferenceField,
				EditorView.lineWrapping,
				EditorView.updateListener.of((v: ViewUpdate) => {
					if (v.docChanged) {
						canSend = v.state.doc.length > 0;

						// //trigger popup if cursor within markdown ref brackets
						const cursorInRef = v.state.field(cursorWithinFileRef);
						if (cursorInRef) {
							const pos = v.view.coordsAtPos(
								cursorInRef.namePos,
							) || { left: 0, top: 0 };
							const chatboxRect = chatbox.getBoundingClientRect();
							popoverRefOffset = {
								x: pos.left - chatboxRect.x,
								y: pos.top - chatboxRect.y,
							};
							fileSuggest.open(cursorInRef.fileRefName);
						} else {
							fileSuggest.close();
						}
					}
				}),
				EditorView.domEventHandlers({
					keydown: (event) => onkeydown(event),
					blur: () => fileSuggest.close(),
				}),
				minimalSetup,
			],
			parent: editorDiv,
		});
	});

	onDestroy(() => editor?.destroy());
</script>

<div bind:this={chatbox} class="chatbox">
	<div bind:this={editorDiv} class="editor"></div>

	<div class="toolbar">
		<ModelPicker />
		<div class="right">
			<button
				class="addFileRef"
				onclick={addFileRef}
				{@attach icon("brackets")}
				{@attach tooltip(t("chat.addNoteReference"))}
				aria-label={t("chat.addNoteReference")}
			></button>
			{#if onabort}
				<CancelButton onclick={onabort} />	
			{:else}
				<SendButton onclick={onsend} disabled={!canSend} />
			{/if}
		</div>
	</div>

	<!-- dynamically position over the search term so file suggest pops up nearby. -->
	<div
		bind:this={popoverRef}
		style:left={popoverRefOffset.x + "px"}
		style:top={popoverRefOffset.y + "px"}
		class="popover-ref"
		aria-hidden="true"
	></div>
</div>

<FileSuggest bind:this={fileSuggest} {onFileSelected} positionEl={popoverRef} />

<style>
	.chatbox {
		position: relative;
		display: flex;
		flex-direction: column;
		border: var(--border-width) solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		padding: 0 var(--size-4-2) var(--size-4-2) var(--size-4-2);
	}

	:global(.theme-light) .chatbox {
		background: var(--background-primary-alt);
	}

	@container (min-width: 400px) {
		.chatbox {
			max-width: 80%;
			min-width: 400px;
			margin: 0 auto;
		}
	}

	.popover-ref {
		position: absolute;
		top: 0;
		left: 0;
		visibility: hidden;
		font-size: var(--font-ui-small);
		font-family: var(--font-interface);
		pointer-events: none;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		align-items: center;
		flex-wrap: wrap;
	}
	.toolbar .right {
		display: flex;
		gap: var(--size-2-2);
		align-items: center;
	}

	.editor {
		field-sizing: content;
		max-height: 10lh;
		overflow: auto;
		resize: none;
		border: none;
		background: transparent;
		padding: var(--size-4-1) 0;
	}
	.editor:focus,
	.editor:active {
		border: none;
		outline: none;
		box-shadow: none;
	}

	.editor :global(.cm-editor .cm-cursor) {
		border-left-color: var(--caret-color);
		margin-left: -0.2px;
	}
	.editor :global(.cm-editor .cm-content) {
		font-size: var(--font-ui-small);
		font-family: var(--font-interface);
		color: var(--text-normal);
		field-sizing: content;
	}
	.editor :global(.cm-editor .cm-placeholder) {
		color: var(--text-faint);
	}
	.editor :global(.cm-editor .cm-line) {
		padding-left: 0;
	}
	.editor :global(.cm-editor.cm-focused .cm-selectionBackground),
	.editor :global(.cm-editor.cm-focused ::selection) {
		background-color: var(--text-selection);
	}
	.editor :global(.cm-editor.cm-focused) {
		outline: none;
	}

	.editor :global(.cm-editor .cm-unresolved-file-ref-highlight) {
		color: var(--link-unresolved-color);
	}

	:global(.lmsc .cm-content .cm-file-ref-widget) {
		display: inline-flex;
		align-items: center;
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
		padding: 0 var(--size-2-2);
		border-radius: var(--radius-s);
		gap: var(--size-2-2);
	}

	:global(.lmsc .cm-content .cm-file-ref-widget > span) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.lmsc .cm-content .cm-file-ref-widget svg) {
		width: var(--icon-xs);
		height: var(--icon-xs);
	}

	button.addFileRef {
		border-radius: 50%;
		box-shadow: none;
		padding: var(--size-2-2) var(--size-2-3);
		background-color: transparent;
		aspect-ratio: 1 / 1;
		corner-shape: round;
	}
	button.addFileRef:hover {
		background-color: var(--interactive-hover);
	}
	button.addFileRef:focus {
		background-color: var(--background-modifier-border-focus);
	}
</style>
