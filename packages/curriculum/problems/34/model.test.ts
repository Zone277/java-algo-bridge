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
function numsAt(state: State) {
  const structure = state.structures.find(item => item.id === 'nums');
  if (structure?.kind !== 'array') throw new Error('Missing nums array');
  return structure;
}
function scan(nums: readonly number[], target: number): [number, number] {
  let first = -1; let last = -1;
  nums.forEach((value, index) => { if (value === target) { if (first === -1) first = index; last = index; } });
  return [first, last];
}
function lowerBound(nums: readonly number[], target: number) {
  return nums.findIndex(value => value >= target) < 0 ? nums.length : nums.findIndex(value => value >= target);
}
function upperBound(nums: readonly number[], target: number) {
  return nums.findIndex(value => value > target) < 0 ? nums.length : nums.findIndex(value => value > target);
}

function verifyTrace(trace: ReferenceTrace, nums: readonly number[], target: number) {
  const lower = lowerBound(nums, target);
  const upper = upperBound(nums, target);
  const [first, last] = scan(nums, target);
  expect(numsAt(trace.initialState).values).toEqual(nums);
  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange, snapshot.stepId).toEqual({ startLine: mapped?.startLine, endLine: mapped?.endLine });
    const array = numsAt(snapshot);
    expect(array.values).toEqual(nums);
    for (const pointer of array.indices) expect(pointer.index).toBe(intAt(snapshot, pointer.name));

    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const mid = intAt(snapshot, 'mid');
    const firstPosition = intAt(snapshot, 'first');
    const phase = snapshot.variables.find(variable => variable.name === '阶段（教学标记）')?.value;
    if (phase?.kind !== 'string') throw new Error('Missing phase marker');
    if (left !== undefined) expect(left).toBeGreaterThanOrEqual(0);
    if (right !== undefined) expect(right).toBeLessThanOrEqual(nums.length);
    if (left !== undefined && right !== undefined && snapshot.stepId !== 'upper-init-left') {
      expect(left).toBeLessThanOrEqual(right);
      if (phase.value === '第一个 >= target') {
        expect(lower).toBeGreaterThanOrEqual(left);
        expect(lower).toBeLessThanOrEqual(right);
        for (let i = 0; i < left; i++) expect(nums[i]).toBeLessThan(target);
        for (let i = right; i < nums.length; i++) expect(nums[i]).toBeGreaterThanOrEqual(target);
      } else {
        expect(phase.value).toBe('第一个 > target');
        expect(upper).toBeGreaterThanOrEqual(left);
        expect(upper).toBeLessThanOrEqual(right);
        for (let i = 0; i < left; i++) expect(nums[i]).toBeLessThanOrEqual(target);
        for (let i = right; i < nums.length; i++) expect(nums[i]).toBeGreaterThan(target);
      }
    }
    if (snapshot.stepId === 'lower-check-loop') {
      expect(mid).toBeUndefined();
      expect(boolAt(snapshot, 'left < right（下界表达式）')).toBe(left! < right!);
    }
    if (snapshot.stepId === 'upper-check-loop') {
      expect(mid).toBeUndefined();
      expect(boolAt(snapshot, 'left < right（上界表达式）')).toBe(left! < right!);
    }
    if (snapshot.stepId.endsWith('compute-mid')) {
      expect(mid).toBe(left! + Math.floor((right! - left!) / 2));
      expect(mid).toBeGreaterThanOrEqual(left!);
      expect(mid).toBeLessThan(right!);
    }
    if (snapshot.stepId === 'lower-check-less') expect(boolAt(snapshot, 'nums[mid] < target（下界表达式）')).toBe(nums[mid!]! < target);
    if (snapshot.stepId === 'upper-check-less-equal') expect(boolAt(snapshot, 'nums[mid] <= target（上界表达式）')).toBe(nums[mid!]! <= target);
    if (snapshot.stepId.endsWith('move-left') || snapshot.stepId.endsWith('move-right')) {
      expect(previous?.stepId).toMatch(/check-less/);
      expect(mid).toBe(intAt(previous!, 'mid'));
      expect(right! - left!).toBeLessThan(intAt(previous!, 'right')! - intAt(previous!, 'left')!);
      if (snapshot.stepId.endsWith('move-left')) {
        expect(left).toBe(mid! + 1);
        expect(right).toBe(intAt(previous!, 'right'));
      } else {
        expect(right).toBe(mid);
        expect(left).toBe(intAt(previous!, 'left'));
      }
    }
    if (firstPosition !== undefined) expect(firstPosition).toBe(lower);
    if (snapshot.stepId === 'check-absent') {
      expect(boolAt(snapshot, 'first == nums.length || nums[first] != target（表达式）')).toBe(first === -1);
    }
    if (snapshot.stepId.startsWith('return-')) {
      const output = snapshot.structures.find(structure => structure.id === 'result');
      expect(output?.kind).toBe('array');
      if (output?.kind === 'array') expect(output.values).toEqual([first, last]);
      expect(snapshot.variables.find(variable => variable.name === '返回值')?.value).toEqual({ kind: 'reference', objectId: 'result' });
    }
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [first, last] });
  expect(trace.finalOutput).toEqual(expectedOutput('34', { nums: [...nums], target }));
  expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
}

describe('34 immutable two-boundary reference model', () => {
  it('validates hashes, empty input, sorted-input rule, demo size, and immutable snapshots', async () => {
    const input = { nums: [1, 2, 2, 2, 4], target: 2 };
    const trace = await buildReferenceTrace(input, 'repeated');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.mode).toBe('reference-model');
    expect(trace.initialState.variables.some(variable => variable.name === 'left')).toBe(false);
    expect(numsAt(trace.initialState).values).toEqual(input.nums);
    await expect(buildReferenceTrace({ nums: [2, 1], target: 1 }, 'unsorted')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array(31).fill(1), target: 1 }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    const firstUpper = trace.snapshots.find(snapshot => snapshot.stepId === 'upper-compute-mid')!;
    const laterUpper = trace.snapshots.find(snapshot => snapshot.stepId === 'upper-move-left')!;
    expect([intAt(firstUpper, 'left'), intAt(firstUpper, 'right')]).toEqual([1, 5]);
    expect([intAt(laterUpper, 'left'), intAt(laterUpper, 'right')]).toEqual([4, 5]);
    input.nums[0] = -100;
    expect(numsAt(trace.initialState).values).toEqual([1, 2, 2, 2, 4]);
    expect(Reflect.set(firstUpper, 'explanation', 'changed')).toBe(false);
  });

  it('checks both interval invariants for every nondecreasing short input and target', async () => {
    const arrays: number[][] = [[]];
    const values = [-1, 0, 1];
    const append = (prefix: number[], firstAllowed: number): void => {
      if (prefix.length === 5) return;
      for (let index = firstAllowed; index < values.length; index++) {
        const next = [...prefix, values[index]!];
        arrays.push(next);
        append(next, index);
      }
    };
    append([], 0);
    for (const nums of arrays) for (const target of [-2, -1, 0, 1, 2]) {
      const trace = await buildReferenceTrace({ nums, target }, `enumerated-${nums.join('_')}-${target}`);
      verifyTrace(trace, nums, target);
    }
  });

  it('offers input-specific predictions even for empty and absent inputs', async () => {
    const answers = async (nums: number[], target: number) => {
      const trace = await buildReferenceTrace({ nums, target }, `prediction-${nums.length}-${target}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
    };
    expect((await answers([1, 2, 2, 2, 4], 2)).map(item => item.answer)).toEqual([
      { kind: 'int', value: 1 }, { kind: 'int', value: 3 }, { kind: 'text', value: '[1,3]' },
    ]);
    expect((await answers([], 8)).map(item => item.answer)).toEqual([{ kind: 'int', value: 0 }, { kind: 'text', value: '[-1,-1]' }]);
    expect((await answers([1, 2, 4], 3)).map(item => item.answer)).toEqual([{ kind: 'int', value: 2 }, { kind: 'text', value: '[-1,-1]' }]);
    const trace = await buildReferenceTrace({ nums: [2, 2], target: 2 }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const other = await buildReferenceTrace({ nums: [2, 2], target: 3 }, 'different-input');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? [])).not.toContain(trace.snapshots.find(snapshot => snapshot.checkpointId)?.checkpointId);
  });
});
