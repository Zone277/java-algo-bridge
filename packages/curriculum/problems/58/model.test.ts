import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LastWordInputSchema, LessonSchema, ReferenceTraceSchema, expectedOutput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson58 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intOf(state: State, name: string): number | undefined {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function countedWindow(state: State) {
  const window = state.structures.find(item => item.id === '已计数末词区间（教学辅助）');
  if (window?.kind !== 'window') throw new Error('58 模型缺少末词教学区间');
  return window;
}

describe('58 complete lesson and reference model', () => {
  it('validates the lesson, source hash, test coverage, wrong fixtures and input-bound checks', async () => {
    expect(LessonSchema.parse(lesson58)).toEqual(lesson58);
    expect(lesson58.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson58.testSuite.cases.length).toBeLessThanOrEqual(16);
    expect(lesson58.testSuite.wrongFixtures).toHaveLength(2);
    expect(lesson58.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson58.guided.stages).toHaveLength(3);
    expect(lesson58.guided.finalCheck).toBe('real-java-submit');
    expect(lesson58.independent.initialSource).toBe(lesson58.starter.source);
    expect(lesson58.reference.sourceHash).toBe(createHash('sha256').update(lesson58.reference.source).digest('hex'));
    const ids = new Set(lesson58.testSuite.cases.map(item => item.id));
    for (const test of lesson58.testSuite.cases) expect(test.expected).toEqual(expectedOutput('58', test.input));
    for (const fixture of lesson58.testSuite.wrongFixtures) for (const id of fixture.targetedCaseIds) expect(ids.has(id)).toBe(true);
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput).toEqual(expectedOutput('58', demo.input));
      expect(Object.isFrozen(trace)).toBe(true);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      for (const snapshot of trace.snapshots) {
        const mapping = lesson58.reference.stepMap.find(step => step.stepId === snapshot.stepId);
        expect(snapshot.codeRange).toEqual({ startLine: mapping?.startLine, endLine: mapping?.endLine });
        expect(Object.isFrozen(snapshot)).toBe(true);
      }
    }
    const defaultDemo = demoInputs[0]!;
    const defaultTrace = await buildReferenceTrace(defaultDemo.input, defaultDemo.id);
    for (const check of lesson58.predictionChecks) {
      const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(predictionAt(defaultTrace, index)?.answer).toEqual(check.answer);
    }
  });

  it('keeps trailing-space, counted-word and short-circuit invariants on exhaustive short strings', async () => {
    const alphabet = ['a', ' ', 'B'];
    for (let size = 1; size <= 5; size++) {
      for (let code = 0; code < alphabet.length ** size; code++) {
        let digits = code;
        const s = Array.from({ length: size }, () => { const char = alphabet[digits % alphabet.length]!; digits = Math.floor(digits / alphabet.length); return char; }).join('');
        if (!/[A-Za-z]/.test(s)) continue;
        const trace = await buildReferenceTrace({ s }, `enumerated-${size}-${code}`);
        expect(trace.finalOutput).toEqual(expectedOutput('58', { s }));
        expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
        for (const snapshot of trace.snapshots) {
          const window = countedWindow(snapshot);
          expect(window.text).toBe(s);
          expect(window.left).toBeGreaterThanOrEqual(0);
          expect(window.rightExclusive).toBeLessThanOrEqual(s.length);
          expect(window.left).toBeLessThanOrEqual(window.rightExclusive);
          const counted = s.slice(window.left, window.rightExclusive);
          expect(counted).not.toContain(' ');
          const length = intOf(snapshot, 'length');
          if (length !== undefined) expect(length).toBe(counted.length);
          const i = intOf(snapshot, 'i');
          if (snapshot.stepId === 'check-trailing-space') {
            expect(i).toBeDefined();
            expect(s.slice(i! + 1).split('').every(char => char === ' ')).toBe(true);
            if (snapshot.checkpointId) expect(s.charAt(i!)).not.toBe(' ');
          }
          if (snapshot.stepId === 'check-word-char' && i! < 0) {
            expect(snapshot.variables.find(item => item.name === '当前仍是末词字母（表达式）')?.value).toEqual({ kind: 'boolean', value: false });
          }
        }
      }
    }
  });

  it('separates the site input limit from the 30-character visualization limit', async () => {
    expect(LastWordInputSchema.safeParse({ s: '' }).success).toBe(false);
    expect(LastWordInputSchema.safeParse({ s: '   ' }).success).toBe(false);
    expect(LastWordInputSchema.safeParse({ s: 'x\t' }).success).toBe(false);
    expect(LastWordInputSchema.safeParse({ s: 'é' }).success).toBe(false);
    expect(LastWordInputSchema.safeParse({ s: 'a'.repeat(10001) }).success).toBe(false);
    expect(LastWordInputSchema.safeParse({ s: 'a'.repeat(10000) }).success).toBe(true);
    await expect(buildReferenceTrace({ s: 'a'.repeat(31) }, 'over-display')).rejects.toThrow('30');
    await expect(buildReferenceTrace({ s: 'a' }, '')).rejects.toThrow('标识');
    const boundary = await buildReferenceTrace({ s: 'x'.repeat(27) + '   ' }, 'display-boundary');
    expect(boundary.finalOutput).toEqual({ kind: 'int', value: 27 });
  });
});
