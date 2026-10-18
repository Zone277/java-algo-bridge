import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferencePlayer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('new course display limits agree with the actual reference player', () => {
  for (const id of ['11', '209', '198'] as const) {
    it(`${id} renders its 30-item boundary without an oversized structure`, async () => {
      const runtime = lessonRuntimes.find(item => item.lesson.id === id)!;
      const input = id === '11' ? { height: Array<number>(30).fill(8) }
        : id === '209' ? { target: 9, nums: Array<number>(30).fill(3) }
        : { nums: Array<number>(30).fill(400) };
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
      if (id === '198') {
        expect(html).toContain('D(0)（教学基例）');
        expect(html).toContain('状态 i 是前 i+1 间最优值');
        expect(trace.finalOutput).toEqual({ kind: 'int', value: 6000 });
        const final = trace.snapshots.at(-1)!;
        const table = final.structures.find(structure => structure.kind === 'dp')!;
        expect(table.kind).toBe('dp');
        if (table.kind === 'dp') {
          expect(table.values).toEqual(Array.from({ length: 30 }, (_, i) => Math.ceil((i + 1) / 2) * 400));
          expect(table.activeIndex).toBe(29);
        }
      }
    });
  }
});
