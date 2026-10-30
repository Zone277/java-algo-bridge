import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PowerOfTwoInputSchema, ReferenceTraceSchema, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const powers = new Set(Array.from({ length: 31 }, (_, exponent) => 2 ** exponent));

function valueAt(state: State, name: string) {
  return state.variables.find(variable => variable.name === name)?.value;
}

function verifyEveryStep(trace: ReferenceTrace, n: number) {
  const expected = powers.has(n);
  expect(trace.initialState.structures).toEqual([]);
  expect(valueAt(trace.initialState, 'n')).toEqual({ kind: 'int', value: n });
  expect(valueAt(trace.initialState, 'n 的 32 位视图（教学辅助）')).toEqual({ kind: 'string', value: (n >>> 0).toString(2).padStart(32, '0') });
  expect(valueAt(trace.initialState, 'lowerBits')).toBeUndefined();
  expect(trace.snapshots.map(snapshot => snapshot.stepId)).toEqual(n <= 0
    ? ['check-positive', 'return-nonpositive']
    : ['check-positive', 'clear-lowest-one', 'return-result']);
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(snapshot.structures).toEqual([]);
    expect(valueAt(snapshot, 'n')).toEqual({ kind: 'int', value: n });
    expect(valueAt(snapshot, 'n <= 0（表达式）')).toEqual({ kind: 'boolean', value: n <= 0 });
    if (snapshot.stepId === 'check-positive') {
      expect(valueAt(snapshot, 'n - 1（表达式）')).toBeUndefined();
      expect(valueAt(snapshot, 'lowerBits')).toBeUndefined();
      expect(valueAt(snapshot, '返回值')).toBeUndefined();
    } else if (snapshot.stepId === 'return-nonpositive') {
      expect(n).toBeLessThanOrEqual(0);
      expect(valueAt(snapshot, 'n - 1（表达式）')).toBeUndefined();
      expect(valueAt(snapshot, 'lowerBits')).toBeUndefined();
      expect(valueAt(snapshot, '返回值')).toEqual({ kind: 'boolean', value: false });
    } else {
      const predecessor = n - 1;
      const lowerBits = n & predecessor;
      expect(n).toBeGreaterThan(0);
      expect(valueAt(snapshot, 'n - 1（表达式）')).toEqual({ kind: 'int', value: predecessor });
      expect(valueAt(snapshot, 'n - 1 的 32 位视图（教学辅助）')).toEqual({ kind: 'string', value: (predecessor >>> 0).toString(2).padStart(32, '0') });
      expect(valueAt(snapshot, 'lowerBits')).toEqual({ kind: 'int', value: lowerBits });
      expect(valueAt(snapshot, 'lowerBits 的 32 位视图（教学辅助）')).toEqual({ kind: 'string', value: (lowerBits >>> 0).toString(2).padStart(32, '0') });
      expect(lowerBits === 0).toBe(expected);
      expect(valueAt(snapshot, '返回值')).toEqual(snapshot.stepId === 'return-result' ? { kind: 'boolean', value: expected } : undefined);
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'boolean', value: expected });
}

describe('231 immutable reference state model', () => {
  it('enforces signed Java int input and binds hashes to the selected input and reference source', async () => {
    const input = { n: 8 };
    const trace = await buildReferenceTrace(input, 'eight');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 1.5 }, 'fraction')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 2147483648 }, 'overflow')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: -2147483649 }, 'underflow')).rejects.toThrow();
    expect(PowerOfTwoInputSchema.parse({ n: -2147483648 })).toEqual({ n: -2147483648 });
  });

  it('checks every intermediate branch and bit value against independently enumerated powers', async () => {
    for (const n of [-2147483648, -1024, -16, -1, 0, 1, 2, 3, 4, 5, 6, 8, 10, 1023, 1024, 1073741824, 2147483647]) {
      verifyEveryStep(await buildReferenceTrace({ n }, `fixed-${n}`), n);
    }
    let seed = 2312026;
    for (let sample = 0; sample < 80; sample++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      verifyEveryStep(await buildReferenceTrace({ n: seed }, `seed-${sample}`), seed);
    }
  });

  it('derives both prediction answers from each selected input, including early return', async () => {
    const answers = async (n: number) => {
      const trace = await buildReferenceTrace({ n }, `prediction-${n}`);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return predictions;
    };
    expect((await answers(8)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'continue' }, { kind: 'choice', optionId: 'true' }]);
    expect((await answers(6)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'continue' }, { kind: 'choice', optionId: 'false' }]);
    expect((await answers(0)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'early' }, { kind: 'choice', optionId: 'false' }]);
    expect((await answers(-2147483648)).map(item => item.answer)).toEqual([{ kind: 'choice', optionId: 'early' }, { kind: 'choice', optionId: 'false' }]);
    expect((await answers(8)).map(item => item.checkpointId)).not.toEqual((await answers(6)).map(item => item.checkpointId));
  });

  it('restores exact prior states and deeply freezes nested values', async () => {
    const trace = await buildReferenceTrace({ n: 8 }, 'restore');
    expect(trace).toEqual(await buildReferenceTrace({ n: 8 }, 'restore'));
    const [before, computed, after] = trace.snapshots;
    expect(valueAt(before!, 'lowerBits')).toBeUndefined();
    expect(valueAt(computed!, 'lowerBits')).toEqual({ kind: 'int', value: 0 });
    expect(valueAt(after!, '返回值')).toEqual({ kind: 'boolean', value: true });
    expect([JSON.stringify(after), JSON.stringify(before), JSON.stringify(after)][0]).toBe(JSON.stringify(after));
    expect(Reflect.set(computed!.variables, 0, { name: 'changed', value: { kind: 'int', value: 999 } })).toBe(false);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
  });
});
