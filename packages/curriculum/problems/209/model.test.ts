import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, stableJson, type MinimumSubarrayInput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson209 } from './content.js';
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
  const structure = state.structures.find(item => item.id === 'nums');
  if (structure?.kind !== 'array') throw new Error('Expected numeric nums array');
  return structure;
}

/** Enumerate all contiguous intervals, independently of the window algorithm. */
function shortest(nums: readonly number[], target: number): number {
  let answer = nums.length + 1;
  for (let start = 0; start < nums.length; start++) {
    let sum = 0;
    for (let end = start; end < nums.length; end++) {
      sum += nums[end]!;
      if (sum >= target) answer = Math.min(answer, end - start + 1);
    }
  }
  return answer > nums.length ? 0 : answer;
}

function verifyStates(trace: ReferenceTrace, input: MinimumSubarrayInput): void {
  const { nums, target } = input;
  expect(arrayAt(trace.initialState).values).toEqual(nums);
  expect(arrayAt(trace.initialState).indices).toEqual([]);
  let examinedBest = nums.length + 1;
  let previous: State = trace.initialState;
  let previousLeft = 0;
  let previousSumEnd = 0;

  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    const array = arrayAt(snapshot);
    expect(array.values).toEqual(nums);
    expect(snapshot.structures.map(item => item.kind)).toEqual(['array']);
    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const sum = intAt(snapshot, 'sum');
    const best = intAt(snapshot, 'best');
    const sumStart = intAt(snapshot, 'sumStart（演示标记）');
    const sumEnd = intAt(snapshot, 'sumEndExclusive（演示标记）');
    for (const name of ['left', 'right']) {
      const value = intAt(snapshot, name);
      const pointer = array.indices.find(item => item.name === name);
      if (value === undefined) expect(pointer).toBeUndefined();
      else expect(pointer?.index).toBe(value);
    }
    if (left !== undefined) {
      expect(left).toBeGreaterThanOrEqual(previousLeft);
      expect(left).toBeLessThanOrEqual(nums.length);
      previousLeft = left;
    }
    if (sum !== undefined) {
      expect(sumStart).toBeGreaterThanOrEqual(0);
      expect(sumEnd).toBeGreaterThanOrEqual(sumStart!);
      expect(sumEnd).toBeGreaterThanOrEqual(previousSumEnd);
      expect(sumEnd).toBeLessThanOrEqual(nums.length);
      expect(sum).toBe(nums.slice(sumStart!, sumEnd!).reduce((total, value) => total + value, 0));
      expect(sumStart).toBe(snapshot.stepId === 'remove-left' ? left! + 1 : left);
      previousSumEnd = sumEnd!;
    }
    if (snapshot.stepId === 'update-best') {
      expect(sum).toBeGreaterThanOrEqual(target);
      expect(left).toBeLessThanOrEqual(right!);
      examinedBest = Math.min(examinedBest, right! - left! + 1);
    }
    if (best !== undefined) expect(best).toBe(examinedBest);
    if (snapshot.stepId === 'include-right') {
      expect(sum).toBe(intAt(previous, 'sum')! + nums[right!]!);
      expect(sumEnd).toBe(right! + 1);
    }
    if (snapshot.stepId === 'remove-left') {
      expect(left).toBe(intAt(previous, 'left'));
      expect(sum).toBe(intAt(previous, 'sum')! - nums[left!]!);
      expect(sumStart).toBe(left! + 1);
      expect(snapshot.explanation).toContain('left 变量仍为');
    }
    if (snapshot.stepId === 'move-left') {
      expect(left).toBe(intAt(previous, 'left')! + 1);
      expect(sum).toBe(intAt(previous, 'sum'));
      expect(sumStart).toBe(left);
    }
    if (snapshot.stepId === 'check-target') {
      expect(boolAt(snapshot, 'sum >= target')).toBe(sum! >= target);
      expect(sumEnd).toBe(right! + 1);
      if (sum! < target) {
        const prefixBest = shortest(nums.slice(0, right! + 1), target);
        expect(best).toBe(prefixBest || nums.length + 1);
      }
    }
    if (snapshot.stepId === 'check-right' || snapshot.stepId === 'move-right') {
      expect(sumEnd).toBe(right);
      expect(sum).toBeLessThan(target);
      const prefixBest = shortest(nums.slice(0, right), target);
      expect(best).toBe(prefixBest || nums.length + 1);
      if (snapshot.stepId === 'check-right') expect(boolAt(snapshot, 'right < length')).toBe(right! < nums.length);
      else {
        expect(right).toBe(intAt(previous, 'right')! + 1);
        expect(sum).toBe(intAt(previous, 'sum'));
      }
    }
    if (snapshot.stepId === 'return-result') {
      expect(right).toBeUndefined();
      expect(sumEnd).toBe(nums.length);
      expect(intAt(snapshot, '返回值')).toBe(shortest(nums, target));
    }
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: shortest(nums, target) });
  const count = (step: string) => trace.snapshots.filter(snapshot => snapshot.stepId === step).length;
  expect(count('include-right')).toBe(nums.length);
  expect(count('move-right')).toBe(nums.length);
  expect(count('check-right')).toBe(nums.length + 1);
  expect(count('remove-left')).toBe(count('move-left'));
  expect(count('remove-left')).toBeLessThanOrEqual(nums.length);
}

describe('209 immutable numeric sliding-window model', () => {
  it('validates input and hashes, and rejects over-limit demos without truncation', async () => {
    const input = demoInputs[0]!.input;
    const trace = await buildReferenceTrace(input, 'default');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    await expect(buildReferenceTrace({ target: 0, nums: [1] }, 'bad-target')).rejects.toThrow();
    await expect(buildReferenceTrace({ target: 1, nums: [0] }, 'zero')).rejects.toThrow();
    await expect(buildReferenceTrace({ target: 1, nums: [-1, 2] }, 'negative')).rejects.toThrow();
    await expect(buildReferenceTrace({ target: 1, nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ target: 1, nums: Array<number>(31).fill(1) }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow();
  });

  it('verifies every intermediate sum, examined-best and loop-boundary invariant', async () => {
    for (const test of lesson209.testSuite.cases) {
      if (test.input.nums.length > 30) {
        await expect(buildReferenceTrace(test.input, test.id)).rejects.toThrow(/30/);
        continue;
      }
      const trace = await buildReferenceTrace(test.input, test.id);
      verifyStates(trace, test.input);
      expect(trace.finalOutput).toEqual(test.expected);
    }
    const trace = await buildReferenceTrace({ target: 8, nums: [1, 1, 1, 8] }, 'repeated-removal');
    const removals = trace.snapshots.filter(snapshot => snapshot.stepId === 'remove-left');
    expect(removals.map(snapshot => intAt(snapshot, 'sum'))).toEqual([10, 9, 8, 0]);
    expect(removals.map(snapshot => intAt(snapshot, 'left'))).toEqual([0, 1, 2, 3]);
    expect(removals.map(snapshot => intAt(snapshot, 'best'))).toEqual([4, 3, 2, 1]);
  });

  it('checks fixed-seed positive inputs against exhaustive contiguous interval enumeration', async () => {
    let seed = 20920261018;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 80; sample++) {
      const nums = Array.from({ length: random() % 12 + 1 }, () => random() % 9 + 1);
      const target = random() % 70 + 1;
      const input = { target, nums };
      verifyStates(await buildReferenceTrace(input, `seed-${sample}`), input);
    }
  });

  it('derives two predictions for contractions, single elements and no-solution inputs', async () => {
    const answers = async (input: MinimumSubarrayInput) => {
      const trace = await buildReferenceTrace(input, 'prediction');
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      return predictions.map(item => item.answer);
    };
    expect(await answers(demoInputs[0]!.input)).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 6 }]);
    expect(await answers({ target: 7, nums: [9] })).toEqual([{ kind: 'int', value: 9 }, { kind: 'int', value: 0 }]);
    expect(await answers({ target: 7, nums: [6] })).toEqual([{ kind: 'int', value: 6 }, { kind: 'int', value: 0 }]);
    expect(await answers({ target: 6, nums: [2, 2, 2, 2] })).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 4 }]);
    const trace = await buildReferenceTrace(demoInputs[0]!.input, 'no-prediction');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 9999)).toBeNull();
    expect(predictionAt(trace, 0)).toBeNull();
  });

  it('preserves every microstep on backward navigation and freezes nested state', async () => {
    const input = { target: 7, nums: [2, 3, 1, 2, 4, 3] };
    const trace = await buildReferenceTrace(input, 'history');
    const copied = JSON.stringify(trace);
    expect(trace).toEqual(await buildReferenceTrace({ target: input.target, nums: [...input.nums] }, 'history'));
    const index = trace.snapshots.findIndex(snapshot => snapshot.stepId === 'remove-left');
    const before = trace.snapshots[index - 1]!;
    const removed = trace.snapshots[index]!;
    const moved = trace.snapshots[index + 1]!;
    expect([intAt(before, 'left'), intAt(removed, 'left'), intAt(moved, 'left')]).toEqual([0, 0, 1]);
    expect([intAt(before, 'sum'), intAt(removed, 'sum'), intAt(moved, 'sum')]).toEqual([8, 6, 6]);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(arrayAt(removed).values, 0, 99)).toBe(false);
    expect(Reflect.set(removed, 'explanation', 'changed')).toBe(false);
    input.nums[0] = 99;
    expect(JSON.stringify(trace)).toBe(copied);
    expect(intAt(trace.snapshots[index - 1]!, 'sum')).toBe(8);
    const changed = await buildReferenceTrace({ target: 8, nums: [2, 3, 1, 2, 4, 3] }, 'new-input');
    expect(changed.inputHash).not.toBe(trace.inputHash);
    const oldIds = new Set(trace.snapshots.map(snapshot => snapshot.checkpointId).filter(Boolean));
    expect(changed.snapshots.some(snapshot => snapshot.checkpointId && oldIds.has(snapshot.checkpointId))).toBe(false);
  });
});
