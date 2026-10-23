import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { lesson724, demoInputs as inputs724 } from '@jab/curriculum/724';
import { lesson219, demoInputs as inputs219 } from '@jab/curriculum/219';
import { lesson560, demoInputs as inputs560 } from '@jab/curriculum/560';
import { buildReferenceTrace as trace724, predictionAt as predict724 } from '@jab/curriculum/724/model';
import { buildReferenceTrace as trace219, predictionAt as predict219 } from '@jab/curriculum/219/model';
import { buildReferenceTrace as trace560, predictionAt as predict560 } from '@jab/curriculum/560/model';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const integer = (state: State, name: string): number | undefined => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const entries = (state: State, id: string): Map<number, number> | undefined => {
  const structure = state.structures.find(item => item.id === id);
  if (structure?.kind !== 'map') return undefined;
  return new Map(structure.entries.map(entry => {
    if (entry.key.kind !== 'int' || entry.value.kind !== 'int') throw new Error('expected integer map');
    return [entry.key.value, entry.value.value];
  }));
};
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

describe('724/219/560 published courses and immutable reference invariants', () => {
  for (const [id, lesson, demos, trace, predict] of [
    ['724', lesson724, inputs724, trace724, predict724],
    ['219', lesson219, inputs219, trace219, predict219],
    ['560', lesson560, inputs560, trace560, predict560],
  ] as const) {
    it(`${id} validates lesson, independent published expected values and dynamic predictions`, async () => {
      expect(LessonSchema.parse(lesson)).toEqual(lesson);
      expect(lesson.testSuite.cases.length).toBeGreaterThanOrEqual(12);
      expect(lesson.testSuite.wrongFixtures.length).toBeGreaterThanOrEqual(2);
      expect(lesson.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
      expect(lesson.guided.stages).toHaveLength(3);
      expect(lesson.guided.finalCheck).toBe('real-java-submit');
      expect(lesson.independent.initialSource).toBe(lesson.starter.source);
      expect(lesson.reference.sourceHash).toBe(digest(lesson.reference.source));
      const caseIds = new Set(lesson.testSuite.cases.map(item => item.id));
      for (const item of lesson.testSuite.cases) {
        expect(item.expected).toEqual(expectedOutput(id, item.input as never));
        expect(item.coverage.length).toBeGreaterThan(8);
      }
      for (const fixture of lesson.testSuite.wrongFixtures) {
        expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
        for (const target of fixture.targetedCaseIds) expect(caseIds.has(target)).toBe(true);
      }
      for (const demo of demos) {
        const generated = await trace(demo.input as never, demo.id);
        expect(ReferenceTraceSchema.parse(generated)).toEqual(generated);
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
        expect(predictions).toHaveLength(2);
      }
      const defaultTrace = await trace(demos[0]!.input as never, demos[0]!.id);
      for (const check of lesson.predictionChecks) {
        const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(predict(defaultTrace, index)?.answer).toEqual(check.answer);
      }
    });
  }

  it('724 preserves exclusive left/right sums and first valid return over all small arrays', async () => {
    for (let code = 0; code < 243; code++) {
      let n = code;
      const nums = Array.from({ length: 5 }, () => { const value = n % 3 - 1; n = Math.floor(n / 3); return value; });
      const trace = await trace724({ nums }, `exhaustive-${code}`);
      expect(trace.finalOutput).toEqual(expectedOutput('724', { nums }));
      for (const state of trace.snapshots) {
        const i = integer(state, 'i');
        if (i === undefined || i >= nums.length) continue;
        const left = nums.slice(0, i).reduce((a, b) => a + b, 0);
        if (state.stepId !== 'advance-left') expect(integer(state, 'left')).toBe(left);
        if (['compute-right', 'check-balance', 'found'].includes(state.stepId)) {
          expect(integer(state, 'right')).toBe(nums.slice(i + 1).reduce((a, b) => a + b, 0));
          expect(nums.slice(0, i).every((_, p) => nums.slice(0, p).reduce((a, b) => a + b, 0) !== nums.slice(p + 1).reduce((a, b) => a + b, 0))).toBe(true);
        }
      }
    }
  });

  it('219 map holds exactly the latest index in the previously scanned prefix at each query', async () => {
    for (let code = 0; code < 81; code++) {
      let n = code;
      const nums = Array.from({ length: 4 }, () => { const value = n % 3 - 1; n = Math.floor(n / 3); return value; });
      for (const k of [0, 1, 2, 4]) {
        const trace = await trace219({ nums, k }, `exhaustive-${code}-${k}`);
        expect(trace.finalOutput).toEqual(expectedOutput('219', { nums, k }));
        for (const state of trace.snapshots) {
          const i = integer(state, 'i');
          if (i === undefined) continue;
          const before = new Map<number, number>();
          nums.slice(0, i).forEach((value, index) => before.set(value, index));
          if (state.stepId === 'store-current') before.set(nums[i]!, i);
          expect(entries(state, 'last')).toEqual(before);
          if (state.stepId === 'check-distance') expect(integer(state, 'i - previous（表达式）')).toBe(i - integer(state, 'previous')!);
        }
      }
    }
  });

  it('560 map and count distinguish earlier prefixes from current prefix on zero/negative cases', async () => {
    for (let code = 0; code < 81; code++) {
      let n = code;
      const nums = Array.from({ length: 4 }, () => { const value = n % 3 - 1; n = Math.floor(n / 3); return value; });
      for (const k of [-1, 0, 1]) {
        const trace = await trace560({ nums, k }, `exhaustive-${code}-${k}`);
        expect(trace.finalOutput).toEqual(expectedOutput('560', { nums, k }));
        for (const state of trace.snapshots) {
          const i = integer(state, 'i');
          if (i === undefined || i >= nums.length) continue;
          const included = state.stepId === 'store-prefix' ? i + 1 : i;
          const sums = [0];
          for (const value of nums.slice(0, included)) sums.push(sums[sums.length - 1]! + value);
          const expected = new Map<number, number>();
          for (const sum of sums) expected.set(sum, (expected.get(sum) ?? 0) + 1);
          expect(entries(state, 'freq')).toEqual(expected);
          if (['add-prefix', 'compute-needed', 'lookup-frequency', 'add-count', 'store-prefix'].includes(state.stepId)) {
            expect(integer(state, 'prefix')).toBe(nums.slice(0, i + 1).reduce((a, b) => a + b, 0));
            const earlier = new Map<number, number>();
            for (const sum of sums.slice(0, state.stepId === 'store-prefix' ? -1 : undefined)) earlier.set(sum, (earlier.get(sum) ?? 0) + 1);
            if (state.stepId === 'lookup-frequency') expect(integer(state, 'matches')).toBe(expected.get(integer(state, 'needed')!) ?? 0);
          }
        }
      }
    }
  });
});
