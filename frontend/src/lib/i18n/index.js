import { writable, derived } from 'svelte/store';
import en from './en.json';
import de from './de.json';

const translations = { en, de };

function detectLanguage() {
    const stored = localStorage.getItem('rise-language');
    if (stored && translations[stored]) return stored;
    const browser = navigator.language.slice(0, 2);
    return translations[browser] ? browser : 'en';
}

export const locale = writable(detectLanguage());
locale.subscribe(val => localStorage.setItem('rise-language', val));

export const t = derived(locale, ($locale) => {
    const msgs = translations[$locale] || translations.en;
    return (key, params = {}) => {
        let msg = msgs[key] || key;
        Object.entries(params).forEach(([k, v]) => {
            msg = msg.replace(`{${k}}`, v);
        });
        return msg;
    };
});

export const availableLocales = Object.keys(translations);
