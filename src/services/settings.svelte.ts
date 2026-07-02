import { untrack } from "svelte";

export interface PluginSettings {
	lastUsedServer: string;
	servers: LMStudioServer[];
}

export interface LMStudioServer {
	name: string;
	url: string;
	lastUsedModel: string
}

export const MODELS_ENDPOINT = '/v1/models';
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:1234';
const DEFAULT_SERVER: LMStudioServer = { name: 'default', url: DEFAULT_SERVER_URL, lastUsedModel: '' };
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

		const defaultServer = saved.servers.find(s => s.name === 'default');
		if (defaultServer) {
			if (defaultServer.url.trim() === '') {
				defaultServer.url = DEFAULT_SERVER_URL;
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

