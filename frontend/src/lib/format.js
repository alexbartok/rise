import { get } from 'svelte/store';
import { appSettings } from './stores/appSettings.js';

export function formatTime(date) {
    if (!date) return '?';
    const settings = get(appSettings);
    const is24 = settings.timeFormat === '24h';
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !is24,
    });
}

export function formatDate(date) {
    if (!date) return '?';
    const settings = get(appSettings);
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');

    switch (settings.dateFormat) {
        case 'MM/DD/YYYY': return `${mm}/${dd}/${y}`;
        case 'YYYY-MM-DD': return `${y}-${mm}-${dd}`;
        case 'DD.MM.YYYY':
        default: return `${dd}.${mm}.${y}`;
    }
}

export function formatDateTime(date) {
    if (!date) return '?';
    return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatDayLabel(date) {
    if (!date) return '?';
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    return `${weekday} ${formatDate(date)}`;
}
