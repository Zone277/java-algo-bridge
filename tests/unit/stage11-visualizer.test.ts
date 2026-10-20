import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('153/136/746 actual reference player boundary', () => {
  for (const id of ['153', '136', '746'] as const) {
    it(`${id} renders the largest valid input at or below 30 items`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const pairs = Array.from({ length: 14 }, (_, i) => i - 14);
      const input = id === '153' ? { nums: [...Array.from({ length: 15 }, (_, i) => i + 15), ...Array.from({ length: 15 }, (_, i) => i)] }
        : id === '136' ? { nums: [...pairs, 7, ...pairs] }
        : { cost: Array<number>(30).fill(999) };
      const trace = await runtime.buildTrace(input, `boundary-${id}`);
      for (const state of [trace.initialState, ...trace.snapshots]) {
        for (const structure of state.structures) expect(structureItemCount(structure)).toBeLessThanOrEqual(30);
      }
      const html = renderToStaticMarkup(createElement(ReferencePlayer, {
        trace, source: runtime.lesson.reference.source,
        predictionAt: index => runtime.predictionAt(trace, index),
        predictionResults: [], onPrediction: () => {}, onViewSolution: () => {},
      }));
      expect(html).toContain('下一步');
      expect(html).not.toContain('超过演示上限');
      expect(trace.finalOutput).toEqual({ kind: 'int', value: id === '153' ? 0 : id === '136' ? 7 : 14985 });
    });
  }
});
