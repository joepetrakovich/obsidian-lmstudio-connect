import LMStudioConnectPlugin from "src/main";
import type { PluginSettings } from "src/settings.svelte";
import { createContext } from "svelte";

export const [getPluginContext, setPluginContext] = createContext<LMStudioConnectPlugin>();
export const [getSettingsContext, setSettingsContext] = createContext<PluginSettings>();
