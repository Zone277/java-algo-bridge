import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson33 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function assertTrace(trace: ReferenceTrace, nums: number[], target: number) {
  const answer = nums.indexOf(target);
  let previous: State = trace.initialState;
  expect(previous.variables.map(variable => variable.name)).toEqual(['nums', 'target']);
  for (const snapshot of trace.snapshots) {
    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const mid = intAt(snapshot, 'mid');
    expect(intAt(snapshot, 'target')).toBe(target);
    const structure = snapshot.structures[0]!;
    if (structure.kind !== 'array') throw new Error('array expected');
    expect(structure.values).toEqual(nums);
    expect(structure.values.length).toBeLessThanOrEqual(30);
    expect(structure.indices).toEqual([
      ...(left === undefined ? [] : [{ name: 'left', index: left }]),
      ...(right === undefined ? [] : [{ name: 'right', index: right }]),
      ...(mid === undefined ? [] : [{ name: 'mid', index: mid }]),
    ]);
    const map = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: map.startLine, endLine: map.endLine });
    if (left !== undefined && right !== undefined) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(nums.length);
      expect(right).toBeGreaterThanOrEqual(-1);
      expect(right).toBeLessThan(nums.length);
      expect(left).toBeLessThanOrEqual(right + 1);
      if (answer !== -1) {
        expect(left).toBeLessThanOrEqual(answer);
        expect(right).toBeGreaterThanOrEqual(answer);
      }
    }
    if (snapshot.stepId === 'check-loop') {
      expect(boolAt(snapshot, 'left <= right')).toBe(left! <= right!);
      expect(mid).toBeUndefined();
    }
    if (snapshot.stepId === 'compute-mid') {
      expect(mid).toBe(left! + Math.floor((right! - left!) / 2));
      expect(mid).toBeGreaterThanOrEqual(left!);
      expect(mid).toBeLessThanOrEqual(right!);
    }
    if (snapshot.stepId === 'check-equal') expect(boolAt(snapshot, 'nums[mid] == target')).toBe(nums[mid!] === target);
    if (snapshot.stepId === 'check-left-sorted') {
      const sorted = nums.slice(left, mid! + 1);
      const isSorted = sorted.every((value, i) => i === 0 || sorted[i - 1]! < value);
      expect(boolAt(snapshot, 'nums[left] <= nums[mid]')).toBe(isSorted);
      if (!isSorted) {
        const rightHalf = nums.slice(mid, right! + 1);
        expect(rightHalf.every((value, i) => i === 0 || rightHalf[i - 1]! < value)).toBe(true);
      }
    }
    if (snapshot.stepId === 'check-left-range') expect(boolAt(snapshot, 'nums[left] <= target && target < nums[mid]')).toBe(nums[left!]! <= target && target < nums[mid!]!);
    if (snapshot.stepId === 'check-right-range') expect(boolAt(snapshot, 'nums[mid] < target && target <= nums[right]')).toBe(nums[mid!]! < target && target <= nums[right!]!);
    if (['keep-left', 'discard-left', 'keep-right', 'discard-right'].includes(snapshot.stepId)) {
      const oldLeft = intAt(previous, 'left')!;
      const oldRight = intAt(previous, 'right')!;
      const oldMid = intAt(previous, 'mid')!;
      expect(mid).toBe(oldMid);
      expect(nums[oldMid]).not.toBe(target);
      expect(right! - left! + 1).toBeLessThanOrEqual(Math.floor((oldRight - oldLeft + 1) / 2));
      expect(snapshot.variables.some(variable => variable.value.kind === 'boolean')).toBe(false);
      const wasLeftSorted = nums[oldLeft]! <= nums[oldMid]!;
      const inLeftRange = nums[oldLeft]! <= target && target < nums[oldMid]!;
      const inRightRange = nums[oldMid]! < target && target <= nums[oldRight]!;
      expect(snapshot.stepId).toBe(wasLeftSorted ? (inLeftRange ? 'keep-left' : 'discard-left') : (inRightRange ? 'keep-right' : 'discard-right'));
      if (snapshot.stepId === 'discard-left' || snapshot.stepId === 'keep-right') {
        expect(left).toBe(oldMid + 1);
        expect(right).toBe(oldRight);
      } else {
        expect(right).toBe(oldMid - 1);
        expect(left).toBe(oldLeft);
      }
    }
    if (snapshot.stepId === 'found') {
      expect(mid).toBe(answer);
      expect(intAt(snapshot, '返回值')).toBe(answer);
      expect(nums[mid!]).toBe(target);
    }
    if (snapshot.stepId === 'not-found') {
      expect(left).toBeGreaterThan(right!);
      expect(answer).toBe(-1);
      expect(intAt(snapshot, '返回值')).toBe(-1);
      expect(mid).toBeUndefined();
    }
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: answer });
}

function assertFrozen(value: unknown) {
  if (value !== null && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    for (const child of Object.values(value)) assertFrozen(child);
  }
}

describe('33 reference model, separate from student Java', () => {
  it('preserves the target invariant, exact scope and all four exclusion branches', async () => {
    const branches = new Set<string>();
    for (const test of lesson33.testSuite.cases.filter(test => test.input.nums.length <= 30)) {
      const trace = await buildReferenceTrace(test.input, test.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      assertTrace(trace, test.input.nums, test.input.target);
      expect(trace.finalOutput).toEqual(test.expected);
      trace.snapshots.forEach(snapshot => branches.add(snapshot.stepId));
    }
    for (const branch of ['keep-left', 'discard-left', 'keep-right', 'discard-right', 'found', 'not-found']) expect(branches.has(branch)).toBe(true);
  });

  it('checks every rotation of short arrays with all hits and absent values between/outside them', async () => {
    for (let length = 1; length <= 10; length++) {
      const sorted = Array.from({ length }, (_, i) => i * 3 - 15);
      for (let offset = 0; offset < length; offset++) {
        const nums = [...sorted.slice(offset), ...sorted.slice(0, offset)];
        for (let target = -16; target <= sorted.at(-1)! + 1; target++) {
          assertTrace(await buildReferenceTrace({ nums, target }, `case-${length}-${offset}-${target}`), nums, target);
        }
      }
    }
  });

  it('gives two input-dependent checkpoints including first-iteration and singleton hits', async () => {
    const inputs = [...demoInputs, { id: 'mid-hit', input: { nums: [8, 11, 14, -5, -2, 1, 4], target: -5 } }, { id: 'single-miss', input: { nums: [7], target: 9 } }];
    for (const demo of inputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((snapshot, index) => {
        const prediction = predictionAt(trace, index);
        if (!snapshot.checkpointId) { expect(prediction).toBeNull(); return []; }
        expect(prediction?.checkpointId).toBe(snapshot.checkpointId);
        expect(prediction?.explanation).toBe(snapshot.explanation);
        return [prediction!];
      });
      expect(predictions).toHaveLength(2);
      expect(predictions[0]!.answer).toEqual({ kind: 'int', value: Math.floor((demo.input.nums.length - 1) / 2) });
      expect(predictions[1]!.answer).toEqual({ kind: 'int', value: demo.input.nums.indexOf(demo.input.target) });
      expect(predictions[0]!.checkpointId).not.toBe(predictions[1]!.checkpointId);
    }
  });

  it('freezes snapshots and binds predictions to the full input including target', async () => {
    const input = { nums: [8, 11, 14, -5, -2, 1, 4], target: 11 };
    const trace = await buildReferenceTrace(input, 'stable');
    expect(trace).toEqual(await buildReferenceTrace(input, 'stable'));
    expect(trace.mode).toBe('reference-model');
    expect(trace.referenceSourceHash).toBe(lesson33.reference.sourceHash);
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    assertFrozen(trace);
    const before = JSON.stringify(trace);
    const changedTarget = await buildReferenceTrace({ ...input, target: 1 }, 'switched');
    expect(changedTarget.inputHash).not.toBe(trace.inputHash);
    expect(changedTarget.snapshots.find(snapshot => snapshot.checkpointId)!.checkpointId).not.toBe(trace.snapshots.find(snapshot => snapshot.checkpointId)!.checkpointId);
    input.nums[0] = 9999;
    input.target = 4;
    expect(JSON.stringify(trace)).toBe(before);
    const move = trace.snapshots.findIndex(snapshot => snapshot.stepId === 'discard-right');
    const previous = trace.snapshots[move - 1]!;
    const saved = JSON.stringify(previous);
    expect(intAt(trace.snapshots[move]!, 'right')).not.toBe(intAt(previous, 'right'));
    expect(JSON.stringify(trace.snapshots[move - 1])).toBe(saved);
    expect(() => { (previous.structures[0] as { id: string }).id = 'changed'; }).toThrow();
  });

  it('rejects malformed and oversized demos without truncation and accepts all thirty items', async () => {
    await expect(buildReferenceTrace({ nums: [], target: 0 }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1, 1], target: 1 }, 'duplicates')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1, 3, 2], target: 3 }, 'not-rotation')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1], target: 10001 }, 'target-range')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1], target: 1 }, ' ')).rejects.toThrow('标识不能为空');
    await expect(buildReferenceTrace({ nums: Array.from({ length: 31 }, (_, i) => i), target: 10 }, 'too-large')).rejects.toThrow('30');
    const boundary = lesson33.testSuite.cases.find(test => test.id === '33-thirty')!;
    assertTrace(await buildReferenceTrace(boundary.input, boundary.id), boundary.input.nums, boundary.input.target);
  });
});
