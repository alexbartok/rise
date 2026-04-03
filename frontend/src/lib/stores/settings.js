import { writable } from 'svelte/store';

function createPersistentStore(key, defaultValue) {
    const stored = localStorage.getItem(key);
    let initial = defaultValue;
    if (stored) {
        try { initial = JSON.parse(stored); } catch { /* corrupted, use default */ }
    }
    const store = writable(initial);
    store.subscribe(val => localStorage.setItem(key, JSON.stringify(val)));
    return store;
}

export const unsocialStart = createPersistentStore('rise-unsocial-start', '23:00');
export const unsocialEnd = createPersistentStore('rise-unsocial-end', '07:00');
export const timezone = createPersistentStore('rise-timezone',
    Intl.DateTimeFormat().resolvedOptions().timeZone
);
