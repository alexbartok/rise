import { describe, it, expect } from 'vitest';
import { computeSurplusSchedule } from '../solver.js';

const fridgeSteps = [
    {
        id: 'surplus-fridge-out',
        name: 'Take out',
        type: 'passive',
        duration: { min: 90, ideal: 120, max: 150 },
        dependsOn: null,
        alarm: { enabled: true, offsetMinutes: 0 },
        description: 'Take dough out of fridge',
    },
    {
        id: 'surplus-fridge-preheat',
        name: 'Preheat',
        type: 'active',
        duration: { min: 30, ideal: 45, max: 60 },
        dependsOn: 'surplus-fridge-out',
        alarm: { enabled: true, offsetMinutes: 0 },
        description: 'Preheat oven',
    },
    {
        id: 'surplus-fridge-bake',
        name: 'Bake',
        type: 'active',
        duration: { min: 15, ideal: 20, max: 30 },
        dependsOn: 'surplus-fridge-preheat',
        alarm: { enabled: true, offsetMinutes: 0 },
        description: 'Bake',
    },
];

describe('computeSurplusSchedule', () => {
    it('computes backward from target time', () => {
        const target = new Date('2026-04-06T19:00:00');
        const schedule = computeSurplusSchedule(fridgeSteps, {
            targetTime: target,
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const bake = schedule.steps.find(s => s.id === 'surplus-fridge-bake');
        expect(bake.end.getTime()).toBe(target.getTime());
    });

    it('uses ideal durations', () => {
        const target = new Date('2026-04-06T19:00:00');
        const schedule = computeSurplusSchedule(fridgeSteps, {
            targetTime: target,
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const preheat = schedule.steps.find(s => s.id === 'surplus-fridge-preheat');
        const dur = (preheat.end - preheat.start) / 60000;
        expect(dur).toBe(45); // ideal
    });

    it('maintains dependency order', () => {
        const target = new Date('2026-04-06T19:00:00');
        const schedule = computeSurplusSchedule(fridgeSteps, {
            targetTime: target,
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const out = schedule.steps.find(s => s.id === 'surplus-fridge-out');
        const preheat = schedule.steps.find(s => s.id === 'surplus-fridge-preheat');
        expect(out.end.getTime()).toBeLessThanOrEqual(preheat.start.getTime());
    });

    it('returns correct total number of steps', () => {
        const target = new Date('2026-04-06T19:00:00');
        const schedule = computeSurplusSchedule(fridgeSteps, {
            targetTime: target,
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        expect(schedule.steps.length).toBe(3);
    });
});
