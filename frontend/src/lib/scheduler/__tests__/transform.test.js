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
});
