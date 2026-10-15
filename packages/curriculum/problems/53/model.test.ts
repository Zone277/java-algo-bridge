import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function arrayAt(state: State) {
  const array = state.structures.find(structure => structure.kind === 'array');
  if (array?.kind !== 'array') throw new Error('Missing nums array');
  expect(array.id).toBe('nums');
  return array;
}

function bestEndingAt(nums: readonly number[], end: number): number {
  let sum = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (let start = end; start >= 0; start--) {
    sum += nums[start]!;
    best = Math.max(best, sum);
  }
  return best;
}

function bestThrough(nums: readonly number[], endInclusive: number): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let end = 0; end <= endInclusive; end++) best = Math.max(best, bestEndingAt(nums, end));
  return best;
}

function sum(nums: readonly number[], start: number, end: number): number {
  return nums.slice(start, end + 1).reduce((total, value) => total + value, 0);
}

function verifyInvariants(trace: ReferenceTrace, nums: readonly number[]): void {
  expect(arrayAt(trace.initialState).values).toEqual(nums);
  expect(arrayAt(trace.initialState).indices).toEqual([]);
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    expect(arrayAt(snapshot).values).toEqual(nums);
    const i = intAt(snapshot, 'i');
    const current = intAt(snapshot, 'current');
    const best = intAt(snapshot, 'best');
    const currentStart = intAt(snapshot, '当前段起点（演示标记）');
    const bestStart = intAt(snapshot, '最佳段起点（演示标记）');
    const indices = arrayAt(snapshot).indices;
    const currentEnd = indices.find(pointer => pointer.name === '当前段终点')?.index;
    const bestEnd = indices.find(pointer => pointer.name === '最佳段终点')?.index;
    if (current !== undefined && currentStart !== undefined && currentEnd !== undefined) {
      expect(sum(nums, currentStart, currentEnd)).toBe(current);
      expect(current).toBe(bestEndingAt(nums, currentEnd));
    }
    if (best !== undefined && bestStart !== undefined && bestEnd !== undefined) {
      expect(sum(nums, bestStart, bestEnd)).toBe(best);
      const processedEnd = snapshot.stepId === 'update-best' ? i! : snapshot.stepId === 'return-best' ? nums.length - 1 :
        snapshot.stepId === 'update-current' || snapshot.stepId === 'read-value' ? i! - 1 :
          snapshot.stepId === 'check-index' ? Math.min(i! - 1, nums.length - 1) : 0;
      expect(best).toBe(bestThrough(nums, processedEnd));
    }
    if (snapshot.stepId === 'init-current') {
      expect(current).toBe(nums[0]);
      expect(best).toBeUndefined();
    }
    if (snapshot.stepId === 'init-best') expect(best).toBe(nums[0]);
    if (snapshot.stepId === 'check-index') {
      expect(boolAt(snapshot, 'i < length')).toBe(i! < nums.length);
      expect(intAt(snapshot, 'value')).toBeUndefined();
      expect(current).toBe(bestEndingAt(nums, Math.min(i! - 1, nums.length - 1)));
    }
    if (snapshot.stepId === 'read-value') expect(intAt(snapshot, 'value')).toBe(nums[i!]);
    if (snapshot.stepId === 'update-current' || snapshot.stepId === 'update-best') {
      expect(current).toBe(bestEndingAt(nums, i!));
      expect(intAt(snapshot, 'value')).toBe(nums[i!]);
    }
  }
  expect(trace.finalOutput).toEqual(expectedOutput('53', { nums: [...nums] }));
}

describe('53 immutable Kadane reference model', () => {
  it('validates hashes, input constraints and explicit demo limit', async () => {
    const input = { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] };
    const trace = await buildReferenceTrace(input, 'mixed');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [10001] }, 'invalid-number')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array(31).fill(1) as number[] }, 'over-demo')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('checks every intermediate ending/best invariant against brute force', async () => {
    const samples = [
      [-7], [9], [-8, -3, -6, -2, -5, -4], [-2, 1, -3, 4, -1, 2, 1, -5, 4],
      [1, 2, 3, 4], [0, 0, 0], [8, -1, -20, 2, 3], [-5, 2, 3],
      [5, -2, 4], [3, -10, 4, 5], [2, -2, 2], [10000, -10000, 10000],
    ];
    for (const nums of samples) verifyInvariants(await buildReferenceTrace({ nums }, `case-${nums.join('_')}`), nums);
  });

  it('generates exactly two input-specific predictions even for one negative element', async () => {
    const answers = async (nums: number[]) => {
      const trace = await buildReferenceTrace({ nums }, `pred-${nums.join('_')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toEqual([{ kind: 'int', value: -2 }, { kind: 'int', value: 6 }]);
    expect(await answers([-7])).toEqual([{ kind: 'int', value: -7 }, { kind: 'int', value: -7 }]);
    expect(await answers([5, -2, 4])).toEqual([{ kind: 'int', value: 5 }, { kind: 'int', value: 7 }]);
  });

  it('freezes snapshots deeply and supports exact backward restoration', async () => {
    const input = { nums: [5, -2, 4] };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [...input.nums] }, 'history'));
    const before = trace.snapshots.find(s => s.stepId === 'read-value' && intAt(s, 'i') === 1)!;
    const after = trace.snapshots.find(s => s.stepId === 'update-current' && intAt(s, 'i') === 1)!;
    expect([intAt(before, 'current'), intAt(after, 'current')]).toEqual([5, 3]);
    expect(Reflect.set(after, 'explanation', 'mutated')).toBe(false);
    expect([intAt(before, 'current'), intAt(after, 'current')]).toEqual([5, 3]);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    const other = await buildReferenceTrace({ nums: [5, -3, 4] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(s => s.checkpointId && trace.snapshots.some(old => old.checkpointId === s.checkpointId))).toBe(false);
  });

  it('maps every snapshot to Java source and exposes no prediction elsewhere', async () => {
    const trace = await buildReferenceTrace({ nums: [-2, 1, -3, 4] }, 'mapping');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const lines = REFERENCE_SOURCE.split('\n');
    for (const snapshot of trace.snapshots) {
      const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
      expect(lines[mapped.startLine - 1]!.trim()).not.toBe('');
      expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
    }
  });
});
