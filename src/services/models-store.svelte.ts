import { App, requestUrl } from "obsidian";
import { MODELS_ENDPOINT, type LMStudioServer, type PluginSettings } from "src/services/settings.svelte";
import type { ModelInfo } from "./models";

/**
* Provides access to available LLM models from the server URLs.
* Also provides functions to refresh the list of available servers
* and holds the active server and model and keep it
* synced with settings.
**/
export class ModelStore {
	private _app: App;
	private _settings: PluginSettings;
	private _currentServer: LMStudioServer | undefined = $state();
	private _currentModel = $state("");
	private _serverRefreshRequested = $state(0);

	currentBaseUrl: string = $derived(this._currentServer ? this._currentServer.url + '/v1' : "");
	currentApiKey: string | undefined = $derived.by(() => {
		let apiKey = this._currentServer?.apiKey;
		return apiKey ? this._app.secretStorage.getSecret(apiKey) ?? undefined : undefined;
	});

	constructor(app: App, settings: PluginSettings) {
		this._app = app;
		this._settings = settings;
		this._currentServer = settings.servers.find(s => s.name === settings.lastUsedServer);
		this._currentModel = this._currentServer?.lastUsedModel ?? "";
	}

	get currentServer() {
		return this._currentServer;
	}

	get currentModel() {
		return this._currentModel;
	}

	setCurrentModel(serverName: string, model: string) {
		const server = this._settings.servers.find(s => s.name === serverName);
		if (server) {
			server.lastUsedModel = model;
			this._settings.lastUsedServer = serverName;
			this._currentServer = server;
			this._currentModel = model;
		}
	}

	async #listModels(baseURL: string, apiKey: string) {
		try {
			let secret = apiKey ? this._app.secretStorage.getSecret(apiKey) : undefined;
			const response = await requestUrl({
				url: baseURL + MODELS_ENDPOINT,
				headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
			});
			const { data } = response.json as { data: ModelInfo[] };
			return data;
		} catch (error) {
			console.error(
				`Error calling GET ${MODELS_ENDPOINT} at ${baseURL}: `,
				error,
			);
			throw error;
		}
	}

	refreshAvailableModels() {
		this._serverRefreshRequested += 1;
	}

	/**
	* Provides an awaitable function for getting the 
	* current state of all servers and models.
	**/
	listModelsFromAllServers = $derived.by(() => {
		void this._serverRefreshRequested;
		return (async () => {
			const listModelsPromises = this._settings.servers.map((s) =>
				this.#listModels(s.url, s.apiKey),
			);
			return Promise.allSettled(listModelsPromises).then((results) => {
				return results.map((r, i) => ({
					server: this._settings.servers[i],
					connected: r.status === "fulfilled",
					models: r.status === "fulfilled" ? r.value : [],
				}));
			});
		});
	});

}
