import { describe, it, expect } from 'vitest';
import { buildGraph, topologicalSort, filterOptionals } from '../graph.js';

describe('buildGraph', () => {
    it('builds adjacency from step dependencies', () => {
        const steps = [
            { id: 'a', dependsOn: null },
            { id: 'b', dependsOn: 'a' },
            { id: 'c', dependsOn: 'b' },
        ];
        const graph = buildGraph(steps);
        expect(graph.successors.get('a')).toContain('b');
        expect(graph.successors.get('b')).toContain('c');
    });

    it('handles branches (multiple successors)', () => {
        const steps = [
            { id: 'a', dependsOn: null },
            { id: 'b', dependsOn: 'a' },
            { id: 'c', dependsOn: 'a' },
        ];
        const graph = buildGraph(steps);
        expect(graph.successors.get('a')).toEqual(expect.arrayContaining(['b', 'c']));
    });
});

describe('topologicalSort', () => {
    it('sorts linear chain', () => {
        const steps = [
            { id: 'c', dependsOn: 'b' },
            { id: 'a', dependsOn: null },
            { id: 'b', dependsOn: 'a' },
        ];
        const sorted = topologicalSort(steps);
        expect(sorted.map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('handles branches correctly', () => {
        const steps = [
            { id: 'a', dependsOn: null },
            { id: 'b', dependsOn: 'a' },
            { id: 'c', dependsOn: 'a' },
            { id: 'd', dependsOn: 'b' },
        ];
        const sorted = topologicalSort(steps);
        const ids = sorted.map(s => s.id);
        expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
        expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
        expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
    });
});

describe('filterOptionals', () => {
    it('removes optional steps and relinks dependencies', () => {
        const steps = [
            { id: 'a', dependsOn: null, optional: false },
            { id: 'b', dependsOn: 'a', optional: true },
            { id: 'c', dependsOn: 'b', optional: false },
        ];
        const filtered = filterOptionals(steps, {});
        expect(filtered.map(s => s.id)).toEqual(['a', 'c']);
        expect(filtered[1].dependsOn).toBe('a');
    });

    it('keeps optional steps when enabled', () => {
        const steps = [
            { id: 'a', dependsOn: null, optional: false },
            { id: 'b', dependsOn: 'a', optional: true },
        ];
        const filtered = filterOptionals(steps, { 'b': true });
        expect(filtered.map(s => s.id)).toEqual(['a', 'b']);
    });

    it('handles chain of optional steps', () => {
        const steps = [
            { id: 'a', dependsOn: null, optional: false },
            { id: 'b', dependsOn: 'a', optional: true },
            { id: 'c', dependsOn: 'b', optional: true },
            { id: 'd', dependsOn: 'c', optional: false },
        ];
        const filtered = filterOptionals(steps, {});
        expect(filtered.map(s => s.id)).toEqual(['a', 'd']);
        expect(filtered[1].dependsOn).toBe('a');
    });
});
