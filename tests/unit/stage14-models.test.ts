import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { lesson34, demoInputs as inputs34 } from '@jab/curriculum/34';
import { lesson202, demoInputs as inputs202 } from '@jab/curriculum/202';
import { lesson387, demoInputs as inputs387 } from '@jab/curriculum/387';
import { buildReferenceTrace as trace34, predictionAt as predict34 } from '@jab/curriculum/34/model';
import { buildReferenceTrace as trace202, predictionAt as predict202 } from '@jab/curriculum/202/model';
import { buildReferenceTrace as trace387, predictionAt as predict387 } from '@jab/curriculum/387/model';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

describe('34/202/387 fixed reference models, lesson contracts and checkpoints', () => {
  for (const [id, lesson, demos, trace, predict] of [
    ['34', lesson34, inputs34, trace34, predict34],
    ['202', lesson202, inputs202, trace202, predict202],
    ['387', lesson387, inputs387, trace387, predict387],
  ] as const) {
    it(`${id} validates a full lesson and its immutable reference demos`, async () => {
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
      const defaultTrace = await trace(demos[0]!.input as never, demos[0]!.id);
      for (const check of lesson.predictionChecks) {
        const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(predict(defaultTrace, index)?.answer).toEqual(check.answer);
      }
    });
  }

  it('34 models every small sorted input including empty and duplicate intervals', async () => {
    for (const nums of [[], [1], [1, 1, 1], [1, 2, 2, 3], [-2, -1, 0, 0, 3]]) for (const target of [-2, 0, 1, 2, 3, 4]) {
      const trace = await trace34({ nums, target }, `range-${nums.join(',')}-${target}`);
      expect(trace.finalOutput).toEqual(expectedOutput('34', { nums, target }));
    }
  });

  it('202 models terminal one and non-one cycles across a bounded sample', async () => {
    for (const n of [1, 2, 4, 7, 10, 19, 20, 68, 100, 999, 2147483647]) {
      const trace = await trace202({ n }, `happy-${n}`);
      expect(trace.finalOutput).toEqual(expectedOutput('202', { n }));
    }
  });

  it('387 models leftmost uniqueness after the entire frequency pass', async () => {
    for (const s of ['a', 'aa', 'abac', 'aabb', 'loveleetcode', 'zzyx']) {
      const trace = await trace387({ s }, `unique-${s}`);
      expect(trace.finalOutput).toEqual(expectedOutput('387', { s }));
    }
  });
});
