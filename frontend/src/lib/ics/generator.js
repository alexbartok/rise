import { createEvents } from 'ics';

/**
 * Convert a Date object to the array format expected by the ics package:
 * [year, month, day, hours, minutes]
 */
function dateToArray(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
    ];
}

/**
 * Generate an ICS calendar string from scheduled steps.
 *
 * @param {Array} steps - Array of scheduled step objects
 * @param {string} timezone - IANA timezone string (e.g. 'Europe/Berlin')
 * @returns {string|null} ICS string, or null on error
 */
export function generateICS(steps, timezone) {
    const events = steps.map(step => {
        const start = dateToArray(step.start);
        const end = dateToArray(step.end);
        const title = step.emoji ? `${step.emoji} ${step.name}` : step.name;

        const event = {
            title,
            description: step.description || '',
            start,
            end,
        };

        if (step.alarm && step.alarm.enabled) {
            event.alarms = [{
                action: 'display',
                description: title,
                trigger: {
                    minutes: Math.abs(step.alarm.offsetMinutes),
                    before: step.alarm.offsetMinutes <= 0,
                },
            }];
        }

        return event;
    });

    const { error, value } = createEvents(events);
    if (error) {
        console.error('ICS generation error:', error);
        return null;
    }
    return value;
}
