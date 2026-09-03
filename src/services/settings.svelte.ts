import { untrack } from "svelte";

export interface PluginSettings {
	lastUsedServer: string;
	servers: LMStudioServer[];
}

export interface LMStudioServer {
	name: string;
	url: string;
	apiKey: string;
	lastUsedModel: string
}

export const MODELS_ENDPOINT = '/v1/models';
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:1234';
export const DEFAULT_SERVER_NAME = 'default';
const DEFAULT_SERVER: LMStudioServer = { name: DEFAULT_SERVER_NAME, url: DEFAULT_SERVER_URL, apiKey: '', lastUsedModel: '' };
const DEFAULT_SETTINGS: PluginSettings = {
	lastUsedServer: DEFAULT_SERVER.name,
	servers: [DEFAULT_SERVER]
}

export const chatViewActive = $state({ watch: 0 });
export function signalChatViewActive() { chatViewActive.watch += 1; }

type PersistenceConfig = { save: (data: PluginSettings) => Promise<void>, load: () => Promise<PluginSettings> };

// Creates settings that auto-persist when modified using a provided save function.
export async function createSettings(persistence: PersistenceConfig) {
	let settings: PluginSettings = $state({ ...DEFAULT_SETTINGS });
	// ensure proper url format and that default server isn't removed
	const guardedSettings: PluginSettings = $derived.by(() => {
		const saved = Object.assign({}, settings);

		const defaultServer = saved.servers.find(s => s.name === DEFAULT_SERVER.name);
		if (defaultServer) {
			if (defaultServer.url.trim() === '') {
				defaultServer.url = DEFAULT_SERVER_URL;
				defaultServer.apiKey = '';
			}
		} else {
			saved.servers.push(DEFAULT_SERVER);
		}
		
		// remove whitespace and trailing slashes
		saved.servers.forEach(s => s.url = s.url.trim().replace(/\/+$/, ''));

		return saved;
	});
	let destroy: () => void | undefined;

	await persistence
		.load()
		.then(initial => {
			settings = Object.assign({}, DEFAULT_SETTINGS, initial);
			// backfill fields added after a server was first saved (missing keys from older data.json)
			settings.servers = settings.servers.map(s => ({ ...DEFAULT_SERVER, ...s }));
			destroy = $effect.root(() => {
				$effect(() => {
					void persistence.save(guardedSettings);
					untrack(() => {
						Object.assign(settings, guardedSettings);
					})
				});
			});
		});

	const dispose = () => {
		if (destroy) {
			destroy();
		}
	}

	return { 
		// svelte-ignore state_referenced_locally
		settings, 
		dispose }
}

