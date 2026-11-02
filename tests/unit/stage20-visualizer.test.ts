import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, StructureRenderer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('26/100/141 shared reference player integration', () => {
  for (const id of ['26', '100', '141'] as const) {
    it(`${id} renders live predictions from immutable reference snapshots`, async () => {
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

  it('100 keeps equal-valued nodes from two trees as distinct identities', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '100')!;
    const trace = await runtime.buildTrace({ p: [5, 5], q: [5, 5] }, 'distinct-trees');
    const structures = trace.initialState.structures.filter(item => item.kind === 'tree');
    const ids = structures.flatMap(tree => tree.kind === 'tree' ? tree.nodes.map(node => node.id) : []);
    expect(ids).toEqual(['p0', 'p1', 'q0', 'q1']);
    expect(new Set(ids).size).toBe(4);
  });

  it('141 renders cyclic next fields without merging repeated-value nodes', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '141')!;
    const trace = await runtime.buildTrace({ head: [5, 5, 5], pos: 1 }, 'repeat-cycle');
    const list = trace.initialState.structures.find(item => item.kind === 'list');
    expect(list?.kind).toBe('list');
    if (list?.kind !== 'list') return;
    expect(list.nodes.map(node => node.id)).toEqual(['h0', 'h1', 'h2']);
    expect(list.nodes[2]!.nextId).toBe('h1');
    const html = renderToStaticMarkup(createElement(StructureRenderer, { structure: list, snapshot: trace.initialState }));
    expect(html.match(/data-node-id=/g)).toHaveLength(3);
    expect(html).toContain('marker-end=');
    expect(html).toContain('<td>h2</td><td>5</td><td>h1</td>');
    for (const state of [trace.initialState, ...trace.snapshots]) {
      const current = state.structures.find(item => item.kind === 'list');
      expect(current?.kind).toBe('list');
      if (current?.kind === 'list') expect(current.nodes.map(node => node.nextId)).toEqual(['h1', 'h2', 'h1']);
    }

    const selfLoopTrace = await runtime.buildTrace({ head: [9], pos: 0 }, 'self-loop');
    const selfLoop = selfLoopTrace.initialState.structures.find(item => item.kind === 'list');
    expect(selfLoop?.kind).toBe('list');
    if (selfLoop?.kind === 'list') {
      const selfLoopHtml = renderToStaticMarkup(createElement(StructureRenderer, { structure: selfLoop, snapshot: selfLoopTrace.initialState }));
      expect(selfLoopHtml).toContain('marker-end=');
      expect(selfLoopHtml).toContain('<td>h0</td><td>9</td><td>h0</td>');
    }
  });
});
