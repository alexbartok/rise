import { describe, it, expect } from 'vitest';
import { computeSchedule } from '../solver.js';

// Minimal recipe for testing (don't import full biga-pizza — build test data)
const simpleRecipe = {
    baseYield: { amount: 6, unit: 'pieces', weightPerUnit: { min: 250, max: 260 } },
    ingredientGroups: [],
    phases: [
        {
            id: 'phase1',
            name: 'Phase 1',
            steps: [
                {
                    id: 'step-a',
                    name: 'Mix',
                    type: 'active',
                    duration: { min: 15, ideal: 20, max: 25 },
                    dependsOn: null,
                    alarm: { enabled: true, offsetMinutes: 0 },
                    description: 'Mix stuff',
                    flexPriority: 1,
                    unsocialHours: { canOverlap: false, mustAvoid: true },
                },
                {
                    id: 'step-b',
                    name: 'Rest',
                    type: 'passive',
                    duration: { min: 50, ideal: 60, max: 90 },
                    dependsOn: 'step-a',
                    alarm: { enabled: false, offsetMinutes: 0 },
                    description: 'Wait',
                    flexPriority: 7,
                    unsocialHours: { canOverlap: true, mustAvoid: false },
                },
                {
                    id: 'step-c',
                    name: 'Bake',
                    type: 'active',
                    duration: { min: 20, ideal: 30, max: 45 },
                    dependsOn: 'step-b',
                    alarm: { enabled: true, offsetMinutes: 0 },
                    description: 'Bake it',
                    flexPriority: 1,
                    unsocialHours: { canOverlap: false, mustAvoid: true },
                },
            ],
        },
    ],
};

const gapRecipe = {
    baseYield: { amount: 1, unit: 'loaf', weightPerUnit: { min: 500, max: 500 } },
    ingredientGroups: [],
    phases: [{
        id: 'p1', name: 'Phase', steps: [
            {
                id: 'shape', name: 'Shape', type: 'active',
                duration: { min: 10, ideal: 15, max: 20 }, dependsOn: null,
                alarm: { enabled: false, offsetMinutes: 0 }, description: '',
                flexPriority: 1, unsocialHours: { canOverlap: false, mustAvoid: true },
            },
            {
                id: 'preheat', name: 'Preheat', type: 'active',
                duration: { min: 30, ideal: 45, max: 60 }, dependsOn: 'shape',
                gapAfterPrevious: { min: 45, ideal: 75, max: 110 },
                alarm: { enabled: false, offsetMinutes: 0 }, description: '',
                flexPriority: 3, unsocialHours: { canOverlap: false, mustAvoid: true },
            },
        ],
    }],
};

describe('computeSchedule — backward from target', () => {
    it('places last step ending at target time', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const bake = schedule.steps.find(s => s.id === 'step-c');
        expect(bake.end.getTime()).toBe(target.getTime());
    });

    it('places steps in dependency order', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const mix = schedule.steps.find(s => s.id === 'step-a');
        const rest = schedule.steps.find(s => s.id === 'step-b');
        expect(mix.end.getTime()).toBeLessThanOrEqual(rest.start.getTime());
    });

    it('uses ideal durations by default', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const mix = schedule.steps.find(s => s.id === 'step-a');
        const durationMin = (mix.end - mix.start) / 60000;
        expect(durationMin).toBe(20);
    });

    it('respects gapAfterPrevious', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(gapRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const shape = schedule.steps.find(s => s.id === 'shape');
        const preheat = schedule.steps.find(s => s.id === 'preheat');
        const gapMin = (preheat.start - shape.end) / 60000;
        expect(gapMin).toBeGreaterThanOrEqual(45);
        expect(gapMin).toBeLessThanOrEqual(110);
    });
});

describe('computeSchedule — forward from start', () => {
    it('places first step starting at start time', () => {
        const start = new Date('2026-04-03T10:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'forward',
            targetTime: start,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const mix = schedule.steps.find(s => s.id === 'step-a');
        expect(mix.start.getTime()).toBe(start.getTime());
    });
});

describe('unsocial hours detection', () => {
    it('flags active steps in unsocial hours', () => {
        const target = new Date('2026-04-05T03:00:00'); // 3am — all steps in unsocial
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        expect(schedule.warnings.length).toBeGreaterThan(0);
    });

    it('does not flag passive steps with canOverlap', () => {
        const target = new Date('2026-04-05T08:00:00'); // morning
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        // Rest step (passive, canOverlap) may be in unsocial hours but should not generate a warning
        const restWarnings = schedule.warnings.filter(w => w.stepId === 'step-b');
        expect(restWarnings.length).toBe(0);
    });
});

describe('variants', () => {
    it('returns empty variants when no conflicts', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        expect(schedule.variants).toEqual([]);
    });

    it('returns variants when there are unsocial hour conflicts', () => {
        const target = new Date('2026-04-05T03:00:00'); // 3am — all steps in unsocial
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        expect(schedule.warnings.length).toBeGreaterThan(0);
        expect(schedule.variants.length).toBeGreaterThan(0);

        // First variant should be 'current'
        expect(schedule.variants[0].id).toBe('current');
        expect(schedule.variants[0].targetTime.getTime()).toBe(target.getTime());
    });

    it('variant schedules have steps and warnings', () => {
        const target = new Date('2026-04-05T03:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        for (const variant of schedule.variants) {
            expect(variant.schedule).toHaveProperty('steps');
            expect(variant.schedule).toHaveProperty('warnings');
            expect(variant.schedule).toHaveProperty('startTime');
            expect(variant.schedule).toHaveProperty('endTime');
            expect(Array.isArray(variant.adjustments)).toBe(true);
        }
    });

    it('uses direction-aware variant ids for backward scheduling', () => {
        const target = new Date('2026-04-05T03:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        const ids = schedule.variants.map(v => v.id);
        expect(ids).toContain('current');
        // Backward scheduling uses 'earlier'/'later' (not 'forwardEarlier'/'forwardLater')
        if (ids.length > 1) {
            expect(ids.some(id => id === 'earlier' || id === 'later')).toBe(true);
        }
    });
});

describe('schedule shape', () => {
    it('returns expected structure', () => {
        const target = new Date('2026-04-05T19:00:00');
        const schedule = computeSchedule(simpleRecipe, {
            direction: 'backward',
            targetTime: target,
            multiplier: 1,
            optionals: {},
            unsocialStart: '23:00',
            unsocialEnd: '07:00',
        });
        expect(schedule).toHaveProperty('steps');
        expect(schedule).toHaveProperty('warnings');
        expect(schedule).toHaveProperty('shiftRequired');
        expect(schedule).toHaveProperty('shiftOptions');
        expect(schedule).toHaveProperty('totalDuration');
        expect(schedule).toHaveProperty('startTime');
        expect(schedule).toHaveProperty('endTime');
        expect(schedule).toHaveProperty('variants');
        expect(Array.isArray(schedule.variants)).toBe(true);

        const step = schedule.steps[0];
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('start');
        expect(step).toHaveProperty('end');
        expect(step).toHaveProperty('duration');
        expect(step).toHaveProperty('phaseId');
        expect(step).toHaveProperty('phaseName');
    });
});
