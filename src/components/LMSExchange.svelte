<script lang="ts">
	import { MarkdownRenderer } from "obsidian";
	import { icon } from "./Icon.svelte";
	import { fade } from "svelte/transition";
	import { getPluginContext } from "src/services/context";
	import type { Attachment } from "svelte/attachments";
	import { t } from "src/i18n";
	import ErrorMessage from "./ErrorMessage.svelte";
	import type { LMSExchange } from "src/services/lms-api";

	let plugin = getPluginContext();
	let {
		exchange,
		onretry,
		hideUserMessage = false,
		hideToolUse = false,
	}: {
		exchange: LMSExchange;
		onretry: () => void;
		hideUserMessage?: boolean;
		hideToolUse?: boolean;
	} = $props();

	const { response } = $derived(exchange);

	function markdown(content: string): Attachment {
		return (element) => {
			element.innerHTML = "";
			MarkdownRenderer.render(
				plugin.app,
				content,
				element as HTMLElement,
				"",
				plugin,
			);
		};
	}

	const scroll = (node: HTMLElement) =>
		node.scrollIntoView({ behavior: "smooth" });

	let openReasoning = $state(new Set<number>());
	function toggleReasoning(index: number) {
		if (openReasoning.has(index)) openReasoning.delete(index);
		else openReasoning.add(index);
		openReasoning = new Set(openReasoning);
	}
</script>

<li in:fade {@attach scroll}>
	{#if !hideUserMessage}
		<div class="user">
			{@html exchange.userMessage.displayHTML}
		</div>
	{/if}
	<div class={["response", response.status]}>
		<span class="spinner" {@attach icon("loader")}></span>
		{#each response.messages as message, i}
			<div
				in:fade
				class={["lmsc-message", message.type]}
				title={message.type === "invalid_tool_call"
					? message.reason
					: message.type === "stream_error"
						? message.message
						: undefined}
			>
				{#if message.type === "reasoning"}
					<button
						class="reasoning-toggle"
						onclick={() => toggleReasoning(i)}
					>
						<span
							{@attach icon(openReasoning.has(i) ? "minus" : "plus")}
						></span>
						{message.status === "done" || response.status !== "in-progress"
							? t("messages.thought")
							: t("messages.thinking")}
					</button>
					{#if openReasoning.has(i)}
						{#key message.content}
							<div {@attach markdown(message.content)}></div>
						{/key}
					{/if}
				{:else if message.type === "message"}
					{#key message.content}
						<div {@attach markdown(message.content)}></div>
					{/key}
				{:else if !hideToolUse && message.type === "tool_call"}
					<span {@attach icon("arrow-right")}></span>
					{message.tool}
				{:else if !hideToolUse && message.type === "invalid_tool_call"}
					<span {@attach icon("arrow-right")}></span>
					{message.metadata.tool_name}
				{:else if message.type === "stream_error"}
					Something went wrong...
				{/if}
			</div>
		{/each}
		{#if response.status === "error"}
			<ErrorMessage message={t("errors.somethingWentWrong")} {onretry} />
		{/if}
	</div>
</li>

<style>
	li {
		display: flex;
		flex-direction: column;
		font-size: var(--font-small);
		color: var(--text-normal);
		gap: var(--size-4-2);
	}

	.user {
		align-self: flex-end;
		background: var(--background-primary);
		padding: var(--size-4-2);
		border-radius: var(--radius-l);
	}

	.response {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-2);
		align-self: flex-start;
	}

	.lmsc-message.message {
		padding: 0;
		padding: var(--size-4-2) 0;
		border-radius: var(--radius-s);
	}

	.response.completed .lmsc-message.message {
		background-color: color-mix(
			in srgb,
			var(--background-primary),
			transparent 80%
		);
	}

	.lmsc-message {
		transition: background-color var(--anim-duration-fast) ease-in-out;
		min-height: 32px;
	}

	.response.completed .lmsc-message.message:hover {
		background-color: var(--background-primary);
	}

	.lmsc-message > div :global(p:first-child),
	.lmsc-message.reasoning > div :global(p:first-child) {
		margin-top: 0;
		padding-top: 0;
	}

	.lmsc-message > div :global(p:last-of-type),
	.lmsc-message.reasoning > div :global(p:last-of-type) {
		margin-top: 0;
		margin-bottom: 0;
	}

	.lmsc-message.reasoning {
		color: var(--text-faint);
		display: flex;
		flex-direction: column;
		gap: var(--size-2-2);
		align-items: flex-start;
	}

	.reasoning-toggle {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		cursor: pointer;
		user-select: none;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		font-size: inherit;
	}

	.lmsc-message.tool_call,
	.lmsc-message.invalid_tool_call {
		color: var(--text-faint);
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
	}

	.lmsc-message.invalid_tool_call,
	.lmsc-message.stream_error {
		color: var(--text-error);
	}
	.response:not(.in-progress) .spinner {
		display: none;
	}

	.spinner :global(svg) {
		animation: spin 2s linear infinite;
	}
</style>
