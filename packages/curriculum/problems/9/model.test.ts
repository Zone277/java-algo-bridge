import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PalindromeNumberInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { lesson9 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function booleanAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function digitView(state: State) {
  const view = state.structures.find(structure => structure.id === '9-original-decimal-digits');
  if (view?.kind !== 'array') throw new Error('缺少十进制教学视图');
  return view;
}

function verifyEveryStep(trace: ReferenceTrace, original: number) {
  const oracle = expectedOutput('9', { x: original });
  expect(trace.finalOutput).toEqual(oracle);
  expect(intAt(trace.initialState, 'x')).toBe(original);
  expect(intAt(trace.initialState, 'reversed')).toBeUndefined();
  const expectedDigits = [...String(Math.abs(original))].map(Number);
  const expectedSteps = original < 0
    ? ['check-negative', 'return-negative']
    : original !== 0 && original % 10 === 0
      ? ['check-negative', 'check-trailing-zero', 'return-trailing-zero']
      : null;
  if (expectedSteps) expect(trace.snapshots.map(snapshot => snapshot.stepId)).toEqual(expectedSteps);

  let last: State = trace.initialState;
  let completed = 0;
  let pendingDigit: number | undefined;
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange, snapshot.stepId).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(intAt(snapshot, '原始输入（教学辅助）')).toBe(original);
    expect(digitView(snapshot).values).toEqual(expectedDigits);
    expect(snapshot.structures).toHaveLength(1);
    if (snapshot.stepId === 'check-negative') {
      expect(booleanAt(snapshot, 'x < 0（表达式）')).toBe(original < 0);
      expect(intAt(snapshot, 'reversed')).toBeUndefined();
    }
    if (snapshot.stepId === 'check-trailing-zero') {
      expect(original).toBeGreaterThanOrEqual(0);
      expect(booleanAt(snapshot, '非零且末位为零（表达式）')).toBe(original !== 0 && original % 10 === 0);
    }
    if (snapshot.stepId === 'init-reversed') expect(intAt(snapshot, 'reversed')).toBe(0);
    if (snapshot.stepId === 'check-half') {
      expect(intAt(snapshot, 'x')).toBe(Math.trunc(original / 10 ** completed));
      expect(booleanAt(snapshot, 'x > reversed（表达式）')).toBe(intAt(snapshot, 'x')! > intAt(snapshot, 'reversed')!);
      expect(intAt(snapshot, 'digit')).toBeUndefined();
      const suffix = String(original).slice(-completed);
      const reversedSuffix = completed === 0 ? 0 : Number([...suffix].reverse().join(''));
      expect(intAt(snapshot, 'reversed')).toBe(reversedSuffix);
    }
    if (snapshot.stepId === 'read-digit') {
      pendingDigit = intAt(last, 'x')! % 10;
      expect(intAt(snapshot, 'digit')).toBe(pendingDigit);
      expect(intAt(snapshot, 'x')).toBe(intAt(last, 'x'));
      expect(intAt(snapshot, 'reversed')).toBe(intAt(last, 'reversed'));
      expect(digitView(snapshot).indices.find(index => index.name === '最近取出的位（教学辅助）')?.index).toBe(expectedDigits.length - completed - 1);
    }
    if (snapshot.stepId === 'append-digit') {
      expect(intAt(snapshot, 'reversed')).toBe(intAt(last, 'reversed')! * 10 + pendingDigit!);
      expect(intAt(snapshot, 'x')).toBe(intAt(last, 'x'));
    }
    if (snapshot.stepId === 'drop-digit') {
      expect(intAt(snapshot, 'x')).toBe(Math.trunc(intAt(last, 'x')! / 10));
      expect(intAt(snapshot, 'reversed')).toBe(intAt(last, 'reversed'));
      completed += 1;
    }
    if (snapshot.stepId.startsWith('return-')) {
      expect(booleanAt(snapshot, '返回值')).toBe(oracle.kind === 'boolean' ? oracle.value : undefined);
      if (snapshot.stepId === 'return-result') {
        const x = intAt(snapshot, 'x')!;
        const reversed = intAt(snapshot, 'reversed')!;
        expect(x > reversed).toBe(false);
        expect(booleanAt(snapshot, '返回值')).toBe(x === reversed || x === Math.trunc(reversed / 10));
        expect(intAt(snapshot, 'digit')).toBeUndefined();
      }
    }
    last = snapshot;
  }
  expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
}

describe('9 immutable half-reversal reference model', () => {
  it('validates all cases and intermediate decimal and half-reversal invariants', async () => {
    const values = [...new Set([...lesson9.testSuite.cases.map(item => item.input.x), ...Array.from({ length: 200 }, (_, n) => n)])];
    let seed = 9123456;
    for (let sample = 0; sample < 100; sample++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      values.push(seed);
    }
    for (const x of values) {
      const trace = await buildReferenceTrace({ x }, `x-${x}`);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      verifyEveryStep(trace, x);
    }
  });

  it('takes the correct early, even, odd and zero paths', async () => {
    expect((await buildReferenceTrace({ x: -121 }, 'negative')).snapshots.map(snapshot => snapshot.stepId)).toEqual(['check-negative', 'return-negative']);
    expect((await buildReferenceTrace({ x: 10 }, 'trailing')).snapshots.map(snapshot => snapshot.stepId)).toEqual(['check-negative', 'check-trailing-zero', 'return-trailing-zero']);
    expect((await buildReferenceTrace({ x: 0 }, 'zero')).snapshots.map(snapshot => snapshot.stepId)).toEqual(['check-negative', 'check-trailing-zero', 'init-reversed', 'check-half', 'return-result']);
    const even = await buildReferenceTrace({ x: 1221 }, 'even');
    expect(intAt(even.snapshots.at(-1)!, 'x')).toBe(12);
    expect(intAt(even.snapshots.at(-1)!, 'reversed')).toBe(12);
    const odd = await buildReferenceTrace({ x: 12321 }, 'odd');
    expect(intAt(odd.snapshots.at(-1)!, 'x')).toBe(12);
    expect(intAt(odd.snapshots.at(-1)!, 'reversed')).toBe(123);
  });

  it('derives two input-specific predictions from immutable snapshots', async () => {
    const answers = async (x: number) => {
      const trace = await buildReferenceTrace({ x }, `predict-${x}`);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return predictions;
    };
    expect((await answers(-121)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'early' }, { kind: 'choice', optionId: 'false' }]);
    expect((await answers(10)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'continue' }, { kind: 'choice', optionId: 'false' }]);
    expect((await answers(0)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'continue' }, { kind: 'choice', optionId: 'true' }]);
    expect((await answers(12321)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'continue' }, { kind: 'choice', optionId: 'true' }]);
    expect((await answers(12321))[0]!.checkpointId).not.toBe((await answers(10))[0]!.checkpointId);
  });

  it('keeps canonical hashes, deep immutability and input validation', async () => {
    const input = { x: 12321 };
    const trace = await buildReferenceTrace(input, 'restore');
    expect(trace).toEqual(await buildReferenceTrace(input, 'restore'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'changed')).toBe(false);
    for (const invalid of [{ x: 1.5 }, { x: 2147483648 }, { x: -2147483649 }, { x: 1, extra: true }]) {
      expect(PalindromeNumberInputSchema.safeParse(invalid).success).toBe(false);
    }
    await expect(buildReferenceTrace({ x: 121 }, '')).rejects.toThrow(/标识/);
  });
});
