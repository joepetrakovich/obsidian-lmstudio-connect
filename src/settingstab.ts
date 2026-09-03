import { App, PluginSettingTab, Modal, Setting, type SettingDefinitionItem, debounce, requestUrl, SecretComponent, ButtonComponent, setIcon, type Debouncer, ExtraButtonComponent } from "obsidian";
import type LMStudioConnectPlugin from "./main";
import { t } from "./i18n";
import { DEFAULT_SERVER_NAME, MODELS_ENDPOINT, type LMStudioServer } from "./services/settings.svelte";

export class SettingsTab extends PluginSettingTab {
	plugin: LMStudioConnectPlugin;

	constructor(app: App, plugin: LMStudioConnectPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.icon = "bot-message-square";
		this.containerEl.toggleClass('lmsc-settings', true);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'list',
			heading: t('settings.serversHeading'),
			addItem: {
				name: t('settings.addServer'),
					action: () => new AddEditLMStudioServerModal(
						this.app,
						false,
						(name, url, apiKey) => {
							this.plugin.settings.servers.push({ name, url, apiKey, lastUsedModel: '' });
							this.plugin.modelStore.refreshAvailableModels();
							this.update();
						},
						() => this.plugin.modelStore.refreshAvailableModels(),
						this.plugin.settings.servers.map(s => s.name),
						() => this.update()).open(),
				},
				cls: 'lmsc-server-list',
				items: this.plugin.settings.servers.map((server, index) => ({
					name: server.name === DEFAULT_SERVER_NAME ? t('serverModal.default') : server.name,
					desc: server.url,
					searchable: false,
					render: (setting) => {
						if (server.apiKey) {
							setIcon(setting.descEl.createSpan(), 'key');
						}
						
						setting.descEl.toggleClass('uses-key', server.apiKey?.length > 0)
						const statusIcon = setting.nameEl.createSpan({ cls: 'lmsc-server-status' });
						setIcon(statusIcon, 'circle-off');
						void this.refreshServerStatus(server, statusIcon);

						setting.setClass(`server ${server.name}`);
						setting.addExtraButton(button => button
							.setIcon('pen-line')
							.setTooltip(t('serverModal.editServer'))
							.onClick(() => {
								new AddEditLMStudioServerModal(
									this.app,
									server.name === DEFAULT_SERVER_NAME,
									(name, url, apiKey) => {
										const current = this.plugin.settings.servers.at(index);
										if (current) {
											current.name = server.name === DEFAULT_SERVER_NAME ? DEFAULT_SERVER_NAME : name;
											current.url = url;
											current.apiKey = apiKey;
										}
										this.plugin.modelStore.refreshAvailableModels();
										this.update();
									},
									() => this.plugin.modelStore.refreshAvailableModels(),
									this.plugin.settings.servers.filter((_, i) => i !== index).map(s => s.name),
									() => this.update(),
								server.name === DEFAULT_SERVER_NAME ? t('serverModal.default') : server.name,
								server.url,
								server.apiKey).open()
							}));

						if (server.name !== DEFAULT_SERVER_NAME) {
							setting.addExtraButton(button => button
								.setIcon('trash-2')
								.setTooltip(t('serverModal.deleteServer'))
								.onClick(() => {
									this.plugin.settings.servers.splice(index, 1);
									this.update();
									this.plugin.modelStore.refreshAvailableModels();
								}));
						}
					}
				})),
			}
		]
	}

	private async refreshServerStatus(server: LMStudioServer, statusIcon: HTMLElement): Promise<void> {
		const secret = server.apiKey ? this.app.secretStorage.getSecret(server.apiKey) : undefined;
		const { ok } = await checkServerHealth(server.url, secret);
		this.plugin.modelStore.refreshAvailableModels();
		setIcon(statusIcon, ok ? 'circle-check-big' : 'circle-off');
		statusIcon.toggleClass('lmsc-text-success', ok);
		statusIcon.toggleClass('lmsc-text-warning', !ok);
	}
}

export type ServerHealthResult = { httpCode: number | null; ok: boolean; count: number };

export async function checkServerHealth(url: string, secret?: string | null): Promise<ServerHealthResult> {
	try {
		const resp = await requestUrl({
			url: url + MODELS_ENDPOINT,
			headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
		});
		const { data } = resp.json as { data: unknown[] };
		return { httpCode: resp.status, ok: resp.status === 200, count: data?.length ?? 0 };
	} catch (e) {
		console.error(e);
		return { httpCode: e?.status ?? null, ok: false, count: 0 };
	}
}

export class AddEditLMStudioServerModal extends Modal {
	statusButton: ExtraButtonComponent;
	statusSetting: Setting;
	debouncedHealthCheck: Debouncer<[], Promise<boolean>>;
	refreshModels: () => void;
	forbiddenNames: string[];
	onModalClose?: () => void;
	nameSetting: Setting;
	urlSetting: Setting;
	onSave: (name: string, url: string, apiKey: string) => void;
	name: string;
	url: string;
	apiKey: string;

	constructor(app: App, readOnlyName: boolean, onSave: (name: string, url: string, apiKey: string) => void,
		refreshModels: () => void, forbiddenNames: string[], onModalClose?: () => void, initialName = '', initialURL = '', initialApiKey = '') {
		super(app);
		this.setTitle(initialName || initialURL || initialApiKey ? t('serverModal.editTitle') : t('serverModal.addTitle'));
		this.modalEl.addClass('lmsc-add-server-modal');
		this.refreshModels = refreshModels;
		this.forbiddenNames = forbiddenNames;
		this.onModalClose = onModalClose;
		this.onSave = onSave;
		this.debouncedHealthCheck = debounce(() => this.healthcheck(), 1000, true);
		this.name = initialName;
		this.url = initialURL;
		this.apiKey = initialApiKey;

		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			this.save();
		});

		this.nameSetting = new Setting(this.contentEl)
			.setName(t('serverModal.displayName'))
			.setDisabled(readOnlyName)
			.setDesc(t('serverModal.displayNameDesc'))
			.addText((text) =>
				text
					.setValue(this.name)
					.setPlaceholder(t('serverModal.displayName'))
					.setDisabled(readOnlyName)
					.onChange((value) => {
						if (readOnlyName) return;
						this.validateUniqueNonEmptyName(value);
						this.name = value;
					})
			);

		this.urlSetting = new Setting(this.contentEl)
			.setName(t('serverModal.urlInputPlaceholder'))
			.setDesc(t('serverModal.urlDesc'))
			.addText((text) =>
				text
					.setValue(this.url)
					.setPlaceholder(t('serverModal.urlPlaceholder'))
					.onChange(async (value) => {
						this.validateNonEmptyURL(value);
						this.url = value;
						this.debouncedHealthCheck();
					})
			);

		new Setting(this.contentEl)
			.setName(t('serverModal.apiKey'))
			.setDesc(t('serverModal.optional'))
			.addComponent(el => new SecretComponent(this.app, el)
				.setValue(this.apiKey)
				.onChange(async (value) => {
					this.apiKey = value ?? '';
					this.debouncedHealthCheck();
				}));


		this.statusSetting = new Setting(this.contentEl)
			.addExtraButton((button) => {
				this.statusButton = button;
				button
					.setIcon('circle-off')
					.setTooltip(t('serverModal.testConnection'))
					.onClick(async () => {
						await this.healthcheck();
					})
			})
			.addButton((btn) =>
				btn
					.setButtonText(t('serverModal.save'))
					.setCta()
					.onClick(() => this.save()))
			.addButton((btn) =>
				btn
					.setButtonText(t('serverModal.cancel'))
					.onClick(() => {
						this.close();
					})
			);

		if (this.url) void this.healthcheck();
	}

	private save(): void {
		const validName = this.validateUniqueNonEmptyName(this.name);
		if (!validName) return;

		const validUrl = this.validateNonEmptyURL(this.url);
		if (!validUrl) return;
		this.onSave(validName, validUrl, this.apiKey);
		this.close();
	}

	validateUniqueNonEmptyName(value: string): string | null {
		const name = value.trim();
		if (!name) {
			this.nameSetting.setErrorMessage(t('serverModal.nameRequired'));
			return null;
		}

		if (this.forbiddenNames.some(n => n.toLowerCase() === name.toLowerCase())) {
			this.nameSetting.setErrorMessage(t('serverModal.uniqueNameError'));
			return null;
		}

		this.nameSetting.setErrorMessage(null);
		return name;
	}

	validateNonEmptyURL(value: string): string | null {
		const url = value.trim().replace(/\/+$/, '');
		if (!url) {
			this.urlSetting.setErrorMessage(t('serverModal.urlRequired'));
			return null;
		}

		this.urlSetting.setErrorMessage(null);
		return url;
	}

	async healthcheck(): Promise<boolean> {
		this.statusSetting.nameEl.toggleClass('lmsc-text-warning', false);
		this.statusSetting.nameEl.toggleClass('lmsc-text-success', false);
		this.statusSetting.nameEl.toggleClass('lmsc-text-muted', true);
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-warning', false);
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-success', false);
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-muted', true);
		this.statusButton.setDisabled(true).setIcon('loader');
		this.statusButton.setTooltip(t('serverModal.connecting'));
		this.statusSetting.setName(t('serverModal.connecting'));
		this.statusSetting.setDesc(t('serverModal.urlCorrect'));

		const secret = this.apiKey ? this.app.secretStorage.getSecret(this.apiKey) : undefined;
		const { ok, httpCode, count } = await checkServerHealth(this.url, secret);
		this.refreshModels();

		this.statusButton.setDisabled(false).setTooltip(t('serverModal.testConnection'));
		this.statusButton.setIcon(ok ? 'circle-check-big' : 'circle-off');
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-warning', !ok);
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-success', ok);
		this.statusButton.extraSettingsEl.toggleClass('lmsc-text-muted', false);
		this.statusSetting.nameEl.toggleClass('lmsc-text-warning', !ok);
		this.statusSetting.nameEl.toggleClass('lmsc-text-success', ok);
		this.statusSetting.nameEl.toggleClass('lmsc-text-muted', false);
		if (httpCode === 401) {
			this.statusSetting.setName(t('serverModal.unauthorized'));
			this.statusSetting.setDesc(t('serverModal.needApiKey'));
		} else if (ok) {
			this.statusSetting.setName(t('serverModal.serverConnected'));
			this.statusSetting.setDesc(t('serverModal.modelsFound', { count }));
		} else {
			this.statusSetting.setName(t('serverModal.serverDisconnected'));
			this.statusSetting.setDesc(t('serverModal.corsEnabled'));
		}

		return ok;
	}

	onClose(): void {
		this.debouncedHealthCheck.cancel();
		this.onModalClose?.();
	}

}

