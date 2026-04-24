import { describe, it, expect } from 'vitest';
import { expandForYield } from '../transform.js';

describe('expandForYield', () => {
    const plainRecipe = {
        baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
        phases: [{
            id: 'bake-phase',
            name: 'Bake',
            steps: [
                { id: 'mix', name: 'Mix', duration: { min: 5, ideal: 10, max: 15 }, description: 'Mix' },
                { id: 'bake', name: 'Bake', duration: { min: 55, ideal: 60, max: 65 }, dependsOn: 'mix', description: 'Bake' },
            ],
        }],
    };

    it('returns recipe unchanged when no perUnit step exists', () => {
        const result = expandForYield(plainRecipe, 1);
        expect(result).toBe(plainRecipe);
    });

    it('returns recipe unchanged when multiplier is 2 and no perUnit', () => {
        const result = expandForYield(plainRecipe, 2);
        expect(result).toBe(plainRecipe);
    });

    const recipeWithPerUnit = {
        baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
        phases: [{
            id: 'bake-phase',
            name: 'Bake',
            steps: [
                { id: 'proof', name: 'Proof', duration: { min: 60, ideal: 60, max: 60 }, description: 'Proof' },
                {
                    id: 'bake',
                    name: 'Bake',
                    duration: { min: 55, ideal: 60, max: 65 },
                    dependsOn: 'proof',
                    description: 'Teigling in Dutch Oven',
                    perUnit: true,
                },
                { id: 'cool', name: 'Cool', duration: { min: 20, ideal: 20, max: 30 }, dependsOn: 'bake', description: 'Cool' },
            ],
        }],
    };

    it('expands perUnit step into N slots at yield=N (no hold)', () => {
        // baseYield 2 × multiplier 2 = 4 slots
        const result = expandForYield(recipeWithPerUnit, 2);
        const steps = result.phases[0].steps;
        expect(steps.map(s => s.id)).toEqual(['proof', 'bake-1', 'bake-2', 'bake-3', 'bake-4', 'cool']);
        expect(steps[1].dependsOn).toBe('proof');
        expect(steps[2].dependsOn).toBe('bake-1');
        expect(steps[3].dependsOn).toBe('bake-2');
        expect(steps[4].dependsOn).toBe('bake-3');
        // cool originally dependsOn 'bake'; must be rewired to the final slot
        expect(steps[5].dependsOn).toBe('bake-4');
    });

    it('at yield=1, perUnit step becomes a single slot', () => {
        // baseYield 2 × multiplier 0.5 = 1 slot
        const result = expandForYield(recipeWithPerUnit, 0.5);
        const steps = result.phases[0].steps;
        expect(steps.map(s => s.id)).toEqual(['proof', 'bake-1', 'cool']);
        expect(steps[2].dependsOn).toBe('bake-1');
    });

    it('preserves duration on each expanded slot', () => {
        // baseYield 2 × multiplier 1 = 2 slots
        const result = expandForYield(recipeWithPerUnit, 1);
        const bakeSlots = result.phases[0].steps.filter(s => s.id.startsWith('bake-'));
        expect(bakeSlots).toHaveLength(2);
        for (const slot of bakeSlots) {
            expect(slot.duration).toEqual({ min: 55, ideal: 60, max: 65 });
        }
    });

    it('names slots with unit index in name field', () => {
        const result = expandForYield(recipeWithPerUnit, 1);
        const bakeSlots = result.phases[0].steps.filter(s => s.id.startsWith('bake-'));
        expect(bakeSlots[0].name).toBe('Bake (1/2)');
        expect(bakeSlots[1].name).toBe('Bake (2/2)');
    });

    it('strips perUnit and hold fields from generated slots', () => {
        const result = expandForYield(recipeWithPerUnit, 1);
        const bakeSlots = result.phases[0].steps.filter(s => s.id.startsWith('bake-'));
        for (const slot of bakeSlots) {
            expect(slot.perUnit).toBeUndefined();
            expect(slot.hold).toBeUndefined();
        }
    });

    it('rewires dependsOn through multiple steps (not just the immediate next)', () => {
        // proof → bake (perUnit) → cleanup (deps on proof, not bake) → cool (deps on bake)
        // cleanup should be left alone; cool should rewire to bake-N
        const recipe = {
            baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'proof', name: 'Proof', duration: { min: 60, ideal: 60, max: 60 }, description: 'Proof' },
                    { id: 'bake', name: 'Bake', duration: { min: 60, ideal: 60, max: 60 }, dependsOn: 'proof', description: 'Bake', perUnit: true },
                    { id: 'cleanup', name: 'Cleanup', duration: { min: 5, ideal: 5, max: 5 }, dependsOn: 'proof', description: 'Cleanup' },
                    { id: 'cool', name: 'Cool', duration: { min: 20, ideal: 20, max: 20 }, dependsOn: 'bake', description: 'Cool' },
                ],
            }],
        };
        const result = expandForYield(recipe, 1);
        const steps = result.phases[0].steps;
        const cleanup = steps.find(s => s.id === 'cleanup');
        const cool = steps.find(s => s.id === 'cool');
        expect(cleanup.dependsOn).toBe('proof');
        expect(cool.dependsOn).toBe('bake-2');
    });

    it('handles chained perUnit steps (second depends on first)', () => {
        // Both shape and bake are perUnit. shape-N → bake-1 → bake-2 → ...
        const recipe = {
            baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'shape', name: 'Shape', duration: { min: 5, ideal: 5, max: 5 }, description: 'Shape', perUnit: true },
                    { id: 'bake', name: 'Bake', duration: { min: 60, ideal: 60, max: 60 }, dependsOn: 'shape', description: 'Bake', perUnit: true },
                ],
            }],
        };
        const result = expandForYield(recipe, 1);
        const ids = result.phases[0].steps.map(s => s.id);
        expect(ids).toEqual(['shape-1', 'shape-2', 'bake-1', 'bake-2']);
        const bake1 = result.phases[0].steps.find(s => s.id === 'bake-1');
        expect(bake1.dependsOn).toBe('shape-2');
    });

    const recipeWithHold = {
        baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
        phases: [{
            id: 'bake-phase',
            name: 'Bake',
            steps: [
                { id: 'proof', name: 'Proof', duration: { min: 60, ideal: 60, max: 60 }, description: 'Proof' },
                {
                    id: 'bake',
                    name: 'Bake',
                    duration: { min: 55, ideal: 60, max: 65 },
                    type: 'active',
                    alarm: { enabled: true, offsetMinutes: 0 },
                    dependsOn: 'proof',
                    description: 'Teigling in Dutch Oven',
                    flexPriority: 1,
                    unsocialHours: { canOverlap: false, mustAvoid: false },
                    perUnit: true,
                    hold: {
                        where: 'Kühlschrank',
                        storeAction: 'Brot {n} in den Kühlschrank stellen',
                        retrieveAction: 'Brot {n} aus dem Kühlschrank nehmen',
                        transitionDuration: { min: 3, ideal: 5, max: 5 },
                    },
                },
            ],
        }],
    };

    it('inserts a batched store event when yield > 1', () => {
        const result = expandForYield(recipeWithHold, 2);  // N = 4
        const steps = result.phases[0].steps;
        const storeStep = steps.find(s => s.id === 'bake-hold-store');
        expect(storeStep).toBeDefined();
        expect(storeStep.description).toContain('Brot 2 in den Kühlschrank stellen');
        expect(storeStep.description).toContain('Brot 3 in den Kühlschrank stellen');
        expect(storeStep.description).toContain('Brot 4 in den Kühlschrank stellen');
        expect(storeStep.duration).toEqual({ min: 3, ideal: 5, max: 5 });
        expect(storeStep.dependsOn).toBe('proof');
    });

    it('first bake slot depends on store event when N > 1', () => {
        const result = expandForYield(recipeWithHold, 2);
        const slot1 = result.phases[0].steps.find(s => s.id === 'bake-1');
        expect(slot1.dependsOn).toBe('bake-hold-store');
    });

    it('prepends retrieve action to description of slots 2..N', () => {
        const result = expandForYield(recipeWithHold, 2);
        const steps = result.phases[0].steps;
        const slot1 = steps.find(s => s.id === 'bake-1');
        const slot2 = steps.find(s => s.id === 'bake-2');
        const slot4 = steps.find(s => s.id === 'bake-4');
        expect(slot1.description).toBe('Teigling in Dutch Oven');  // no prefix on first
        expect(slot2.description).toMatch(/^Brot 2 aus dem Kühlschrank nehmen/);
        expect(slot2.description).toContain('Teigling in Dutch Oven');
        expect(slot4.description).toMatch(/^Brot 4 aus dem Kühlschrank nehmen/);
    });

    it('at yield=1, no store event and no retrieve prefix', () => {
        const result = expandForYield(recipeWithHold, 0.5);  // N = 1
        const steps = result.phases[0].steps;
        expect(steps.find(s => s.id === 'bake-hold-store')).toBeUndefined();
        const slot1 = steps.find(s => s.id === 'bake-1');
        expect(slot1.description).toBe('Teigling in Dutch Oven');
    });

    it('at yield=2, store event describes only loaf 2', () => {
        const result = expandForYield(recipeWithHold, 1);  // N = 2
        const storeStep = result.phases[0].steps.find(s => s.id === 'bake-hold-store');
        expect(storeStep.description).toContain('Brot 2 in den Kühlschrank stellen');
        expect(storeStep.description).not.toContain('Brot 3');
    });

    it('scales step duration linearly when scalesWithYield: true', () => {
        const recipe = {
            baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'shape', name: 'Shape', duration: { min: 15, ideal: 20, max: 30 }, description: 'Shape', scalesWithYield: true },
                    { id: 'bake', name: 'Bake', duration: { min: 60, ideal: 60, max: 60 }, dependsOn: 'shape', description: 'Bake', perUnit: true },
                ],
            }],
        };
        const result = expandForYield(recipe, 2);  // N = 4, ratio 4/2 = 2
        const shape = result.phases[0].steps.find(s => s.id === 'shape');
        expect(shape.duration).toEqual({ min: 30, ideal: 40, max: 60 });
    });

    it('does not scale duration when scalesWithYield is absent', () => {
        const recipe = {
            baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'mix', name: 'Mix', duration: { min: 5, ideal: 10, max: 15 }, description: 'Mix' },
                    { id: 'bake', name: 'Bake', duration: { min: 60, ideal: 60, max: 60 }, dependsOn: 'mix', description: 'Bake', perUnit: true },
                ],
            }],
        };
        const result = expandForYield(recipe, 2);
        const mix = result.phases[0].steps.find(s => s.id === 'mix');
        expect(mix.duration).toEqual({ min: 5, ideal: 10, max: 15 });
    });

    it('rounds scaled durations to integers', () => {
        const recipe = {
            baseYield: { amount: 3, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'shape', name: 'Shape', duration: { min: 10, ideal: 10, max: 10 }, description: 'Shape', scalesWithYield: true },
                    { id: 'bake', name: 'Bake', duration: { min: 60, ideal: 60, max: 60 }, dependsOn: 'shape', description: 'Bake', perUnit: true },
                ],
            }],
        };
        const result = expandForYield(recipe, 2/3);  // N = 2, ratio 2/3
        const shape = result.phases[0].steps.find(s => s.id === 'shape');
        expect(shape.duration.ideal).toBe(Math.round(10 * 2 / 3));
        expect(shape.duration.min).toBe(Math.round(10 * 2 / 3));
        expect(shape.duration.max).toBe(Math.round(10 * 2 / 3));
    });

    it('activates transform mode via scalesWithYield alone (no perUnit needed)', () => {
        // Even if no perUnit step exists, if any step has scalesWithYield the
        // recipe is in transform mode. Currently the detector only looks for
        // perUnit. This test documents the CURRENT behavior — the recipe would
        // be returned unchanged. If you change the detector, update this test.
        const recipe = {
            baseYield: { amount: 2, unit: 'loaves', weightPerUnit: { min: 800, max: 900 } },
            phases: [{
                id: 'p', name: 'p',
                steps: [
                    { id: 'shape', name: 'Shape', duration: { min: 10, ideal: 10, max: 10 }, description: 'Shape', scalesWithYield: true },
                ],
            }],
        };
        const result = expandForYield(recipe, 2);
        // The expected behavior per the plan: transform mode is only activated by
        // perUnit. A recipe with scalesWithYield but no perUnit returns unchanged.
        expect(result).toBe(recipe);
    });
});
