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
});
