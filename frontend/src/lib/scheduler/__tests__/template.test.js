import { describe, it, expect } from 'vitest';
import { resolveTemplate } from '../template.js';

describe('resolveTemplate', () => {
    const recipe = {
        ingredientGroups: [
            { name: 'Biga', phase: 'biga-prep', items: [
                { name: 'Weizenmehl', amount: 1000, unit: 'g', scalable: true },
                { name: 'Wasser', amount: 450, unit: 'ml', scalable: true },
            ]},
            { name: 'Hauptteig', phase: 'main-dough', items: [
                { name: 'Salz', amount: 20, unit: 'g', scalable: true },
            ]},
        ],
        baseYield: { amount: 6, unit: 'Teiglinge', weightPerUnit: { min: 250, max: 260 } },
    };

    it('resolves ingredient placeholders with scaling', () => {
        const result = resolveTemplate('{{ingredient:Weizenmehl}} Mehl', recipe, 2);
        expect(result).toBe('2000 g Mehl');
    });

    it('resolves ingredient from different group', () => {
        const result = resolveTemplate('{{ingredient:Salz}} Salz', recipe, 1);
        expect(result).toBe('20 g Salz');
    });

    it('resolves yield amount', () => {
        const result = resolveTemplate('{{yield:amount}} Teiglinge', recipe, 2);
        expect(result).toBe('12 Teiglinge');
    });

    it('resolves yield weightPerUnit', () => {
        const result = resolveTemplate('à {{yield:weightPerUnit}} g', recipe, 1);
        expect(result).toBe('à 250-260 g');
    });

    it('handles multiple placeholders', () => {
        const result = resolveTemplate(
            '{{ingredient:Weizenmehl}} Mehl und {{ingredient:Wasser}} Wasser',
            recipe, 1
        );
        expect(result).toBe('1000 g Mehl und 450 ml Wasser');
    });

    it('leaves unknown placeholders as-is', () => {
        const result = resolveTemplate('{{ingredient:Unknown}}', recipe, 1);
        expect(result).toBe('{{ingredient:Unknown}}');
    });

    it('returns empty string for falsy input', () => {
        expect(resolveTemplate(null, recipe, 1)).toBe('');
        expect(resolveTemplate(undefined, recipe, 1)).toBe('');
        expect(resolveTemplate('', recipe, 1)).toBe('');
    });

    it('handles non-scalable ingredients', () => {
        const recipeWithNonScalable = {
            ...recipe,
            ingredientGroups: [
                { name: 'Test', phase: 'test', items: [
                    { name: 'Hefe', amount: 5, unit: 'g', scalable: false },
                ]},
            ],
        };
        const result = resolveTemplate('{{ingredient:Hefe}} Hefe', recipeWithNonScalable, 3);
        expect(result).toBe('5 g Hefe');
    });

    it('formats fractional amounts cleanly', () => {
        const recipeWithFraction = {
            ...recipe,
            ingredientGroups: [
                { name: 'Test', phase: 'test', items: [
                    { name: 'Zucker', amount: 3, unit: 'g', scalable: true },
                ]},
            ],
        };
        const result = resolveTemplate('{{ingredient:Zucker}}', recipeWithFraction, 1.5);
        expect(result).toBe('4.5 g');
    });
});
