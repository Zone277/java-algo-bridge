import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('34/202/387 reference player integration', () => {
  for (const id of ['34', '202', '387'] as const) {
    it(`${id} renders the fixed reference and links two real predictions`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const demo = runtime.demoInputs[0]!;
      const trace = await runtime.buildTrace(demo.input, demo.id);
      expect(trace.finalOutput).toEqual(expectedOutput(id, demo.input as never));
      for (const check of runtime.lesson.predictionChecks) {
        const index = trace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(runtime.predictionAt(trace, index)?.answer).toEqual(check.answer);
      }
      for (const state of [trace.initialState, ...trace.snapshots]) for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
      const html = renderToStaticMarkup(createElement(ReferencePlayer, {
        trace, source: runtime.lesson.reference.source, predictionAt: index => runtime.predictionAt(trace, index),
        predictionResults: [], onPrediction: () => {}, onViewSolution: () => {},
      }));
      expect(html).toContain('下一步');
      expect(html).toContain('参考解法');
    });
  }

  it('supports the full 30-item teaching boundary without changing the real input limit', async () => {
    const inputs = [
      ['34', { nums: Array<number>(30).fill(1), target: 1 }],
      ['202', { n: 2147483647 }],
      ['387', { s: 'a'.repeat(29) + 'b' }],
    ] as const;
    for (const [id, input] of inputs) {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const trace = await runtime.buildTrace(input, `boundary-${id}`);
      expect(trace.finalOutput).toEqual(expectedOutput(id, input as never));
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      for (const state of [trace.initialState, ...trace.snapshots]) for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
    }
  });
});
