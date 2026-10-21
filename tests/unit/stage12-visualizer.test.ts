import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('33/392/322 reference player boundary', () => {
  for (const id of ['33', '392', '322'] as const) {
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
      const input = id === '33' ? { nums: [...Array.from({ length: 15 }, (_, i) => i + 15), ...Array.from({ length: 15 }, (_, i) => i)], target: 0 }
        : id === '392' ? { s: 'a'.repeat(30), t: 'a'.repeat(30) }
        : { coins: Array.from({ length: 12 }, (_, i) => i + 1), amount: 30 };
      const trace = await runtime.buildTrace(input, `boundary-${id}`);
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      for (const state of [trace.initialState, ...trace.snapshots]) for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
      const html = renderToStaticMarkup(createElement(ReferencePlayer, {
        trace, source: runtime.lesson.reference.source, predictionAt: index => runtime.predictionAt(trace, index),
        predictionResults: [], onPrediction: () => {}, onViewSolution: () => {},
      }));
      expect(html).toContain('下一步');
      expect(html).not.toContain('超过演示上限');
      expect(trace.finalOutput).toEqual(id === '392' ? { kind: 'boolean', value: true } : { kind: 'int', value: id === '33' ? 15 : 3 });
    });
  }
});
