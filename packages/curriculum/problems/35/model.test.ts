import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Snapshot = ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function arrayAt(state: State) {
  const structure = state.structures.find(item => item.kind === 'array');
  if (structure?.kind !== 'array') throw new Error('Missing nums array');
  return structure;
}

function lowerBound(nums: readonly number[], target: number): number {
  let index = 0;
  while (index < nums.length && nums[index]! < target) index++;
  return index;
}

function verifyInvariants(trace: ReferenceTrace, nums: readonly number[], target: number) {
  const answer = lowerBound(nums, target);
  expect(arrayAt(trace.initialState).values).toEqual(nums);
  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
    const array = arrayAt(snapshot);
    expect(array.values).toEqual(nums);
    for (const pointer of array.indices) expect(pointer.index).toBe(intAt(snapshot, pointer.name));

    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    if (left !== undefined) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(nums.length);
    }
    if (right !== undefined) {
      expect(right).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(nums.length);
    }
    if (left !== undefined && right !== undefined) {
      expect(left).toBeLessThanOrEqual(right);
      expect(answer).toBeGreaterThanOrEqual(left);
      expect(answer).toBeLessThanOrEqual(right);
      for (let index = 0; index < left; index++) expect(nums[index]).toBeLessThan(target);
      for (let index = right; index < nums.length; index++) expect(nums[index]).toBeGreaterThanOrEqual(target);
    }

    if (snapshot.stepId === 'check-loop') {
      expect(intAt(snapshot, 'mid')).toBeUndefined();
      expect(boolAt(snapshot, 'left < right')).toBe(left! < right!);
    }
    if (snapshot.stepId === 'compute-mid') {
      const mid = intAt(snapshot, 'mid')!;
      expect(mid).toBe(left! + Math.floor((right! - left!) / 2));
      expect(mid).toBeGreaterThanOrEqual(left!);
      expect(mid).toBeLessThan(right!);
    }
    if (snapshot.stepId === 'check-less') {
      const mid = intAt(snapshot, 'mid')!;
      expect(boolAt(snapshot, 'nums[mid] < target')).toBe(nums[mid]! < target);
    }
    if (snapshot.stepId === 'move-left') {
      const mid = intAt(snapshot, 'mid')!;
      expect(previous?.stepId).toBe('check-less');
      expect(left).toBe(mid + 1);
      expect(right).toBe(intAt(previous!, 'right'));
      expect(nums[mid]).toBeLessThan(target);
      expect(right! - left!).toBeLessThan(intAt(previous!, 'right')! - intAt(previous!, 'left')!);
    }
    if (snapshot.stepId === 'move-right') {
      const mid = intAt(snapshot, 'mid')!;
      expect(previous?.stepId).toBe('check-less');
      expect(right).toBe(mid);
      expect(left).toBe(intAt(previous!, 'left'));
      expect(nums[mid]).toBeGreaterThanOrEqual(target);
      expect(right! - left!).toBeLessThan(intAt(previous!, 'right')! - intAt(previous!, 'left')!);
    }
    if (snapshot.stepId === 'return-left') {
      expect(left).toBe(right);
      expect(intAt(snapshot, 'mid')).toBeUndefined();
      expect(intAt(snapshot, '返回值')).toBe(answer);
    }
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual(expectedOutput('35', { nums: [...nums], target }));
}

describe('35 immutable half-open lower-bound reference model', () => {
  it('validates metadata, hashes, initial state, input constraints and the 30-item demo limit', async () => {
    const input = { nums: [1, 3, 5, 7], target: 4 };
    const trace = await buildReferenceTrace(input, 'gap-middle');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.variables.map(variable => variable.name)).toEqual(['nums', 'target']);
    expect(arrayAt(trace.initialState)).toEqual({ kind: 'array', id: 'nums', values: input.nums, indices: [] });
    await expect(buildReferenceTrace({ nums: [], target: 1 }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [2, 1], target: 1 }, 'unsorted')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array.from({ length: 31 }, (_, index) => index), target: 4 }, 'too-large')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('checks the half-open invariant across both branches, hits, gaps and length sentinels', async () => {
    const inputs = [
      { nums: [4], targets: [3, 4, 5] },
      { nums: [1, 9], targets: [0, 1, 8, 9, 10] },
      { nums: [-9, -3, 2, 8], targets: [-10, -9, -4, -3, 0, 2, 8, 9] },
      { nums: Array.from({ length: 30 }, (_, index) => index * 3 - 45), targets: [-46, -45, -1, 42, 43] },
    ];
    for (const input of inputs) {
      for (const target of input.targets) {
        const trace = await buildReferenceTrace({ nums: input.nums, target }, `invariant-${target}`);
        verifyInvariants(trace, input.nums, target);
        expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      }
    }
  });

  it('derives exactly two input-specific predictions from first mid and first boundary snapshots', async () => {
    const answers = async (nums: number[], target: number) => {
      const trace = await buildReferenceTrace({ nums, target }, `prediction-${target}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers([1, 3, 5, 7], 4)).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 2 }]);
    expect(await answers([2, 5, 9], 10)).toEqual([{ kind: 'int', value: 1 }, { kind: 'int', value: 2 }]);
    expect(await answers([4], 3)).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
    expect(await answers([4], 5)).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 1 }]);
    const trace = await buildReferenceTrace({ nums: [1, 3], target: 2 }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
  });

  it('is deterministic, deeply frozen, input-isolated and restores old boundary snapshots', async () => {
    const input = { nums: [1, 3, 5, 7], target: 4 };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace(input, 'history'));
    const firstRight = trace.snapshots.find(snapshot => snapshot.stepId === 'move-right')!;
    const laterLeft = trace.snapshots.find(snapshot => snapshot.stepId === 'move-left')!;
    expect([intAt(firstRight, 'left'), intAt(firstRight, 'right')]).toEqual([0, 2]);
    expect([intAt(laterLeft, 'left'), intAt(laterLeft, 'right')]).toEqual([2, 2]);
    expect([intAt(firstRight, 'left'), intAt(firstRight, 'right')]).toEqual([0, 2]);
    input.nums[0] = -100;
    expect(arrayAt(trace.initialState).values).toEqual([1, 3, 5, 7]);

    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(laterLeft, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ nums: [1, 3, 5, 7], target: 6 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });
});
