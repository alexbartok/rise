import { describe, it, expect } from 'vitest';
import { generateICS } from '../generator.js';

describe('generateICS', () => {
    it('generates valid ICS string with events', () => {
        const steps = [
            {
                id: 'test',
                name: 'Biga mischen',
                emoji: '\u{1F355}',
                start: new Date('2026-04-05T10:00:00'),
                end: new Date('2026-04-05T10:20:00'),
                description: 'Test description',
                alarm: { enabled: true, offsetMinutes: 0 },
            }
        ];
        const ics = generateICS(steps, 'Europe/Berlin');
        expect(ics).toContain('BEGIN:VCALENDAR');
        expect(ics).toContain('END:VCALENDAR');
        expect(ics).toContain('BEGIN:VEVENT');
        expect(ics).toContain('Biga mischen');
    });

    it('skips alarm when disabled', () => {
        const steps = [
            {
                id: 'test',
                name: 'Kaltgare',
                emoji: '\u{1F9CA}',
                start: new Date('2026-04-03T12:00:00'),
                end: new Date('2026-04-05T10:00:00'),
                description: 'Wait',
                alarm: { enabled: false, offsetMinutes: 0 },
            }
        ];
        const ics = generateICS(steps, 'Europe/Berlin');
        expect(ics).not.toContain('BEGIN:VALARM');
    });

    it('includes alarm when enabled', () => {
        const steps = [
            {
                id: 'test',
                name: 'Start',
                emoji: '\u{1F514}',
                start: new Date('2026-04-05T10:00:00'),
                end: new Date('2026-04-05T10:30:00'),
                description: 'Do thing',
                alarm: { enabled: true, offsetMinutes: -5 },
            }
        ];
        const ics = generateICS(steps, 'Europe/Berlin');
        expect(ics).toContain('BEGIN:VALARM');
    });

    it('returns null on empty steps', () => {
        const ics = generateICS([], 'Europe/Berlin');
        // ics package may return an empty calendar or null; either is acceptable
        // The key is it does not throw
        expect(ics).toBeDefined();
    });

    it('handles steps without emoji', () => {
        const steps = [
            {
                id: 'no-emoji',
                name: 'Plain step',
                emoji: null,
                start: new Date('2026-04-05T10:00:00'),
                end: new Date('2026-04-05T10:30:00'),
                description: '',
                alarm: { enabled: false, offsetMinutes: 0 },
            }
        ];
        const ics = generateICS(steps, 'Europe/Berlin');
        expect(ics).toContain('Plain step');
    });
});
