import { untrack } from "svelte";

export interface PluginSettings {
	lastUsedServer: string;
	servers: LMStudioServer[];
	useVaultTools: boolean,
	useWebFetchTool: boolean
	integrations: (Plugin | EphemeralMCP)[] //NOTE: probably this and the useXX settings should be per server but can migrate to that later if people request it.  99.9% of users are only using one server, I only added support for multiple for myself when I had a second PC at home.
}

export interface Integration {
	enabled: boolean
}

export interface Plugin extends Integration {
	type: "plugin",
	id: string,
	allowedTools: string[]
}

export interface EphemeralMCP extends Integration {
	type: "ephemeral_mcp",
	server_label: string,
	server_url: string,
	allowedTools: string[]
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
	servers: [DEFAULT_SERVER],
	useVaultTools: true,
	useWebFetchTool: true,
	integrations: []
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

