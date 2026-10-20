import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson153 } from './content.js';
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
function assertTrace(trace: ReferenceTrace, nums: number[]) {
  const minimum = Math.min(...nums);
  const minimumIndex = nums.indexOf(minimum);
  let previous: State = trace.initialState;
  expect(previous.variables.map(variable => variable.name)).toEqual(['nums']);
  for (const snapshot of trace.snapshots) {
    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const mid = intAt(snapshot, 'mid');
    const structure = snapshot.structures[0]!;
    expect(structure.kind).toBe('array');
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
      expect(left).toBeLessThanOrEqual(minimumIndex);
      expect(right).toBeGreaterThanOrEqual(minimumIndex);
      expect(right).toBeLessThan(nums.length);
    }
    if (snapshot.stepId === 'check-loop') {
      expect(boolAt(snapshot, 'left < right')).toBe(left! < right!);
      expect(mid).toBeUndefined();
      expect(boolAt(snapshot, '本轮 nums[mid] > nums[right]')).toBeUndefined();
    }
    if (snapshot.stepId === 'compute-mid') {
      expect(mid).toBe(left! + Math.floor((right! - left!) / 2));
      expect(mid).toBeGreaterThanOrEqual(left!);
      expect(mid).toBeLessThan(right!);
    }
    if (snapshot.stepId === 'compare-right') {
      expect(boolAt(snapshot, '本轮 nums[mid] > nums[right]')).toBe(nums[mid!]! > nums[right!]!);
    }
    if (snapshot.stepId === 'move-left' || snapshot.stepId === 'keep-mid') {
      const oldLeft = intAt(previous, 'left')!;
      const oldRight = intAt(previous, 'right')!;
      const oldMid = intAt(previous, 'mid')!;
      expect(mid).toBe(oldMid);
      expect(right! - left! + 1).toBeLessThan(oldRight - oldLeft + 1);
      expect(right! - left! + 1).toBeLessThanOrEqual(Math.ceil((oldRight - oldLeft + 1) / 2));
      expect(boolAt(snapshot, '本轮 nums[mid] > nums[right]')).toBe(nums[oldMid]! > nums[oldRight]!);
      if (snapshot.stepId === 'move-left') {
        expect(nums[oldMid]!).toBeGreaterThan(nums[oldRight]!);
        expect(left).toBe(oldMid + 1);
        expect(right).toBe(oldRight);
      } else {
        expect(nums[oldMid]!).toBeLessThan(nums[oldRight]!);
        expect(right).toBe(oldMid);
        expect(left).toBe(oldLeft);
      }
    }
    if (snapshot.stepId === 'return-min') {
      expect(left).toBe(right);
      expect(intAt(snapshot, '返回值')).toBe(minimum);
      expect(mid).toBeUndefined();
    }
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: minimum });
}

function assertFrozen(value: unknown) {
  if (value !== null && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    for (const child of Object.values(value)) assertFrozen(child);
  }
}

describe('153 reference state model (not student Java execution)', () => {
  it('preserves minimum-containing intervals and exact statements for every published short case', async () => {
    for (const test of lesson153.testSuite.cases.filter(test => test.input.nums.length <= 30)) {
      const trace = await buildReferenceTrace(test.input, test.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      assertTrace(trace, test.input.nums);
      expect(trace.finalOutput).toEqual(test.expected);
    }
  });

  it('checks every rotation at every length from 1 to 30, including unchanged order', async () => {
    for (let length = 1; length <= 30; length++) {
      const sorted = Array.from({ length }, (_, i) => i * 3 - 45);
      for (let offset = 0; offset < length; offset++) {
        const nums = [...sorted.slice(offset), ...sorted.slice(0, offset)];
        const trace = await buildReferenceTrace({ nums }, `rotation-${length}-${offset}`);
        assertTrace(trace, nums);
      }
    }
  });

  it('gives two dynamic predictions for every demo, including a singleton without fictitious mid', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const checks = trace.snapshots.flatMap((snapshot, index) => {
        const prediction = predictionAt(trace, index);
        if (!snapshot.checkpointId) { expect(prediction).toBeNull(); return []; }
        expect(prediction?.checkpointId).toBe(snapshot.checkpointId);
        expect(prediction?.explanation).toBe(snapshot.explanation);
        return [{ prediction: prediction!, snapshot }];
      });
      expect(checks).toHaveLength(2);
      expect(checks[0]!.prediction.answer).toEqual({ kind: 'int', value: Math.floor((demo.input.nums.length - 1) / 2) });
      expect(checks[1]!.prediction.answer).toEqual({ kind: 'int', value: Math.min(...demo.input.nums) });
      expect(checks[0]!.snapshot.stepId).toBe(demo.input.nums.length === 1 ? 'init-right' : 'compute-mid');
      expect(checks[0]!.prediction.checkpointId).not.toBe(checks[1]!.prediction.checkpointId);
    }
  });

  it('keeps deterministic input-bound identities, source hash and deeply frozen reversible snapshots', async () => {
    const input = { nums: [6, 9, -4, -1, 2] };
    const trace = await buildReferenceTrace(input, 'stable');
    expect(trace).toEqual(await buildReferenceTrace(input, 'stable'));
    expect(trace.mode).toBe('reference-model');
    expect(trace.referenceSourceHash).toBe(lesson153.reference.sourceHash);
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    assertFrozen(trace);
    const before = JSON.stringify(trace);
    input.nums[0] = 4000;
    expect(JSON.stringify(trace)).toBe(before);
    const selected = trace.snapshots.findIndex(snapshot => snapshot.stepId === 'keep-mid');
    const past = trace.snapshots[selected - 1]!;
    const serialized = JSON.stringify(past);
    expect(trace.snapshots[selected]!.snapshotId).not.toBe(past.snapshotId);
    expect(JSON.stringify(trace.snapshots[selected - 1])).toBe(serialized);
    const switched = await buildReferenceTrace({ nums: [3, 5, 8, -2, 1] }, 'switched');
    expect(switched.inputHash).not.toBe(trace.inputHash);
    expect(switched.snapshots.find(snapshot => snapshot.checkpointId)!.checkpointId).not.toBe(trace.snapshots.find(snapshot => snapshot.checkpointId)!.checkpointId);
    expect(() => { (past.structures[0] as { id: string }).id = 'changed'; }).toThrow();
  });

  it('rejects invalid inputs and oversized demos explicitly without truncation', async () => {
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1, 1] }, 'repeat')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1, 3, 2] }, 'not-rotation')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1] }, ' ')).rejects.toThrow('标识不能为空');
    await expect(buildReferenceTrace({ nums: Array.from({ length: 31 }, (_, i) => i) }, 'too-large')).rejects.toThrow('30');
    expect((await buildReferenceTrace({ nums: Array.from({ length: 30 }, (_, i) => i) }, 'boundary')).finalOutput).toEqual({ kind: 'int', value: 0 });
  });
});
