import { writable, derived } from 'svelte/store';
import { recipe, multiplier, optionals } from './recipe.js';
import { unsocialStart, unsocialEnd } from './settings.js';
import { computeSchedule, computeSurplusSchedule } from '../scheduler/solver.js';

export const direction = writable('backward');

// Default target: tomorrow at noon (fallback; RecipeView sets a smart target on load)
function defaultTarget() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
}
export const targetTime = writable(defaultTarget());

export const surplusConfig = writable({
    enabled: false,
    bakeNow: 0,
    forLater: 0,
    method: null,
    targetTime: null,
});

export const schedule = derived(
    [recipe, direction, targetTime, multiplier, optionals, unsocialStart, unsocialEnd],
    ([$recipe, $direction, $targetTime, $multiplier, $optionals, $unsocialStart, $unsocialEnd]) => {
        if (!$recipe || !$targetTime) return null;
        return computeSchedule($recipe, {
            direction: $direction,
            targetTime: $targetTime,
            multiplier: $multiplier,
            optionals: $optionals,
            unsocialStart: $unsocialStart,
            unsocialEnd: $unsocialEnd,
        });
    }
);

export const surplusSchedule = derived(
    [recipe, surplusConfig, unsocialStart, unsocialEnd],
    ([$recipe, $surplusConfig, $unsocialStart, $unsocialEnd]) => {
        if (!$recipe || !$surplusConfig.enabled || !$surplusConfig.method || !$surplusConfig.targetTime || $surplusConfig.forLater <= 0) {
            return null;
        }
        const option = $recipe.surplus?.options?.find(o => o.id === $surplusConfig.method);
        if (!option) return null;
        return computeSurplusSchedule(option.reactivationSteps, {
            targetTime: $surplusConfig.targetTime,
            unsocialStart: $unsocialStart,
            unsocialEnd: $unsocialEnd,
        });
    }
);
