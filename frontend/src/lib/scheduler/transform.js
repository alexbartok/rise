/**
 * Expand a recipe for a given yield multiplier, unrolling any perUnit steps
 * into N sequential slots and generating hold events for overflow units.
 *
 * If the recipe has no perUnit steps, returns the recipe reference unchanged.
 *
 * @param {Object} recipe - Recipe with phases/steps
 * @param {number} multiplier - Yield multiplier (1 = baseYield.amount units)
 * @returns {Object} Expanded recipe (same shape), or original if no-op
 */
export function expandForYield(recipe, multiplier) {
    const hasPerUnit = recipe.phases?.some(p =>
        p.steps?.some(s => s.perUnit === true)
    );
    if (!hasPerUnit) return recipe;

    // TODO: real expansion in next task
    return recipe;
}
