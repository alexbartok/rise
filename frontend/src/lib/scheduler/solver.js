import { buildGraph, topologicalSort, filterOptionals } from './graph.js';

/**
 * Format a duration in minutes into a human-readable string like "2d 2h 35min".
 */
export function formatDuration(minutes) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}min`);
    return parts.join(' ');
}

/**
 * Parse a time string like "23:00" into hours (23) and minutes (0).
 */
function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
}

/**
 * Check if a given Date falls within the unsocial hours window.
 * Handles midnight crossing (e.g., 23:00 to 07:00).
 */
function isInUnsocialHours(date, unsocialStart, unsocialEnd) {
    const start = parseTime(unsocialStart);
    const end = parseTime(unsocialEnd);
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    const dateMinutes = date.getHours() * 60 + date.getMinutes();

    if (startMinutes > endMinutes) {
        // Crosses midnight: unsocial if >= start OR < end
        return dateMinutes >= startMinutes || dateMinutes < endMinutes;
    } else {
        // Same day: unsocial if >= start AND < end
        return dateMinutes >= startMinutes && dateMinutes < endMinutes;
    }
}

/**
 * Check if any part of [start, end] overlaps with unsocial hours.
 */
function overlapsUnsocialHours(start, end, unsocialStart, unsocialEnd) {
    // Check at start, end, and every 15-minute interval between
    const interval = 15 * 60000; // 15 minutes
    let t = start.getTime();
    const endTime = end.getTime();

    while (t < endTime) {
        if (isInUnsocialHours(new Date(t), unsocialStart, unsocialEnd)) {
            return true;
        }
        t += interval;
    }
    // Also check the end time itself
    if (isInUnsocialHours(end, unsocialStart, unsocialEnd)) {
        return true;
    }
    return false;
}

/**
 * Flatten steps from all phases, attaching phaseId and phaseName.
 */
function flattenSteps(recipe) {
    const steps = [];
    for (const phase of recipe.phases) {
        for (const step of phase.steps) {
            steps.push({
                ...step,
                phaseId: phase.id,
                phaseName: phase.name,
            });
        }
    }
    return steps;
}

/**
 * Build a scheduled step object from a raw step and computed times.
 */
function buildScheduledStep(step, start, end) {
    const durationMs = end.getTime() - start.getTime();
    return {
        id: step.id,
        name: step.name,
        emoji: step.emoji || null,
        type: step.type,
        start: new Date(start),
        end: new Date(end),
        duration: durationMs / 60000,
        idealDuration: step.duration.ideal,
        minDuration: step.duration.min,
        maxDuration: step.duration.max,
        flexPriority: step.flexPriority,
        mustAvoid: step.unsocialHours?.mustAvoid ?? false,
        canOverlap: step.unsocialHours?.canOverlap ?? false,
        inUnsocialHours: false, // will be set later
        phaseId: step.phaseId,
        phaseName: step.phaseName,
        dependsOn: step.dependsOn,
        alarm: step.alarm || { enabled: false, offsetMinutes: 0 },
        description: step.description || '',
        gapAfterPrevious: step.gapAfterPrevious || null,
    };
}

/**
 * Schedule steps backward from targetTime.
 */
function scheduleBackward(sortedSteps, graph, targetTime) {
    const scheduled = new Map();
    const reversed = [...sortedSteps].reverse();

    for (const step of reversed) {
        const succs = graph.successors.get(step.id) || [];
        // Filter to only successors that are actually in our sorted steps
        const activeSuccs = succs.filter(id => scheduled.has(id));

        let end;
        if (activeSuccs.length === 0) {
            // Terminal step: ends at target time
            end = new Date(targetTime);
        } else {
            // End time is the earliest successor start, adjusted for gaps
            let earliestSuccStart = Infinity;
            for (const succId of activeSuccs) {
                const succScheduled = scheduled.get(succId);
                const succStep = graph.steps.get(succId);
                let effectiveStart = succScheduled.start.getTime();

                // If the successor has gapAfterPrevious, subtract the ideal gap
                if (succStep.gapAfterPrevious) {
                    effectiveStart -= succStep.gapAfterPrevious.ideal * 60000;
                }

                if (effectiveStart < earliestSuccStart) {
                    earliestSuccStart = effectiveStart;
                }
            }
            end = new Date(earliestSuccStart);
        }

        const durationMs = step.duration.ideal * 60000;
        const start = new Date(end.getTime() - durationMs);

        scheduled.set(step.id, buildScheduledStep(step, start, end));
    }

    return scheduled;
}

/**
 * Schedule steps forward from targetTime.
 */
function scheduleForward(sortedSteps, graph, targetTime) {
    const scheduled = new Map();

    for (const step of sortedSteps) {
        const preds = graph.predecessors.get(step.id) || [];
        const activePreds = preds.filter(id => scheduled.has(id));

        let start;
        if (activePreds.length === 0) {
            // Root step: starts at target time
            start = new Date(targetTime);
        } else {
            // Start time is the latest predecessor end, adjusted for gaps
            let latestPredEnd = -Infinity;
            for (const predId of activePreds) {
                const predScheduled = scheduled.get(predId);
                let effectiveEnd = predScheduled.end.getTime();

                // If this step has gapAfterPrevious, add the ideal gap
                if (step.gapAfterPrevious) {
                    effectiveEnd += step.gapAfterPrevious.ideal * 60000;
                }

                if (effectiveEnd > latestPredEnd) {
                    latestPredEnd = effectiveEnd;
                }
            }
            start = new Date(latestPredEnd);
        }

        const durationMs = step.duration.ideal * 60000;
        const end = new Date(start.getTime() + durationMs);

        scheduled.set(step.id, buildScheduledStep(step, start, end));
    }

    return scheduled;
}

/**
 * Check unsocial hours violations and generate structured warnings.
 * Returns warnings with structured data (no pre-formatted messages).
 */
function checkUnsocialHours(scheduledSteps, unsocialStart, unsocialEnd) {
    const warnings = [];

    for (const step of scheduledSteps) {
        const inUnsocial = overlapsUnsocialHours(step.start, step.end, unsocialStart, unsocialEnd);
        step.inUnsocialHours = inUnsocial;

        if (inUnsocial && step.mustAvoid && !step.canOverlap) {
            warnings.push({
                stepId: step.id,
                stepName: step.name,
                type: 'unsocial',
            });
        }
    }

    return warnings;
}

/**
 * Find the smallest target-time shift (in the given direction) that produces
 * a conflict-free schedule.  Uses a two-pass search: coarse 1-hour steps first,
 * then refines with 15-minute steps in the hour before the first hit.
 *
 * @param {Object} recipe
 * @param {Object} options  - scheduling options (targetTime will be overridden)
 * @param {'earlier'|'later'} shiftDirection
 * @returns {{ minutes: number, formattedDuration: string, resultTime: Date } | null}
 */
export function findConflictFreeShift(recipe, options, shiftDirection) {
    const sign = shiftDirection === 'later' ? 1 : -1;

    // Coarse search: 1-hour steps up to 12 hours
    let coarseHit = null;
    for (let shift = 60; shift <= 720; shift += 60) {
        const newTarget = new Date(options.targetTime.getTime() + sign * shift * 60000);
        const result = computeVariant(recipe, { ...options, targetTime: newTarget });
        if (result.warnings.length === 0) {
            coarseHit = shift;
            break;
        }
    }
    if (coarseHit === null) return null;

    // Fine search: 15-minute steps in the hour before the coarse hit
    let bestShift = coarseHit;
    for (let shift = coarseHit - 45; shift < coarseHit; shift += 15) {
        if (shift <= 0) continue;
        const newTarget = new Date(options.targetTime.getTime() + sign * shift * 60000);
        const result = computeVariant(recipe, { ...options, targetTime: newTarget });
        if (result.warnings.length === 0) {
            bestShift = shift;
            break;
        }
    }

    const resultTime = new Date(options.targetTime.getTime() + sign * bestShift * 60000);
    return {
        minutes: bestShift,
        formattedDuration: formatDuration(bestShift),
        resultTime,
    };
}

/**
 * Estimate how many minutes a step overlaps with unsocial hours.
 * Used internally by tryFlexing to guide duration adjustments.
 */
function estimateUnsocialOverlap(step, unsocialStart, unsocialEnd) {
    let overlapMinutes = 0;
    const interval = 1 * 60000; // 1-minute granularity
    let t = step.start.getTime();
    const endT = step.end.getTime();

    while (t < endT) {
        if (isInUnsocialHours(new Date(t), unsocialStart, unsocialEnd)) {
            overlapMinutes++;
        }
        t += interval;
    }
    return overlapMinutes;
}

/**
 * Attempt to flex step durations to resolve unsocial hour violations.
 * Uses a smart algorithm: calculates the exact duration adjustment needed
 * rather than just trying min/max.
 */
function tryFlexing(sortedSteps, graph, targetTime, direction, unsocialStart, unsocialEnd) {
    // Get initial schedule with ideal durations
    let scheduled = direction === 'backward'
        ? scheduleBackward(sortedSteps, graph, targetTime)
        : scheduleForward(sortedSteps, graph, targetTime);

    let stepsList = sortedSteps.map(s => scheduled.get(s.id));
    let warnings = checkUnsocialHours(stepsList, unsocialStart, unsocialEnd);

    if (warnings.length === 0) {
        return { scheduled, warnings };
    }

    // Calculate the maximum overlap across all violating steps
    let maxShiftNeeded = 0;
    for (const warning of warnings) {
        const step = stepsList.find(s => s.id === warning.stepId);
        if (step) {
            const overlap = estimateUnsocialOverlap(step, unsocialStart, unsocialEnd);
            if (overlap > maxShiftNeeded) {
                maxShiftNeeded = overlap;
            }
        }
    }

    if (maxShiftNeeded === 0) {
        return { scheduled, warnings };
    }

    // Get flexible steps sorted by flexPriority descending (most flexible first)
    const flexibleSteps = [...sortedSteps]
        .filter(s => s.flexPriority > 1)
        .sort((a, b) => b.flexPriority - a.flexPriority);

    let remainingShift = maxShiftNeeded;

    for (const flexStep of flexibleSteps) {
        if (remainingShift <= 0) break;

        const originalIdeal = flexStep.duration.ideal;

        const maxReduction = originalIdeal - flexStep.duration.min;
        const maxExpansion = flexStep.duration.max - originalIdeal;

        // Try reduction first (most common for backward scheduling)
        if (maxReduction > 0) {
            const adjustment = Math.min(remainingShift, maxReduction);
            flexStep.duration = { ...flexStep.duration, ideal: originalIdeal - adjustment };

            // Recompute schedule
            scheduled = direction === 'backward'
                ? scheduleBackward(sortedSteps, graph, targetTime)
                : scheduleForward(sortedSteps, graph, targetTime);
            stepsList = sortedSteps.map(s => scheduled.get(s.id));
            warnings = checkUnsocialHours(stepsList, unsocialStart, unsocialEnd);

            if (warnings.length === 0) {
                return { scheduled, warnings };
            }

            // Recalculate remaining shift needed
            remainingShift = 0;
            for (const w of warnings) {
                const step = stepsList.find(s => s.id === w.stepId);
                if (step) {
                    const overlap = estimateUnsocialOverlap(step, unsocialStart, unsocialEnd);
                    if (overlap > remainingShift) remainingShift = overlap;
                }
            }

            if (remainingShift <= 0) {
                return { scheduled, warnings };
            }

            continue;
        }

        // Try expansion if reduction didn't work or wasn't available
        if (maxExpansion > 0) {
            const adjustment = Math.min(remainingShift, maxExpansion);
            flexStep.duration = { ...flexStep.duration, ideal: originalIdeal + adjustment };

            scheduled = direction === 'backward'
                ? scheduleBackward(sortedSteps, graph, targetTime)
                : scheduleForward(sortedSteps, graph, targetTime);
            stepsList = sortedSteps.map(s => scheduled.get(s.id));
            warnings = checkUnsocialHours(stepsList, unsocialStart, unsocialEnd);

            if (warnings.length === 0) {
                return { scheduled, warnings };
            }

            remainingShift = 0;
            for (const w of warnings) {
                const step = stepsList.find(s => s.id === w.stepId);
                if (step) {
                    const overlap = estimateUnsocialOverlap(step, unsocialStart, unsocialEnd);
                    if (overlap > remainingShift) remainingShift = overlap;
                }
            }

            if (remainingShift <= 0) {
                return { scheduled, warnings };
            }

            continue;
        }
    }

    // Second pass: try expansion on top of any reductions made above
    if (warnings.length > 0) {
        remainingShift = 0;
        for (const w of warnings) {
            const step = stepsList.find(s => s.id === w.stepId);
            if (step) {
                const overlap = estimateUnsocialOverlap(step, unsocialStart, unsocialEnd);
                if (overlap > remainingShift) remainingShift = overlap;
            }
        }

        for (const flexStep of flexibleSteps) {
            if (remainingShift <= 0) break;

            const currentIdeal = flexStep.duration.ideal;
            const maxExpansion = flexStep.duration.max - currentIdeal;

            if (maxExpansion > 0) {
                const adjustment = Math.min(remainingShift, maxExpansion);
                flexStep.duration = { ...flexStep.duration, ideal: currentIdeal + adjustment };

                scheduled = direction === 'backward'
                    ? scheduleBackward(sortedSteps, graph, targetTime)
                    : scheduleForward(sortedSteps, graph, targetTime);
                stepsList = sortedSteps.map(s => scheduled.get(s.id));
                warnings = checkUnsocialHours(stepsList, unsocialStart, unsocialEnd);

                if (warnings.length === 0) {
                    return { scheduled, warnings };
                }

                remainingShift = 0;
                for (const w of warnings) {
                    const step = stepsList.find(s => s.id === w.stepId);
                    if (step) {
                        const overlap = estimateUnsocialOverlap(step, unsocialStart, unsocialEnd);
                        if (overlap > remainingShift) remainingShift = overlap;
                    }
                }
            }
        }
    }

    // Final recompute with whatever adjustments stuck
    scheduled = direction === 'backward'
        ? scheduleBackward(sortedSteps, graph, targetTime)
        : scheduleForward(sortedSteps, graph, targetTime);
    stepsList = sortedSteps.map(s => scheduled.get(s.id));
    warnings = checkUnsocialHours(stepsList, unsocialStart, unsocialEnd);

    return { scheduled, warnings };
}


/**
 * Compare two step lists and find what changed (duration adjustments).
 */
function computeAdjustments(originalSteps, variantSteps) {
    const adjustments = [];
    for (const orig of originalSteps) {
        const variant = variantSteps.find(s => s.id === orig.id);
        if (!variant) continue;

        // Check duration change (threshold: > 1 minute difference)
        if (Math.abs(variant.duration - orig.duration) > 1) {
            adjustments.push({
                stepId: orig.id,
                stepName: orig.name,
                field: 'duration',
                from: orig.duration,
                to: variant.duration,
                delta: variant.duration - orig.duration,
            });
        }
    }
    return adjustments;
}

/**
 * Internal scheduling function that performs the core schedule computation.
 * Used by both computeSchedule (public) and computeVariant (internal)
 * to avoid infinite recursion when generating variants.
 *
 * @param {Object} recipe - Recipe with phases containing steps
 * @param {Object} options - Scheduling options
 * @returns {Object} Core schedule result (without variants)
 */
function computeScheduleCore(recipe, options) {
    const {
        direction = 'backward',
        targetTime,
        optionals = {},
        unsocialStart = '23:00',
        unsocialEnd = '07:00',
    } = options;

    // 1. Flatten steps from all phases
    const allSteps = flattenSteps(recipe);

    // 2. Filter optionals
    const activeSteps = filterOptionals(allSteps, optionals);

    // 3. Topological sort
    const sortedSteps = topologicalSort(activeSteps);

    // 4. Build graph for scheduling
    const graph = buildGraph(sortedSteps);

    // 5 & 6. Schedule and check unsocial hours, with flexing attempt
    const { scheduled, warnings } = tryFlexing(
        sortedSteps, graph, targetTime, direction, unsocialStart, unsocialEnd
    );

    // 7. Build final steps list in topological order
    const steps = sortedSteps.map(s => scheduled.get(s.id));

    // 8. Shift options are computed in computeSchedule (not here)
    const shiftRequired = warnings.length > 0;

    // 9. Compute overall schedule boundaries
    let startTime = null;
    let endTime = null;
    for (const step of steps) {
        if (!startTime || step.start < startTime) startTime = step.start;
        if (!endTime || step.end > endTime) endTime = step.end;
    }

    const totalDuration = startTime && endTime
        ? (endTime.getTime() - startTime.getTime()) / 60000
        : 0;

    return {
        steps,
        warnings,
        shiftRequired,
        totalDuration,
        startTime,
        endTime,
    };
}

/**
 * Compute a variant schedule (full scheduling but without generating more variants).
 */
function computeVariant(recipe, options) {
    const result = computeScheduleCore(recipe, options);
    return {
        steps: result.steps,
        warnings: result.warnings,
        startTime: result.startTime,
        endTime: result.endTime,
    };
}

/**
 * Main scheduling function.
 *
 * @param {Object} recipe - Recipe with phases containing steps
 * @param {Object} options - Scheduling options
 * @param {string} options.direction - 'backward' or 'forward'
 * @param {Date} options.targetTime - Target end time (backward) or start time (forward)
 * @param {number} options.multiplier - Yield multiplier (reserved for future use)
 * @param {Object} options.optionals - Map of optional step id -> enabled boolean
 * @param {string} options.unsocialStart - Start of unsocial hours (e.g., "23:00")
 * @param {string} options.unsocialEnd - End of unsocial hours (e.g., "07:00")
 * @returns {Object} Schedule result
 */
export function computeSchedule(recipe, options) {
    const {
        direction = 'backward',
        targetTime,
    } = options;

    // Core schedule computation
    const core = computeScheduleCore(recipe, options);

    const { steps, warnings, shiftRequired, totalDuration, startTime, endTime } = core;

    // Compute shift options using iterative search
    const shiftOptions = shiftRequired ? {
        earlier: findConflictFreeShift(recipe, options, 'earlier'),
        later: findConflictFreeShift(recipe, options, 'later'),
    } : null;

    // Generate variants when there are unresolved conflicts
    let variants = [];
    if (warnings.length > 0 && shiftOptions) {
        // Variant 0: current (with conflicts) — always included
        variants.push({
            id: 'current',
            targetTime: new Date(targetTime),
            schedule: { steps: [...steps], warnings: [...warnings], startTime, endTime },
            adjustments: [],
        });

        // Variant 1: earlier target time
        if (shiftOptions.earlier) {
            const earlierResult = computeVariant(recipe, {
                ...options,
                targetTime: shiftOptions.earlier.resultTime,
            });
            // Only include if truly conflict-free
            if (earlierResult.warnings.length === 0) {
                variants.push({
                    id: direction === 'backward' ? 'earlier' : 'forwardEarlier',
                    targetTime: new Date(shiftOptions.earlier.resultTime),
                    schedule: earlierResult,
                    adjustments: computeAdjustments(steps, earlierResult.steps),
                });
            }
        }

        // Variant 2: later target time
        if (shiftOptions.later) {
            const laterResult = computeVariant(recipe, {
                ...options,
                targetTime: shiftOptions.later.resultTime,
            });
            // Only include if truly conflict-free
            if (laterResult.warnings.length === 0) {
                variants.push({
                    id: direction === 'backward' ? 'later' : 'forwardLater',
                    targetTime: new Date(shiftOptions.later.resultTime),
                    schedule: laterResult,
                    adjustments: computeAdjustments(steps, laterResult.steps),
                });
            }
        }
    }

    return {
        steps,
        warnings,
        shiftRequired,
        shiftOptions,
        totalDuration,
        startTime,
        endTime,
        variants,
    };
}

/**
 * Compute a surplus (reactivation) schedule by backward-scheduling a flat
 * array of steps from a target time.  No flex/unsocial-hours resolution is
 * performed — ideal durations are always used.
 *
 * @param {Array} reactivationSteps - Flat array of step objects (no phases)
 * @param {Object} options
 * @param {Date}   options.targetTime    - When the surplus bake should finish
 * @param {string} options.unsocialStart - e.g. "23:00" (unused, kept for API symmetry)
 * @param {string} options.unsocialEnd   - e.g. "07:00" (unused, kept for API symmetry)
 * @returns {{ steps: Array, warnings: Array, startTime: Date|null, endTime: Date|null }}
 */
export function computeSurplusSchedule(reactivationSteps, options) {
    const { targetTime } = options;

    if (!reactivationSteps || reactivationSteps.length === 0 || !targetTime) {
        return { steps: [], warnings: [], startTime: null, endTime: null };
    }

    // Topological sort & build graph
    const sortedSteps = topologicalSort(reactivationSteps);
    const graph = buildGraph(sortedSteps);

    // Backward schedule from target time (uses ideal durations)
    const scheduled = scheduleBackward(sortedSteps, graph, targetTime);

    // Build ordered steps list
    const steps = sortedSteps.map(s => scheduled.get(s.id));

    // Compute boundaries
    let startTime = null;
    let endTime = null;
    for (const step of steps) {
        if (!startTime || step.start < startTime) startTime = step.start;
        if (!endTime || step.end > endTime) endTime = step.end;
    }

    return { steps, warnings: [], startTime, endTime };
}
