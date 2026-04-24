/**
 * Expand a recipe for a given yield multiplier: any step with perUnit: true is
 * replaced by N sequential slots chained via dependsOn, where N = the target
 * yield count (baseYield.amount × multiplier, rounded, minimum 1). Other steps
 * that depended on the per-unit step are rewired to depend on the final slot.
 *
 * If the recipe has no perUnit step, returns the recipe reference unchanged.
 *
 * @param {Object} recipe - Recipe with phases/steps
 * @param {number} multiplier - Yield multiplier (final units = baseYield.amount × multiplier)
 * @returns {Object} Expanded recipe (new object), or original reference if no-op
 */
export function expandForYield(recipe, multiplier) {
    const hasPerUnit = recipe.phases?.some(p =>
        p.steps?.some(s => s.perUnit === true)
    );
    if (!hasPerUnit) return recipe;

    const yieldCount = Math.max(1, Math.round(recipe.baseYield.amount * multiplier));

    const newPhases = recipe.phases.map(phase => ({
        ...phase,
        steps: expandPhaseSteps(phase.steps, yieldCount),
    }));

    return { ...recipe, phases: newPhases };
}

function expandPhaseSteps(steps, yieldCount) {
    const expanded = [];
    // lastSlotId is scoped per-phase. Cross-phase dependsOn rewiring is not
    // supported; current recipes don't need it. If that changes, lift this map
    // to expandForYield and pass it down.
    // Map: original perUnit step id → id of its last generated slot. Used to
    // rewire dependsOn links from steps that pointed at the per-unit step.
    const lastSlotId = new Map();

    for (const step of steps) {
        const rewiredDependsOn = step.dependsOn && lastSlotId.has(step.dependsOn)
            ? lastSlotId.get(step.dependsOn)
            : step.dependsOn;

        if (!step.perUnit) {
            expanded.push(rewiredDependsOn === step.dependsOn
                ? step
                : { ...step, dependsOn: rewiredDependsOn });
            continue;
        }

        // Expand into yieldCount sequential slots
        let prevId = rewiredDependsOn;
        for (let k = 1; k <= yieldCount; k++) {
            const slotId = `${step.id}-${k}`;
            const { perUnit: _pu, hold: _h, ...rest } = step;
            expanded.push({
                ...rest,
                id: slotId,
                name: `${step.name} (${k}/${yieldCount})`,
                dependsOn: prevId,
            });
            prevId = slotId;
        }
        lastSlotId.set(step.id, `${step.id}-${yieldCount}`);
    }

    return expanded;
}
