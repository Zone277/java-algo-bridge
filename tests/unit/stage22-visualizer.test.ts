import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('13/203/349 shared reference player integration', () => {
  for (const id of ['13', '203', '349'] as const) {
    it(`${id} renders input-bound predictions from immutable reference snapshots`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const demo = runtime.demoInputs[0]!;
      const trace = await runtime.buildTrace(demo.input, demo.id);
      expect(Object.isFrozen(trace)).toBe(true);
      expect(trace.referenceSourceHash).toBe(runtime.lesson.reference.sourceHash);
      expect(trace.finalOutput).toEqual(expectedOutput(id, demo.input as never));
      for (const check of runtime.lesson.predictionChecks) {
        const index = trace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(runtime.predictionAt(trace, index)?.answer).toEqual(check.answer);
      }
      for (const state of [trace.initialState, ...trace.snapshots]) {
        expect(Object.isFrozen(state)).toBe(true);
        for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
      }
      for (const snapshot of trace.snapshots) {
        const mapped = runtime.lesson.reference.stepMap.find(step => step.stepId === snapshot.stepId);
        expect(mapped, `missing code mapping for ${snapshot.stepId}`).toBeDefined();
        expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
      }
      const html = renderToStaticMarkup(createElement(ReferencePlayer, {
        trace, source: runtime.lesson.reference.source, predictionAt: index => runtime.predictionAt(trace, index),
        predictionResults: [], onPrediction: () => {}, onViewSolution: () => {},
      }));
      expect(html).toContain('下一步');
      expect(html).toContain('参考解法');
    });
  }

  it('203 keeps repeated values as distinct stable objects after unlinking a matching node', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '203')!;
    const trace = await runtime.buildTrace({ head: [5, 5, 6, 5], val: 6 }, 'identity');
    const initial = trace.initialState.structures.find(item => item.kind === 'list');
    expect(initial?.kind).toBe('list');
    if (initial?.kind === 'list') {
      expect(initial.nodes.map(node => node.id)).toEqual(['h0', 'h1', 'h2', 'h3']);
      expect(initial.nodes.filter(node => node.value === 5).map(node => node.id)).toEqual(['h0', 'h1', 'h3']);
    }
    const skipped = trace.snapshots.find(snapshot => snapshot.stepId === 'skip-node')!;
    const list = skipped.structures.find(item => item.kind === 'list');
    expect(list?.kind).toBe('list');
    if (list?.kind === 'list') {
      expect(list.nodes.find(node => node.id === 'h1')?.nextId).toBe('h3');
      expect(list.nodes.find(node => node.id === 'h2')).toEqual({ id: 'h2', value: 6, nextId: 'h3' });
    }
    expect(skipped.explanation).toContain('不可据此推断垃圾回收');
  });

  it('349 preserves both input arrays and stores each common value once', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '349')!;
    const trace = await runtime.buildTrace({ nums1: [1, 2, 2, 1], nums2: [2, 2] }, 'sets');
    const final = trace.snapshots.at(-1)!;
    const arrays = final.structures.filter(item => item.kind === 'array');
    expect(arrays.find(item => item.id === 'nums1')?.values).toEqual([1, 2, 2, 1]);
    expect(arrays.find(item => item.id === 'nums2')?.values).toEqual([2, 2]);
    expect(arrays.find(item => item.id === 'result')?.values).toEqual([2]);
  });
});
