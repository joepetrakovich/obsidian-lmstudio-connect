import i18next from 'i18next';
import en from './en.json';
import ja from './ja.json';
import zh from './zh.json';
import { getLanguage } from 'obsidian';

export const i18n = i18next.createInstance();
const lng = getLanguage();

void i18n.init({
	lng,
	fallbackLng: 'en',
	resources: {
		en: { translation: en },
		ja: { translation: ja },
		zh: { translation: zh }
	},
	interpolation: {
		escapeValue: false
	},
});

export const t: typeof i18n.t = i18n.t.bind(i18n);
