import { Component, MarkdownRenderChild, MarkdownRenderer, Plugin, WorkspaceLeaf, parseYaml } from 'obsidian';
import { ChatView, VIEW_TYPE_CHAT } from './chatview';
import { SettingsTab, } from './settingstab';
import { type PluginSettings, createSettings, signalChatViewActive } from './services/settings.svelte';
import { t } from './i18n';
import { ModelStore } from './services/models-store.svelte';
import { Config } from './services/models';
import { CodeBlockChatHost } from './codeblockchathost';

export default class LMStudioConnectPlugin extends Plugin {
	settings: PluginSettings;
	modelStore: ModelStore;
	unloadSettings: () => void;

	async onload() {
		const { settings, dispose } = await createSettings({
			save: (data: PluginSettings) => this.saveData(data),
			load: () => this.loadData(),
		});
		this.settings = settings;
		this.unloadSettings = dispose;
		this.modelStore = new ModelStore(settings);

		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf, this)
		);

		this.addRibbonIcon('bot-message-square', t('plugin.openCommand'), () => {
			void this.activateView()
		});

		this.addCommand({
			id: 'open-chat-view',
			name: t('commands.openChatView'),
			callback: () => {
				void this.activateView();
			},
		});

		this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
			if (leaf?.view instanceof ChatView) {
				signalChatViewActive();
			}
		}));

		this.registerMarkdownCodeBlockProcessor('lmsc', async (source, el, ctx) => {
			const mdRenderChild = new MarkdownRenderChild(el);
			ctx.addChild(mdRenderChild);

			try {
				const config = Config.parse(parseYaml(source));
				const host = new CodeBlockChatHost(el, this, config);
				ctx.addChild(host);
			} catch (error) {
				console.error(error);
				await this.appendFailureCallout(el, t('errors.codeBlockYamlParseError'), mdRenderChild);
				return Promise.resolve();
			}
		});
	}

	async appendFailureCallout(el: HTMLElement, text: string, component: Component): Promise<void> {
		await MarkdownRenderer.render(this.app, `> [!failure] \n> ${text}`, el, "", component);
	}

	onunload() {
		this.unloadSettings();
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_CHAT, active: true });
		}

		if (!leaf) {
			console.error("Unexpected error loading leaf.  Try reopening the plugin.");
			return;
		}

		void workspace.revealLeaf(leaf)
			.then(signalChatViewActive);
	}
}
