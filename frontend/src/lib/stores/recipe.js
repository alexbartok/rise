import { writable, derived } from 'svelte/store';

export const recipe = writable(null);
export const multiplier = writable(1);
export const optionals = writable({}); // { [id]: boolean }

export const scaledIngredients = derived(
    [recipe, multiplier, optionals],
    ([$recipe, $multiplier, $optionals]) => {
        if (!$recipe) return [];
        return $recipe.ingredientGroups.map(group => ({
            ...group,
            items: group.items.map(item => ({
                ...item,
                scaledAmount: item.scalable ? item.amount * $multiplier : item.amount,
                enabled: !item.optional || $optionals[`ingredient:${item.name}`] === true,
            })),
        }));
    }
);
