import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectedOutput } from '@jab/contracts';
import { ReferencePlayer, StructureRenderer, structureItemCount } from '@jab/visualizer';
import { lessonRuntimes } from '../../apps/web/src/registry.js';

describe('69/122/144 shared reference player integration', () => {
  for (const id of ['69', '122', '144'] as const) {
    it(`${id} renders two live predictions from its actual snapshots`, async () => {
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
      if (id === '144') {
        expect(html).toContain('树对象');
        expect(html).not.toContain('左深度');
        const state = trace.snapshots.find(snapshot => snapshot.structures.some(item => item.kind === 'array' && item.presentation === 'list'))!;
        const output = state.structures.find(item => item.kind === 'array' && item.presentation === 'list')!;
        const listHtml = renderToStaticMarkup(createElement(StructureRenderer, { structure: output, snapshot: state }));
        expect(listHtml).toContain('结果列表（参考模型）');
        expect(listHtml).not.toContain('数组 output-prefix');
      }
    });
  }
});
