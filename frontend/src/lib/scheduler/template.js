/**
 * Resolve template placeholders in step descriptions.
 * {{ingredient:NAME}} -> "scaled_amount unit"
 * {{yield:amount}} -> baseYield.amount * multiplier
 * {{yield:weightPerUnit}} -> "min-max"
 */
export function resolveTemplate(templateStr, recipe, multiplier) {
    if (!templateStr) return '';

    let result = templateStr;

    // Resolve ingredient placeholders
    result = result.replace(/\{\{ingredient:([^}]+)\}\}/g, (match, name) => {
        for (const group of recipe.ingredientGroups) {
            const item = group.items.find(i => i.name === name);
            if (item) {
                const amount = item.scalable ? item.amount * multiplier : item.amount;
                const formatted = Number.isInteger(amount) ? amount : parseFloat(amount.toFixed(1));
                return `${formatted} ${item.unit}`;
            }
        }
        return match; // leave as-is if not found
    });

    // Resolve yield placeholders
    result = result.replace(/\{\{yield:amount\}\}/g, () => {
        return String(recipe.baseYield.amount * multiplier);
    });

    result = result.replace(/\{\{yield:weightPerUnit\}\}/g, () => {
        const w = recipe.baseYield.weightPerUnit;
        return `${w.min}-${w.max}`;
    });

    return result;
}
