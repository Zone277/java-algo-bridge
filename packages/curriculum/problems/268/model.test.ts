import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MissingNumberInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson268 } from './content.js';
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

/** Per-bit count oracle, deliberately independent of the model's XOR updates. */
function bitParity(values: readonly number[]): number {
  let result = 0;
  for (let bit = 0; bit < 14; bit++) {
    const count = values.reduce((sum, value) => sum + ((value >>> bit) & 1), 0);
    result += (count % 2) * 2 ** bit;
  }
  return result;
}

function verifyStates(trace: ReferenceTrace, nums: readonly number[]) {
  expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
  expect(intAt(trace.initialState, 'missing')).toBeUndefined();
  expect(intAt(trace.initialState, 'i')).toBeUndefined();
  let previousPairs = 0;
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapping && { startLine: mapping.startLine, endLine: mapping.endLine });
    const i = intAt(snapshot, 'i');
    const pairs = intAt(snapshot, '已完整配对项数（教学）')!;
    const pendingIndex = booleanAt(snapshot, '本轮仅并入下标（教学）');
    expect(pairs).toBe(previousPairs + (snapshot.stepId === 'xor-value' ? 1 : 0));
    expect(pendingIndex).toBe(snapshot.stepId === 'xor-index');
    previousPairs = pairs;
    const effectiveIndex = snapshot.stepId === 'xor-index' ? i : undefined;
    const components = [nums.length, ...Array.from({ length: pairs }, (_, index) => index), ...nums.slice(0, pairs), ...(effectiveIndex === undefined ? [] : [effectiveIndex])];
    expect(intAt(snapshot, 'missing'), snapshot.snapshotId).toBe(bitParity(components));
    if (snapshot.stepId === 'xor-index') expect(pairs).toBe(i);
    else if (snapshot.stepId === 'xor-value') expect(pairs).toBe(i! + 1);
    else if (i !== undefined) expect(pairs).toBe(i);
    if (snapshot.stepId === 'check-index') expect(booleanAt(snapshot, 'i < nums.length（条件表达式）')).toBe(i! < nums.length);
    expect(snapshot.structures).toEqual([{ kind: 'array', id: 'nums', values: nums, indices: i === undefined ? [] : [{ name: 'i', index: i }] }]);
  }
  expect(previousPairs).toBe(nums.length);
  expect(trace.finalOutput).toEqual(expectedOutput('268', { nums: [...nums] }));
}

describe('268 immutable index/value XOR trace', () => {
  it('checks every intermediate step and input boundary without confusing half-pairs with full pairs', async () => {
    for (const item of lesson268.testSuite.cases) {
      if (item.input.nums.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow(/30/);
      } else {
        verifyStates(await buildReferenceTrace(item.input, item.id), item.input.nums);
      }
    }
    let seed = 2682026;
    for (let n = 1; n <= 30; n++) {
      const missing = (Math.imul(n, 7) + 3) % (n + 1);
      const nums = Array.from({ length: n + 1 }, (_, value) => value).filter(value => value !== missing);
      for (let i = nums.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [nums[i], nums[j]] = [nums[j]!, nums[i]!];
      }
      verifyStates(await buildReferenceTrace({ nums }, `seed-${n}`), nums);
    }
  });

  it('derives three distinct input-specific predictions for every demo', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(3);
      expect(predictions.map(item => item.answer)).toEqual([
        { kind: 'int', value: demo.input.nums.length },
        { kind: 'int', value: bitParity([demo.input.nums.length, 0, demo.input.nums[0]!]) },
        expectedOutput('268', demo.input),
      ]);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(3);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
    }
  });

  it('retains SHA-256 identities and complete immutable history after input mutation', async () => {
    const raw = { nums: [3, 0, 1] };
    const trace = await buildReferenceTrace(raw, 'restore');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [3, 0, 1] }, 'restore'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(raw)).digest('hex'));
    const half = trace.snapshots.find(item => item.stepId === 'xor-index')!;
    const full = trace.snapshots.find(item => item.stepId === 'xor-value')!;
    const savedHalf = JSON.stringify(half);
    const savedFull = JSON.stringify(full);
    raw.nums[0] = 2;
    for (const snapshot of [...trace.snapshots, ...[...trace.snapshots].reverse()]) {
      expect(snapshot.structures[0]).toMatchObject({ values: [3, 0, 1] });
    }
    expect(JSON.stringify(half)).toBe(savedHalf);
    expect(JSON.stringify(full)).toBe(savedFull);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(half, 'explanation', 'changed')).toBe(false);
  });

  it('rejects invalid inputs, blank IDs and display oversize without truncating a trace', async () => {
    for (const nums of [[], [0, 0], [-1], [4, 0, 1], [10001]]) {
      expect(MissingNumberInputSchema.safeParse({ nums }).success).toBe(false);
      await expect(buildReferenceTrace({ nums }, 'invalid')).rejects.toThrow();
    }
    const nums = Array.from({ length: 32 }, (_, value) => value).filter(value => value !== 17);
    expect(MissingNumberInputSchema.safeParse({ nums }).success).toBe(true);
    await expect(buildReferenceTrace({ nums }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums: [0] }, '')).rejects.toThrow(/标识/);
  });
});
