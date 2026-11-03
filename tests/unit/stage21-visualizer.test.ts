import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, StructureRenderer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('27/111/205 shared reference player integration', () => {
  for (const id of ['27', '111', '205'] as const) {
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

  it('27 keeps the valid prefix separate from the untouched suffix throughout the stable reference scan', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '27')!;
    const trace = await runtime.buildTrace({ nums: [3, 2, 2, 3], val: 3 }, 'prefix-invariant');
    const final = trace.snapshots.at(-1)!;
    const nums = final.structures.find(item => item.kind === 'array' && item.id === 'nums');
    const prefix = final.structures.find(item => item.kind === 'array' && item.id === 'submitted-prefix');
    expect(nums?.kind).toBe('array');
    expect(prefix?.kind).toBe('array');
    if (nums?.kind === 'array' && prefix?.kind === 'array') {
      expect(prefix.values).toEqual([2, 2]);
      expect(nums.values.slice(0, prefix.values.length)).toEqual(prefix.values);
      expect(nums.values.length).toBe(4);
    }
  });

  it('111 preserves stable node identity and returns through the non-empty child of a one-child node', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '111')!;
    const trace = await runtime.buildTrace({ root: [1, null, 2, 3] }, 'one-child');
    const initial = trace.initialState.structures.find(item => item.kind === 'tree');
    expect(initial?.kind).toBe('tree');
    if (initial?.kind === 'tree') {
      expect(initial.nodes.map(node => node.id)).toEqual(['t0', 't1', 't2']);
      expect(new Set(initial.nodes.map(node => node.id)).size).toBe(3);
    }
    const returned = trace.snapshots.find(snapshot => {
      const tree = snapshot.structures.find(item => item.kind === 'tree');
      return snapshot.stepId === 'return-only-child' && tree?.kind === 'tree' && tree.frames.length === 1;
    })!;
    const tree = returned.structures.find(item => item.kind === 'tree');
    expect(tree?.kind).toBe('tree');
    if (tree?.kind === 'tree') expect(tree.frames[0]).toMatchObject({ nodeId: 't0', leftDepth: 0, rightDepth: 2, returnValue: 3 });
  });

  it('205 exposes two distinct bounded sparse views of the int[128] last-seen arrays', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '205')!;
    const trace = await runtime.buildTrace({ s: 'paper', t: 'title' }, 'two-arrays');
    const final = trace.snapshots.at(-1)!;
    const maps = final.structures.filter(item => item.kind === 'map');
    expect(maps).toHaveLength(2);
    expect(maps.every(item => item.presentation === 'sparse-array')).toBe(true);
    expect(maps.map(item => item.id)).toEqual([
      'seenS 非零槽（int[128] 稀疏视图）',
      'seenT 非零槽（int[128] 稀疏视图）',
    ]);
    expect(maps.every(item => item.entries.length <= 30)).toBe(true);
    expect(final.explanation).toContain('返回 true');
    const html = maps.map(structure => renderToStaticMarkup(createElement(StructureRenderer, { structure, snapshot: final }))).join('');
    expect(html).toContain('参考 Java 使用数组，不是 Map');
    expect(html).toContain('数组下标');
    expect(html).not.toContain('映射为空');
  });
});
