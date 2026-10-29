import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CountingBitsInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function derivedAt(state: State) {
  const dp = state.structures.find(structure => structure.id === 'derived-counts');
  if (dp?.kind !== 'dp') throw new Error('Missing teaching derivation ledger');
  return dp;
}

function bitsAt(state: State) {
  const array = state.structures.find(structure => structure.id === 'bits');
  if (array?.kind !== 'array') throw new Error('Missing actual Java bits array');
  return array;
}

// Independent decimal-to-binary description, distinct from the shift recurrence and the trusted oracle.
function literalCount(i: number) { return i.toString(2).split('').filter(digit => digit === '1').length; }

function verifyEveryStep(trace: ReferenceTrace, n: number) {
  const full = Array.from({ length: n + 1 }, (_, i) => literalCount(i));
  expect(trace.initialState.structures).toEqual([]);
  expect(intAt(trace.initialState, 'n')).toBe(n);
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    const i = intAt(snapshot, 'i');
    const derived = derivedAt(snapshot);
    const actualArray = bitsAt(snapshot);
    const processed = derived.activeIndex!;
    expect(processed).toBeGreaterThanOrEqual(0);
    expect(processed).toBeLessThanOrEqual(n);
    expect(derived.values).toEqual(full.map((value, position) => position <= processed ? value : null));
    expect(actualArray.values).toEqual(full.map((value, position) => position <= processed ? value : 0));
    expect(actualArray.values).toHaveLength(n + 1);
    expect(actualArray.indices).toEqual(i !== undefined && i <= n ? [{ name: 'i', index: i }] : []);
    if (snapshot.stepId === 'allocate-bits') {
      expect(processed).toBe(0);
      expect(i).toBeUndefined();
      expect(intAt(snapshot, 'i >> 1（表达式）')).toBeUndefined();
    } else if (snapshot.stepId === 'check-index') {
      expect(i).toBeDefined();
      expect(intAt(snapshot, 'i >> 1（表达式）')).toBeUndefined();
      const condition = snapshot.variables.find(variable => variable.name === 'i <= n（表达式）')?.value;
      expect(condition).toEqual({ kind: 'boolean', value: i! <= n });
      expect(processed).toBe(Math.min(i! - 1, n));
    } else if (snapshot.stepId === 'assign-count') {
      expect(i).toBeDefined();
      expect(processed).toBe(i);
      expect(intAt(snapshot, 'i >> 1（表达式）')).toBe(i! >> 1);
      expect(intAt(snapshot, 'i & 1（表达式）')).toBe(i! & 1);
      expect(intAt(snapshot, 'bits[i >> 1]（表达式）')).toBe(full[i! >> 1]);
      expect(full[i!]).toBe(full[i! >> 1]! + (i! & 1));
    } else {
      expect(snapshot.stepId).toBe('return-bits');
      expect(processed).toBe(n);
      expect(i).toBeUndefined();
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'int-array', values: full });
  expect(trace.finalOutput).toEqual(expectedOutput('338', { n }));
}

describe('338 immutable bit-count reference model', () => {
  it('checks legal limits, hashes, array length and the separate 30-item demonstration limit', async () => {
    const input = { n: 5 };
    const trace = await buildReferenceTrace(input, 'five');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: -1 }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 1.5 }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 10000 }, 'invalid')).rejects.toThrow();
    verifyEveryStep(await buildReferenceTrace({ n: 29 }, 'demo-upper'), 29);
    expect(CountingBitsInputSchema.parse({ n: 30 })).toEqual({ n: 30 });
    await expect(buildReferenceTrace({ n: 30 }, 'run-only')).rejects.toThrow(/30.*9999/);
    expect(CountingBitsInputSchema.parse({ n: 9999 })).toEqual({ n: 9999 });
  });

  it('checks every intermediate state, including default zeros, against independent literal bit counts', async () => {
    for (const n of [0, 1, 2, 3, 4, 5, 7, 8, 13, 29]) verifyEveryStep(await buildReferenceTrace({ n }, `fixed-${n}`), n);
    let seed = 3382026;
    for (let sample = 0; sample < 40; sample++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const n = seed % 30;
      verifyEveryStep(await buildReferenceTrace({ n }, `seeded-${sample}`), n);
    }
  });

  it('derives both predictions from the selected input, including n=0', async () => {
    const answers = async (n: number) => {
      const trace = await buildReferenceTrace({ n }, `prediction-${n}`);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return { answers: predictions.map(prediction => prediction.answer), ids: predictions.map(prediction => prediction.checkpointId) };
    };
    expect((await answers(5)).answers).toEqual([{ kind: 'int', value: 1 }, { kind: 'int', value: 2 }]);
    expect((await answers(7)).answers).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 3 }]);
    expect((await answers(0)).answers).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
    expect((await answers(5)).ids).not.toEqual((await answers(7)).ids);
  });

  it('restores the exact before/after assignment snapshots and freezes every nested value', async () => {
    const trace = await buildReferenceTrace({ n: 5 }, 'restore');
    expect(trace).toEqual(await buildReferenceTrace({ n: 5 }, 'restore'));
    const before = trace.snapshots.find(s => s.stepId === 'check-index' && intAt(s, 'i') === 3)!;
    const after = trace.snapshots.find(s => s.stepId === 'assign-count' && intAt(s, 'i') === 3)!;
    expect(bitsAt(before).values).toEqual([0, 1, 1, 0, 0, 0]);
    expect(bitsAt(after).values).toEqual([0, 1, 1, 2, 0, 0]);
    expect(derivedAt(before).values).toEqual([0, 1, 1, null, null, null]);
    expect(derivedAt(after).values).toEqual([0, 1, 1, 2, null, null]);
    const backward = [after, before, after].map(state => JSON.stringify(state));
    expect(backward[0]).toBe(backward[2]);
    expect(Reflect.set(bitsAt(after).values, 3, 999)).toBe(false);
    expect(Reflect.set(after.variables, 0, { name: 'changed', value: { kind: 'int', value: 9 } })).toBe(false);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    const other = await buildReferenceTrace({ n: 7 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(s => s.checkpointId && trace.snapshots.some(old => old.checkpointId === s.checkpointId))).toBe(false);
  });
});
