import { derived } from 'svelte/store';
import { appSettings } from './stores/appSettings.js';

export const fmt = derived(appSettings, ($settings) => {
    const is24 = $settings.timeFormat === '24h';

    function time(date) {
        if (!date) return '?';
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !is24,
        });
    }

    function date(d) {
        if (!d) return '?';
        const day = d.getDate();
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const dd = String(day).padStart(2, '0');
        const mm = String(m).padStart(2, '0');

        switch ($settings.dateFormat) {
            case 'MM/DD/YYYY': return `${mm}/${dd}/${y}`;
            case 'YYYY-MM-DD': return `${y}-${mm}-${dd}`;
            case 'DD.MM.YYYY':
            default: return `${dd}.${mm}.${y}`;
        }
    }

    function dateTime(d) {
        if (!d) return '?';
        return `${date(d)} ${time(d)}`;
    }

    function dayLabel(d) {
        if (!d) return '?';
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        return `${weekday} ${date(d)}`;
    }

    return { time, date, dateTime, dayLabel };
});
