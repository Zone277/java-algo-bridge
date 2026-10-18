import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HouseRobberInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
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

function dpAt(state: State) {
  const dp = state.structures.find(structure => structure.kind === 'dp');
  if (dp?.kind !== 'dp') throw new Error('Missing prefix-optimum teaching table');
  return dp;
}

function arrayAt(state: State) {
  const array = state.structures.find(structure => structure.kind === 'array');
  if (array?.kind !== 'array') throw new Error('Missing nums array');
  return array;
}

// Enumerate nonadjacent subsets, independently of both rolling DP and the trusted DP-array oracle.
function exhaustiveBest(nums: readonly number[], count: number): number {
  let best = 0;
  const visit = (index: number, previousChosen: boolean, amount: number) => {
    if (index === count) { best = Math.max(best, amount); return; }
    visit(index + 1, false, amount);
    if (!previousChosen) visit(index + 1, true, amount + nums[index]!);
  };
  visit(0, false, 0);
  return best;
}

function verifyMicrosteps(trace: ReferenceTrace, nums: readonly number[]) {
  const prefix = Array.from({ length: nums.length + 1 }, (_, count) => exhaustiveBest(nums, count));
  const at = (count: number) => prefix[Math.max(0, count)]!;
  expect(arrayAt(trace.initialState).values).toEqual(nums);
  expect(arrayAt(trace.initialState).indices).toEqual([]);
  expect(dpAt(trace.initialState).values).toEqual(nums.map(() => null));
  expect(intAt(trace.initialState, 'D(0)（教学基例）')).toBe(0);
  expect(dpAt(trace.initialState).activeIndex).toBeNull();
  expect(intAt(trace.initialState, 'twoBack')).toBeUndefined();
  expect(intAt(trace.initialState, 'oneBack')).toBeUndefined();

  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(arrayAt(snapshot).values).toEqual(nums);
    const i = intAt(snapshot, 'i');
    const twoBack = intAt(snapshot, 'twoBack');
    const oneBack = intAt(snapshot, 'oneBack');
    const take = intAt(snapshot, 'take');
    const skip = intAt(snapshot, 'skip');
    const next = intAt(snapshot, 'next');
    const computed = ['compute-next', 'shift-two-back', 'shift-one-back'].includes(snapshot.stepId);
    const knownPrefix = snapshot.stepId.startsWith('init-') ? 0 : snapshot.stepId === 'return-best' ? nums.length : i! + (computed ? 1 : 0);
    expect(dpAt(snapshot).values).toEqual(prefix.slice(1).map((value, i) => i + 1 <= knownPrefix ? value : null));
    expect(dpAt(snapshot).activeIndex).toBe(knownPrefix === 0 ? null : knownPrefix - 1);
    expect(intAt(snapshot, 'D(0)（教学基例）')).toBe(0);
    expect(arrayAt(snapshot).indices).toEqual(i !== undefined && i < nums.length ? [{ name: 'i', index: i }] : []);

    if (snapshot.stepId === 'init-two-back') {
      expect(twoBack).toBe(0); expect(oneBack).toBeUndefined();
    } else if (snapshot.stepId === 'init-one-back') {
      expect(twoBack).toBe(0); expect(oneBack).toBe(0);
    } else if (snapshot.stepId === 'return-best') {
      expect(i).toBeUndefined();
      expect(twoBack).toBe(at(nums.length - 1)); expect(oneBack).toBe(at(nums.length));
      expect(boolAt(snapshot, 'i < nums.length')).toBeUndefined();
    } else {
      expect(i).toBeDefined();
      expect(boolAt(snapshot, 'i < nums.length')).toBe(i! < nums.length);
      if (snapshot.stepId === 'shift-two-back') {
        expect(twoBack).toBe(at(i!)); expect(oneBack).toBe(at(i!));
      } else if (snapshot.stepId === 'shift-one-back') {
        expect(twoBack).toBe(at(i!)); expect(oneBack).toBe(at(i! + 1));
      } else {
        expect(twoBack).toBe(at(i! - 1)); expect(oneBack).toBe(at(i!));
      }
    }

    if (snapshot.stepId === 'check-index' || snapshot.stepId.startsWith('init-') || snapshot.stepId === 'return-best') {
      expect(take).toBeUndefined(); expect(skip).toBeUndefined(); expect(next).toBeUndefined();
    } else {
      expect(take).toBe(at(i! - 1) + nums[i!]!);
      expect(skip).toBe(snapshot.stepId === 'compute-take' ? undefined : at(i!));
      expect(next).toBe(computed ? at(i! + 1) : undefined);
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: at(nums.length) });
  expect(trace.finalOutput).toEqual(expectedOutput('198', { nums: [...nums] }));
}

describe('198 immutable rolling-prefix reference model', () => {
  it('validates hashes, legal amounts and separate demo/runner limits', async () => {
    const input = { nums: [2, 1, 1, 2] };
    const trace = await buildReferenceTrace(input, 'mixed-parity');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [-1] }, 'negative')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [401] }, 'over-amount')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1.5] }, 'fraction')).rejects.toThrow();
    const thirty = await buildReferenceTrace({ nums: Array.from({ length: 30 }, () => 400) }, 'demo-upper');
    expect(thirty.finalOutput).toEqual({ kind: 'int', value: 6000 });
    expect(thirty.snapshots.length).toBeLessThan(2000);
    const maximum = { nums: Array.from({ length: 100 }, () => 400) };
    expect(HouseRobberInputSchema.parse(maximum)).toEqual(maximum);
    await expect(buildReferenceTrace(maximum, 'run-only')).rejects.toThrow(/30.*100/);
    expect(HouseRobberInputSchema.safeParse({ nums: [...maximum.nums, 0] }).success).toBe(false);
  });

  it('checks every microstep against exhaustive independent subsets, including update transients', async () => {
    const samples = [[0], [7], [9, 4], [2, 8], [2, 1, 1, 2], [2, 7, 9, 3, 1], [0, 0, 0], [6, 1, 1, 6, 1, 1, 6], [8, 0, 0, 8], [400, 1, 400]];
    for (const nums of samples) verifyMicrosteps(await buildReferenceTrace({ nums }, `fixed-${nums.join('_')}`), nums);
    let seed = 1982026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 64; sample++) {
      const nums = Array.from({ length: 1 + random() % 10 }, () => random() % 16);
      verifyMicrosteps(await buildReferenceTrace({ nums }, `seeded-${sample}`), nums);
    }
  });

  it('produces two input-specific predictions even for a single zero', async () => {
    const answers = async (nums: number[]) => {
      const trace = await buildReferenceTrace({ nums }, `pred-${nums.join('_')}`);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return predictions.map(prediction => prediction.answer);
    };
    expect(await answers([2, 1, 1, 2])).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 4 }]);
    expect(await answers([0])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
    expect(await answers([2, 7, 9, 3, 1])).toEqual([{ kind: 'int', value: 2 }, { kind: 'int', value: 12 }]);
  });

  it('restores before and after each assignment without mutating frozen snapshots', async () => {
    const input = { nums: [2, 7, 9] };
    const trace = await buildReferenceTrace(input, 'restore');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [2, 7, 9] }, 'restore'));
    const compute = trace.snapshots.find(s => s.stepId === 'compute-next' && intAt(s, 'i') === 1)!;
    const shiftTwo = trace.snapshots.find(s => s.stepId === 'shift-two-back' && intAt(s, 'i') === 1)!;
    const shiftOne = trace.snapshots.find(s => s.stepId === 'shift-one-back' && intAt(s, 'i') === 1)!;
    const values = (state: State) => ['twoBack', 'oneBack', 'next'].map(name => intAt(state, name));
    expect([values(compute), values(shiftTwo), values(shiftOne)]).toEqual([[0, 2, 7], [2, 2, 7], [2, 7, 7]]);
    const history = [compute, shiftTwo, shiftOne].map(state => JSON.stringify(state));
    for (const state of [shiftOne, shiftTwo, compute]) expect(history).toContain(JSON.stringify(state));
    expect(Reflect.set(dpAt(shiftOne).values, 2, 999)).toBe(false);
    expect(Reflect.set(shiftTwo.variables, 0, { name: 'changed', value: { kind: 'int', value: 9 } })).toBe(false);
    expect([compute, shiftTwo, shiftOne].map(state => JSON.stringify(state))).toEqual(history);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    input.nums[0] = 399;
    expect(arrayAt(trace.initialState).values).toEqual([2, 7, 9]);
    const other = await buildReferenceTrace({ nums: [2, 7, 8] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(s => s.checkpointId && trace.snapshots.some(old => old.checkpointId === s.checkpointId))).toBe(false);
  });
});
