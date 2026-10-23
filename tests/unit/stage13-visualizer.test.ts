import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('724/219/560 reference player boundary', () => {
  for (const id of ['724', '219', '560'] as const) {
    it(`${id} links every declared prediction to a real default-input checkpoint`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const demo = runtime.demoInputs[0]!;
      const trace = await runtime.buildTrace(demo.input, demo.id);
      for (const check of runtime.lesson.predictionChecks) {
        const index = trace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(runtime.predictionAt(trace, index)?.answer).toEqual(check.answer);
      }
    });
    it(`${id} renders the maximum demo boundary from immutable snapshots`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const input = id === '724' ? { nums: Array<number>(30).fill(0) }
        : id === '219' ? { nums: Array<number>(30).fill(1), k: 0 }
        : { nums: Array<number>(29).fill(1), k: 1 };
      const trace = await runtime.buildTrace(input, `boundary-${id}`);
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      for (const state of [trace.initialState, ...trace.snapshots]) for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
      const html = renderToStaticMarkup(createElement(ReferencePlayer, {
        trace, source: runtime.lesson.reference.source, predictionAt: index => runtime.predictionAt(trace, index),
        predictionResults: [], onPrediction: () => {}, onViewSolution: () => {},
      }));
      expect(html).toContain('下一步');
      expect(html).not.toContain('超过演示上限');
      expect(trace.finalOutput).toEqual(id === '219' ? { kind: 'boolean', value: false } : { kind: 'int', value: id === '724' ? 0 : 29 });
    });
  }
});
