import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type MergeSortedArrayInput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson88 } from './content.js';
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
function arrayAt(state: State, id: string): readonly number[] {
  const structure = state.structures.find(item => item.kind === 'array' && item.id === id);
  if (structure?.kind !== 'array') throw new Error(`Missing ${id} structure`);
  return structure.values;
}
function sortedExpected(input: MergeSortedArrayInput) {
  return [...input.nums1.slice(0, input.m), ...input.nums2].sort((a, b) => a - b);
}

describe('88 immutable backward-merge state model', () => {
  it('checks the final suffix and pointer movement at every intermediate snapshot', async () => {
    const small = lesson88.testSuite.cases.filter(item => item.input.nums1.length <= 30).map(item => item.input);
    const inputs = [...demoInputs.map(item => item.input), ...small];
    for (const [index, input] of inputs.entries()) {
      const trace = await buildReferenceTrace(input, `invariant-${index}`);
      const sorted = sortedExpected(input);
      expect(trace.finalOutput).toEqual({ kind: 'int-array', values: sorted });
      expect(trace.finalOutput).toEqual(expectedOutput('88', input));
      expect(arrayAt(trace.initialState, 'nums1')).toEqual(input.nums1);
      let previous: State = trace.initialState;
      for (const snapshot of trace.snapshots) {
        const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
        expect(arrayAt(snapshot, 'nums2')).toEqual(input.nums2);
        const nums1 = arrayAt(snapshot, 'nums1');
        const i = intAt(snapshot, 'i');
        const j = intAt(snapshot, 'j');
        const write = intAt(snapshot, 'write');
        if (i !== undefined) { expect(i).toBeGreaterThanOrEqual(-1); expect(i).toBeLessThan(input.m); }
        if (j !== undefined) { expect(j).toBeGreaterThanOrEqual(-1); expect(j).toBeLessThan(input.n); }
        if (write !== undefined) { expect(write).toBeGreaterThanOrEqual(-1); expect(write).toBeLessThan(input.m + input.n); }
        if (i !== undefined && write !== undefined) expect(write).toBeGreaterThanOrEqual(i);
        const filledStart = write === undefined ? nums1.length : ['write-first', 'write-second', 'move-i', 'move-j'].includes(snapshot.stepId) ? write : write + 1;
        expect(nums1.slice(filledStart), `${input.nums1.join(',')}:${snapshot.snapshotId}`).toEqual(sorted.slice(filledStart));
        if (snapshot.stepId === 'check-loop') expect(boolAt(snapshot, 'j >= 0')).toBe(j! >= 0);
        if (snapshot.stepId === 'choose-branch') expect(boolAt(snapshot, '选 nums1[i]')).toBe(i! >= 0 && nums1[i!]! > input.nums2[j!]!);
        if (snapshot.stepId === 'write-first') expect(nums1[write!]).toBe(arrayAt(previous, 'nums1')[i!]!);
        if (snapshot.stepId === 'write-second') expect(nums1[write!]).toBe(input.nums2[j!]!);
        if (snapshot.stepId === 'move-i') expect(i).toBe(intAt(previous, 'i')! - 1);
        if (snapshot.stepId === 'move-j') expect(j).toBe(intAt(previous, 'j')! - 1);
        if (snapshot.stepId === 'move-write') expect(write).toBe(intAt(previous, 'write')! - 1);
        previous = snapshot;
      }
      expect(arrayAt(trace.snapshots.at(-1)!, 'nums1')).toEqual(sorted);
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
    }
  });

  it('generates two input-specific predictions including the n=0 path', async () => {
    const answers = async (input: MergeSortedArrayInput, id: string) => {
      const trace = await buildReferenceTrace(input, id);
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer);
    };
    expect(await answers(demoInputs[0]!.input, 'first')).toEqual([{ kind: 'int', value: 5 }, { kind: 'choice', optionId: 'nums2' }]);
    expect(await answers(demoInputs[1]!.input, 'second')).toEqual([{ kind: 'int', value: 2 }, { kind: 'choice', optionId: 'nums2' }]);
    expect(await answers(demoInputs[2]!.input, 'third')).toEqual([{ kind: 'int', value: 2 }, { kind: 'choice', optionId: 'stop' }]);
  });

  it('keeps the filled suffix correct for fixed-seed sorted random inputs', async () => {
    let seed = 88;
    const next = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 60; sample++) {
      const m = next() % 12;
      const n = 1 + next() % 12;
      const first = Array.from({ length: m }, () => next() % 13 - 6).sort((a, b) => a - b);
      const second = Array.from({ length: n }, () => next() % 13 - 6).sort((a, b) => a - b);
      const input = { nums1: [...first, ...Array<number>(n).fill(0)], m, nums2: second, n };
      const expected = sortedExpected(input);
      const trace = await buildReferenceTrace(input, `random-${sample}`);
      expect(trace.finalOutput).toEqual({ kind: 'int-array', values: expected });
      for (const snapshot of trace.snapshots) {
        const write = intAt(snapshot, 'write');
        const start = write === undefined ? m + n : ['write-first', 'write-second', 'move-i', 'move-j'].includes(snapshot.stepId) ? write : write + 1;
        expect(arrayAt(snapshot, 'nums1').slice(start), `sample ${sample} ${snapshot.snapshotId}`).toEqual(expected.slice(start));
      }
    }
  });

  it('validates hashes, freezes all states, restores earlier arrays, and rejects oversize demonstrations', async () => {
    const input = { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 };
    const trace = await buildReferenceTrace(input, 'hashes');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace).toEqual(await buildReferenceTrace(input, 'hashes'));
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'choose-branch')!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'write-second')!;
    expect(arrayAt(before, 'nums1')).toEqual([1, 2, 3, 0, 0, 0]);
    expect(arrayAt(after, 'nums1')).toEqual([1, 2, 3, 0, 0, 6]);
    input.nums1[0] = 99;
    input.nums2[0] = 99;
    expect(arrayAt(before, 'nums1')).toEqual([1, 2, 3, 0, 0, 0]);
    expect(arrayAt(before, 'nums2')).toEqual([2, 5, 6]);
    const checkFrozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(checkFrozen); } };
    checkFrozen(trace);
    expect(Reflect.set(after, 'explanation', 'changed')).toBe(false);
    expect(predictionAt(trace, -1)).toBeNull();
    await expect(buildReferenceTrace({ nums1: [1, 0], m: 1, nums2: [2], n: 1 }, '')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums1: [...Array<number>(15).fill(1), ...Array<number>(16).fill(0)], m: 15, nums2: Array<number>(16).fill(2), n: 16 }, 'oversize')).rejects.toThrow(/30/);
  });
});
