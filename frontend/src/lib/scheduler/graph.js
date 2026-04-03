/**
 * Build adjacency lists from steps.
 * @param {Array} steps - Array of step objects with id and dependsOn
 * @returns {{ successors: Map, predecessors: Map, steps: Map }}
 */
export function buildGraph(steps) {
    const successors = new Map();
    const predecessors = new Map();
    const stepMap = new Map();

    for (const step of steps) {
        stepMap.set(step.id, step);
        if (!successors.has(step.id)) successors.set(step.id, []);
        if (!predecessors.has(step.id)) predecessors.set(step.id, []);
    }

    for (const step of steps) {
        if (step.dependsOn) {
            successors.get(step.dependsOn).push(step.id);
            predecessors.get(step.id).push(step.dependsOn);
        }
    }

    return { successors, predecessors, steps: stepMap };
}

/**
 * Topological sort using Kahn's algorithm.
 */
export function topologicalSort(steps) {
    const graph = buildGraph(steps);
    const inDegree = new Map();
    const queue = [];
    const result = [];

    for (const step of steps) {
        inDegree.set(step.id, graph.predecessors.get(step.id).length);
    }

    for (const [id, degree] of inDegree) {
        if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
        const id = queue.shift();
        result.push(graph.steps.get(id));
        for (const succ of graph.successors.get(id)) {
            inDegree.set(succ, inDegree.get(succ) - 1);
            if (inDegree.get(succ) === 0) queue.push(succ);
        }
    }

    return result;
}

/**
 * Filter out disabled optional steps, relinking dependsOn chains.
 * If B is optional and removed, C (which depended on B) now depends on B's predecessor.
 */
export function filterOptionals(steps, enabledMap) {
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const removedIds = new Set();

    // Identify which optional steps are removed
    for (const step of steps) {
        if (step.optional && !enabledMap[step.id]) {
            removedIds.add(step.id);
        }
    }

    // For each removed step, find its effective predecessor (first non-removed ancestor)
    function findEffectivePredecessor(id) {
        const step = stepMap.get(id);
        if (!step || !step.dependsOn) return null;
        if (!removedIds.has(step.dependsOn)) return step.dependsOn;
        return findEffectivePredecessor(step.dependsOn);
    }

    return steps
        .filter(s => !removedIds.has(s.id))
        .map(s => {
            if (s.dependsOn && removedIds.has(s.dependsOn)) {
                return { ...s, dependsOn: findEffectivePredecessor(s.dependsOn) };
            }
            return s;
        });
}
