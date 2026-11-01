import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, StructureRenderer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('58/66/110 shared reference player integration', () => {
  it('58 labels repeated letters as distinct characters while showing all positions', async () => {
    const runtime = lessonRuntimes.find(item => item.lesson.id === '58')!;
    const trace = await runtime.buildTrace({ s: 'letter' }, 'letter-repeat');
    const final = trace.snapshots.at(-1)!;
    const window = final.structures.find(item => item.kind === 'window')!;
    const html = renderToStaticMarkup(createElement(StructureRenderer, { structure: window, snapshot: final }));
    expect(trace.finalOutput).toEqual({ kind: 'int', value: 6 });
    expect(html).toContain('半开区间 [0, 6)，长度 6');
    expect(html).toContain('窗口内不同字符（去重）');
    expect((html.match(/data-text-index=/g) ?? [])).toHaveLength(6);
  });

  for (const id of ['58', '66', '110'] as const) {
    it(`${id} renders live predictions from immutable reference snapshots`, async () => {
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
});
