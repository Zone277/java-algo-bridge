import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { lesson69, demoInputs as inputs69 } from '@jab/curriculum/69';
import { lesson122, demoInputs as inputs122 } from '@jab/curriculum/122';
import { lesson144, demoInputs as inputs144 } from '@jab/curriculum/144';
import { buildReferenceTrace as trace69, predictionAt as predict69 } from '@jab/curriculum/69/model';
import { buildReferenceTrace as trace122, predictionAt as predict122 } from '@jab/curriculum/122/model';
import { buildReferenceTrace as trace144, predictionAt as predict144 } from '@jab/curriculum/144/model';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

describe('69/122/144 lessons and immutable reference states', () => {
  for (const [id, lesson, demos, trace, predict] of [
    ['69', lesson69, inputs69, trace69, predict69],
    ['122', lesson122, inputs122, trace122, predict122],
    ['144', lesson144, inputs144, trace144, predict144],
  ] as const) {
    it(`${id} validates full course, code mapping and per-input predictions`, async () => {
      expect(LessonSchema.parse(lesson)).toEqual(lesson);
      expect(lesson.testSuite.cases.length).toBeGreaterThanOrEqual(8);
      expect(lesson.testSuite.wrongFixtures.length).toBeGreaterThanOrEqual(2);
      expect(lesson.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
      expect(lesson.guided.stages.length).toBeGreaterThanOrEqual(3);
      expect(lesson.guided.finalCheck).toBe('real-java-submit');
      expect(lesson.independent.initialSource).toBe(lesson.starter.source);
      expect(lesson.reference.sourceHash).toBe(digest(lesson.reference.source));
      for (const item of lesson.testSuite.cases) expect(item.expected).toEqual(expectedOutput(id, item.input as never));
      for (const demo of demos) {
        const generated: ReferenceTrace = await trace(demo.input as never, demo.id);
        expect(ReferenceTraceSchema.parse(generated)).toEqual(generated);
        expect(generated.mode).toBe('reference-model');
        expect(generated.inputHash).toBe(digest(stableJson(demo.input)));
        expect(generated.referenceSourceHash).toBe(lesson.reference.sourceHash);
        expect(generated.finalOutput).toEqual(expectedOutput(id, demo.input as never));
        expect(Object.isFrozen(generated)).toBe(true);
        expect(generated.snapshots.length).toBeLessThanOrEqual(2000);
        for (const snapshot of generated.snapshots) {
          const mapping = lesson.reference.stepMap.find(item => item.stepId === snapshot.stepId);
          expect(snapshot.codeRange).toEqual({ startLine: mapping?.startLine, endLine: mapping?.endLine });
          expect(Object.isFrozen(snapshot)).toBe(true);
        }
        const predictions = generated.snapshots.flatMap((_, index) => predict(generated, index) ?? []);
        expect(predictions.length).toBeGreaterThanOrEqual(2);
      }
      const first = await trace(demos[0]!.input as never, demos[0]!.id);
      for (const check of lesson.predictionChecks) {
        const index = first.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(predict(first, index)?.answer).toEqual(check.answer);
      }
    });
  }

  it('models integer square root around perfect squares and int maximum', async () => {
    for (const x of [0, 1, 2, 3, 4, 8, 9, 15, 16, 24, 25, 2147395599, 2147395600, 2147483647]) {
      const trace = await trace69({ x }, `sqrt-${x}`);
      expect(trace.finalOutput).toEqual(expectedOutput('69', { x }));
    }
  });

  it('models repeated trading and one-day histories', async () => {
    for (const prices of [[1], [1, 2, 3], [3, 2, 1], [4, 1, 5, 2, 8], [0, 0, 10000]]) {
      const trace = await trace122({ prices }, `stock-${prices.join('-')}`);
      expect(trace.finalOutput).toEqual(expectedOutput('122', { prices }));
    }
  });

  it('models compact and duplicate-value trees without conflating identities', async () => {
    for (const root of [[], [1], [1, null, 2, 3], [5, 5, 5, 5, null, null, 5]]) {
      const trace = await trace144({ root }, `preorder-${root.join('-')}`);
      expect(trace.finalOutput).toEqual(expectedOutput('144', { root }));
      for (const state of [trace.initialState, ...trace.snapshots]) {
        const tree = state.structures.find(item => item.kind === 'tree');
        expect(tree?.frameSemantics).toBe('traversal');
        if (tree?.kind === 'tree') {
          expect(new Set(tree.nodes.map(node => node.id)).size).toBe(tree.nodes.length);
          expect(tree.nodes).toEqual(trace.initialState.structures.find(item => item.kind === 'tree')?.nodes);
        }
      }
    }
  });
});
