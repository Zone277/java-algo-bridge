import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FirstUniqueCharInputSchema, LessonSchema, ReferenceTraceSchema, expectedOutput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson387 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const valueOf = (state: State, name: string): number | undefined => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const frequencies = (text: string) => {
  const result = Array<number>(26).fill(0);
  for (const character of text) result[character.charCodeAt(0) - 97]!++;
  return result;
};
const shownCount = (state: State): readonly number[] | undefined => {
  const structure = state.structures.find(item => item.id === 'count');
  return structure?.kind === 'array' ? structure.values : undefined;
};

describe('387 complete lesson and reference model', () => {
  it('validates public lesson, source hash, cases, wrong solutions and two input-bound predictions', async () => {
    expect(LessonSchema.parse(lesson387)).toEqual(lesson387);
    expect(lesson387.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson387.testSuite.cases.length).toBeLessThanOrEqual(16);
    expect(lesson387.testSuite.wrongFixtures).toHaveLength(2);
    expect(lesson387.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson387.guided.stages).toHaveLength(3);
    expect(lesson387.guided.finalCheck).toBe('real-java-submit');
    expect(lesson387.independent.initialSource).toBe(lesson387.starter.source);
    expect(lesson387.reference.sourceHash).toBe(createHash('sha256').update(lesson387.reference.source).digest('hex'));
    const caseIds = new Set(lesson387.testSuite.cases.map(item => item.id));
    for (const item of lesson387.testSuite.cases) expect(item.expected).toEqual(expectedOutput('387', item.input));
    for (const fixture of lesson387.testSuite.wrongFixtures) for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput).toEqual(expectedOutput('387', demo.input));
      expect(Object.isFrozen(trace)).toBe(true);
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      for (const snapshot of trace.snapshots) {
        const mapping = lesson387.reference.stepMap.find(item => item.stepId === snapshot.stepId);
        expect(snapshot.codeRange).toEqual({ startLine: mapping?.startLine, endLine: mapping?.endLine });
        expect(Object.isFrozen(snapshot)).toBe(true);
      }
    }
    const defaultTrace = await buildReferenceTrace(demoInputs[0]!.input, demoInputs[0]!.id);
    for (const check of lesson387.predictionChecks) {
      const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(predictionAt(defaultTrace, index)?.answer).toEqual(check.answer);
    }
  });

  it('preserves prefix counts, frozen second-pass totals and leftmost-candidate invariant on every short string', async () => {
    for (let length = 1; length <= 4; length++) {
      const total = 3 ** length;
      for (let code = 0; code < total; code++) {
        let digits = code;
        const s = Array.from({ length }, () => { const char = 'abc'[digits % 3]!; digits = Math.floor(digits / 3); return char; }).join('');
        const trace = await buildReferenceTrace({ s }, `enumerated-${length}-${code}`);
        expect(trace.finalOutput).toEqual(expectedOutput('387', { s }));
        const whole = frequencies(s);
        for (const snapshot of trace.snapshots) {
          const count = shownCount(snapshot);
          if (!count) throw new Error('count should exist after first Java statement');
          const phase = snapshot.variables.find(item => item.name === '当前轮次（教学）')?.value;
          if (phase?.kind !== 'string') throw new Error('missing phase');
          const i = valueOf(snapshot, 'i');
          if (phase.value === '统计全串') {
            const included = snapshot.stepId === 'init-count' ? 0 : snapshot.stepId === 'increment-count' ? i! + 1 : i!;
            expect(count).toEqual(frequencies(s.slice(0, included)));
          } else {
            expect(count).toEqual(whole);
            if (i !== undefined && i < s.length) {
              expect(s.slice(0, i).split('').every(char => whole[char.charCodeAt(0) - 97] !== 1)).toBe(true);
              if (snapshot.stepId === 'check-unique' || snapshot.stepId === 'return-index') {
                expect(valueOf(snapshot, '当前字符总频次（表达式）')).toBe(whole[s.charCodeAt(i) - 97]);
              }
            }
          }
        }
      }
    }
  });

  it('enforces the ASCII input contract and separate 30-character display cap', async () => {
    expect(FirstUniqueCharInputSchema.safeParse({ s: 'A' }).success).toBe(false);
    expect(FirstUniqueCharInputSchema.safeParse({ s: 'é' }).success).toBe(false);
    expect(FirstUniqueCharInputSchema.safeParse({ s: '' }).success).toBe(false);
    expect(FirstUniqueCharInputSchema.safeParse({ s: 'a'.repeat(10001) }).success).toBe(false);
    expect(FirstUniqueCharInputSchema.safeParse({ s: 'a'.repeat(10000) }).success).toBe(true);
    await expect(buildReferenceTrace({ s: 'a'.repeat(31) }, 'over-display-limit')).rejects.toThrow('30');
    const edge = await buildReferenceTrace({ s: 'a'.repeat(29) + 'z' }, 'display-boundary');
    expect(edge.finalOutput).toEqual({ kind: 'int', value: 29 });
    expect(edge.snapshots.length).toBeLessThanOrEqual(2000);
  });
});
