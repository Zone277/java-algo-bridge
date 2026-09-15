import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
function num(snapshot: Snapshot, name: string): number {
  const value = snapshot.variables.find(v => v.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`Missing ${name}`);
  return value.value;
}
function verifySteps(trace: ReferenceTrace, nums: number[], target: number) {
  const lines = REFERENCE_SOURCE.split('\n');
  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const map = REFERENCE_STEP_MAP.find(m => m.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: map.startLine, endLine: map.endLine });
    const array = snapshot.structures[0];
    expect(array?.kind).toBe('array');
    if (array?.kind === 'array') {
      expect(array.values).toEqual(nums);
      for (const pointer of array.indices) expect(pointer.index).toBe(num(snapshot, pointer.name));
    }
    if (snapshot.stepId === 'compute-mid') {
      const l = num(snapshot, 'left'); const r = num(snapshot, 'right'); const m = num(snapshot, 'mid');
      expect(lines[map.startLine - 1]?.trim()).toBe('int mid = left + (right - left) / 2;');
      expect(m).toBe(l + Math.floor((r - l) / 2));
      expect(m).toBeGreaterThanOrEqual(l); expect(m).toBeLessThanOrEqual(r);
    }
    if (snapshot.stepId === 'move-left' || snapshot.stepId === 'move-right') {
      expect(previous?.stepId).toBe('check-less');
      const l = num(snapshot, 'left'); const r = num(snapshot, 'right'); const m = num(snapshot, 'mid');
      expect(r - l).toBeLessThan(num(previous!, 'right') - num(previous!, 'left'));
      if (snapshot.stepId === 'move-left') {
        expect(l).toBe(m + 1); expect(r).toBe(num(previous!, 'right')); expect(nums[m]).toBeLessThan(target);
        expect(lines[map.startLine - 1]?.trim()).toBe('left = mid + 1;');
      } else {
        expect(r).toBe(m - 1); expect(l).toBe(num(previous!, 'left')); expect(nums[m]).toBeGreaterThan(target);
        expect(lines[map.startLine - 1]?.trim()).toBe('right = mid - 1;');
      }
    }
    if (!['init-left'].includes(snapshot.stepId)) {
      const l = num(snapshot, 'left'); const r = num(snapshot, 'right');
      expect(l).toBeGreaterThanOrEqual(0); expect(l).toBeLessThanOrEqual(nums.length);
      expect(r).toBeGreaterThanOrEqual(-1); expect(r).toBeLessThan(nums.length);
      const hit = nums.indexOf(target);
      if (hit >= 0) { expect(hit).toBeGreaterThanOrEqual(l); expect(hit).toBeLessThanOrEqual(r); }
    }
    if (snapshot.stepId === 'check-loop') {
      const condition = snapshot.variables.find(v => v.name === '条件结果')?.value;
      expect(condition).toEqual({ kind: 'boolean', value: num(snapshot, 'left') <= num(snapshot, 'right') });
      expect(snapshot.variables.some(v => v.name === 'mid')).toBe(false);
    }
    if (snapshot.stepId === 'not-found') expect(num(snapshot, 'left')).toBeGreaterThan(num(snapshot, 'right'));
    if (snapshot.stepId === 'found') expect(nums[num(snapshot, '返回值')]).toBe(target);
    previous = snapshot;
  }
}

describe('704 immutable reference model', () => {
  it('validates inputs, metadata SHA and initial state separately from executed statements', async () => {
    const input = { nums: [-8, -2, 3, 7, 12], target: 7 };
    const trace = await buildReferenceTrace(input, 'found');
    expect(ReferenceTraceSchema.safeParse(trace).success).toBe(true);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(JSON.stringify(input)).digest('hex'));
    expect(trace.initialState.variables.map(v => v.name)).toEqual(['nums', 'target']);
    expect('stepId' in trace.initialState).toBe(false);
    expect(trace.snapshots[0]?.stepId).toBe('init-left');
    await expect(buildReferenceTrace({ nums: [2, 1], target: 1 }, 'bad')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [], target: 1 }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('checks every step across both branches, singleton hits/misses and all target positions', async () => {
    for (const nums of [[4], [-2, 5], [-8, -2, 3, 7, 12], Array.from({ length: 30 }, (_, i) => i * 3 - 45)]) {
      for (const target of [...nums, nums[0]! - 1, nums.at(-1)! + 1, 0]) {
        const trace = await buildReferenceTrace({ nums, target }, 'invariants');
        expect(trace.finalOutput).toEqual({ kind: 'int', value: nums.indexOf(target) });
        verifySteps(trace, nums, target);
        const checks = trace.snapshots.flatMap((_, i) => predictionAt(trace, i) ?? []);
        expect(checks).toHaveLength(2);
      }
    }
  });

  it('explicitly allows excluded old mid after a boundary update', async () => {
    const trace = await buildReferenceTrace({ nums: [1, 3, 5], target: 5 }, 'right');
    const update = trace.snapshots.find(s => s.stepId === 'move-left')!;
    expect(num(update, 'mid')).toBeLessThan(num(update, 'left'));
    verifySteps(trace, [1, 3, 5], 5);
  });

  it('is deterministic, deeply frozen and independent of mutable input or other traces', async () => {
    const input = { nums: [1, 4, 8], target: 8 };
    const a = await buildReferenceTrace(input, 'a');
    expect(a).toEqual(await buildReferenceTrace(input, 'a'));
    input.nums[0] = -3;
    const deepFrozen = (v: unknown): void => { if (v && typeof v === 'object') { expect(Object.isFrozen(v)).toBe(true); Object.values(v).forEach(deepFrozen); } };
    deepFrozen(a);
    expect(Reflect.set(a.snapshots[0]!, 'explanation', 'changed')).toBe(false);
    const b = await buildReferenceTrace({ nums: [1, 4, 8], target: 2 }, 'b');
    expect(a.inputHash).not.toBe(b.inputHash);
    const keys = a.snapshots.flatMap(s => s.checkpointId ?? []);
    expect(b.snapshots.some(s => s.checkpointId && keys.includes(s.checkpointId))).toBe(false);
    expect(a.finalOutput.value).toBe(2); expect(b.finalOutput.value).toBe(-1);
  });

  it('derives prediction answers from each input including first-step hits', async () => {
    const a = await buildReferenceTrace({ nums: [1, 2, 3, 4, 5], target: 4 }, 'a');
    const b = await buildReferenceTrace({ nums: [4], target: 4 }, 'b');
    const answers = (t: ReferenceTrace) => t.snapshots.flatMap((_, i) => { const p = predictionAt(t, i); return p ? [p.answer] : []; });
    expect(answers(a)).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 3 }]); expect(answers(b)).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
    expect(predictionAt(a, -1)).toBeNull(); expect(predictionAt(a, 500)).toBeNull();
  });

  it('supports full valid judge-size inputs without imposing the UI 30-item limit', async () => {
    const nums = Array.from({ length: 10000 }, (_, i) => i - 5000);
    const trace = await buildReferenceTrace({ nums, target: 4999 }, 'large');
    expect(trace.finalOutput.value).toBe(9999);
    expect(trace.snapshots.length).toBeLessThan(2000);
  });
});
