import { writable } from 'svelte/store';

const BASE = import.meta.env.VITE_API_URL || '';

// Default settings (used until server responds)
export const appSettings = writable({
    timeFormat: '24h',
    dateFormat: 'DD.MM.YYYY',
});

// Fetch settings from server
export async function loadSettings() {
    try {
        const resp = await fetch(`${BASE}/api/settings`);
        if (resp.ok) {
            const data = await resp.json();
            appSettings.set(data);
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

export async function updateSetting(key, value) {
    appSettings.update(s => ({ ...s, [key]: value }));
    try {
        await fetch(`${BASE}/api/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: value }),
        });
    } catch (e) {
        console.error('Failed to save setting:', e);
    }
}
