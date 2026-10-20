import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MinCostStairsInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(v => v.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(v => v.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}
function dpAt(state: State) {
  const structure = state.structures.find(s => s.kind === 'dp');
  if (structure?.kind !== 'dp') throw new Error('Missing arrival ledger');
  return structure;
}
function arrayAt(state: State) {
  const structure = state.structures.find(s => s.kind === 'array');
  if (structure?.kind !== 'array') throw new Error('Missing cost array');
  return structure;
}

// Enumerate all legal paths rather than using either forward rolling or backward DP.
function exhaustiveArrival(cost: readonly number[], destination: number): number {
  if (destination < 2) return 0;
  let best = Infinity;
  const visit = (position: number, paid: number) => {
    if (position === destination) { best = Math.min(best, paid); return; }
    if (position > destination) return;
    visit(position + 1, paid + cost[position]!);
    visit(position + 2, paid + cost[position]!);
  };
  visit(0, 0); visit(1, 0);
  return best;
}

function verifyMicrosteps(trace: ReferenceTrace, cost: number[]) {
  const arrival = Array.from({ length: cost.length + 1 }, (_, i) => exhaustiveArrival(cost, i));
  expect(arrayAt(trace.initialState).values).toEqual(cost);
  expect(arrayAt(trace.initialState).indices).toEqual([]);
  expect(dpAt(trace.initialState).values).toEqual(Array.from({ length: cost.length - 1 }, () => null));
  expect(dpAt(trace.initialState).activeIndex).toBeNull();
  expect(intAt(trace.initialState, 'twoBack')).toBeUndefined();
  expect(intAt(trace.initialState, 'oneBack')).toBeUndefined();
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(arrayAt(snapshot).values).toEqual(cost);
    expect(intAt(snapshot, 'D(0)（教学基例）')).toBe(0);
    expect(intAt(snapshot, 'D(1)（教学基例）')).toBe(0);
    expect(intAt(snapshot, '顶楼位置 n（教学标记）')).toBe(cost.length);
    const i = intAt(snapshot, 'i');
    const two = intAt(snapshot, 'twoBack');
    const one = intAt(snapshot, 'oneBack');
    const computed = ['compute-next', 'shift-two-back', 'shift-one-back'].includes(snapshot.stepId);
    const known = snapshot.stepId.startsWith('init-') ? 1 : snapshot.stepId === 'return-cost' ? cost.length : i! - (computed ? 0 : 1);
    expect(dpAt(snapshot).values).toEqual(arrival.slice(2).map((v, k) => k + 2 <= known ? v : null));
    expect(dpAt(snapshot).activeIndex).toBe(known < 2 ? null : known - 2);
    expect(arrayAt(snapshot).indices).toEqual(i !== undefined && i <= cost.length ? [{ name: 'i-2', index: i - 2 }, { name: 'i-1', index: i - 1 }] : []);
    if (snapshot.stepId === 'init-two-back') {
      expect(two).toBe(0); expect(one).toBeUndefined();
    } else if (snapshot.stepId === 'init-one-back') {
      expect(two).toBe(0); expect(one).toBe(0);
    } else if (snapshot.stepId === 'return-cost') {
      expect(i).toBeUndefined();
      expect(two).toBe(arrival[cost.length - 1]);
      expect(one).toBe(arrival[cost.length]);
      expect(boolAt(snapshot, 'i <= cost.length')).toBeUndefined();
    } else {
      expect(boolAt(snapshot, 'i <= cost.length')).toBe(i! <= cost.length);
      if (snapshot.stepId === 'shift-two-back') {
        expect(two).toBe(arrival[i! - 1]); expect(one).toBe(arrival[i! - 1]);
      } else if (snapshot.stepId === 'shift-one-back') {
        expect(two).toBe(arrival[i! - 1]); expect(one).toBe(arrival[i!]);
      } else {
        expect(two).toBe(arrival[i! - 2]); expect(one).toBe(arrival[i! - 1]);
      }
    }
    if (snapshot.stepId.startsWith('init-') || snapshot.stepId === 'check-destination' || snapshot.stepId === 'return-cost') {
      expect(intAt(snapshot, 'fromOne')).toBeUndefined();
      expect(intAt(snapshot, 'fromTwo')).toBeUndefined();
      expect(intAt(snapshot, 'next')).toBeUndefined();
    } else {
      expect(intAt(snapshot, 'fromOne')).toBe(arrival[i! - 1]! + cost[i! - 1]!);
      expect(intAt(snapshot, 'fromTwo')).toBe(snapshot.stepId === 'compute-from-one' ? undefined : arrival[i! - 2]! + cost[i! - 2]!);
      expect(intAt(snapshot, 'next')).toBe(computed ? arrival[i!] : undefined);
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: arrival[cost.length] });
  expect(trace.finalOutput).toEqual(expectedOutput('746', { cost }));
}

describe('746 immutable arrival-cost model', () => {
  it('validates contracts, hashes and separate display versus actual-run limits', async () => {
    const input = { cost: [10, 15, 20] };
    const trace = await buildReferenceTrace(input, 'default');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
    for (const cost of [[], [1], [-1, 0], [1000, 0], [1.5, 0]]) {
      await expect(buildReferenceTrace({ cost }, 'invalid')).rejects.toThrow();
    }
    const thirty = await buildReferenceTrace({ cost: Array.from({ length: 30 }, () => 9) }, 'thirty');
    expect(thirty.finalOutput).toEqual({ kind: 'int', value: 135 });
    for (const state of [thirty.initialState, ...thirty.snapshots]) {
      expect(arrayAt(state).values).toHaveLength(30);
      expect(dpAt(state).values).toHaveLength(29);
      expect(dpAt(state).activeIndex === null || dpAt(state).activeIndex! < 29).toBe(true);
    }
    expect(thirty.snapshots.length).toBeLessThan(2000);
    const maximum = { cost: Array.from({ length: 1000 }, () => 999) };
    expect(MinCostStairsInputSchema.parse(maximum)).toEqual(maximum);
    await expect(buildReferenceTrace(maximum, 'run-only')).rejects.toThrow(/30.*1000/);
    expect(MinCostStairsInputSchema.safeParse({ cost: [...maximum.cost, 0] }).success).toBe(false);
  });

  it('checks every intermediate snapshot against independently enumerated paths', async () => {
    for (const cost of [[10, 15, 20], [0, 0], [10, 1], [1, 10], [1, 100, 1, 1, 100, 1], [1, 2, 3, 4], [9, 1, 1, 9, 1], [999, 0, 999]]) {
      verifyMicrosteps(await buildReferenceTrace({ cost }, `case-${cost.join('_')}`), cost);
    }
    let seed = 7462026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 64; sample++) {
      const cost = Array.from({ length: 2 + random() % 9 }, () => random() % 12);
      verifyMicrosteps(await buildReferenceTrace({ cost }, `seed-${sample}`), cost);
    }
  });

  it('creates two distinct checkpoints with answers from the selected input', async () => {
    const answers = async (cost: number[]) => {
      const trace = await buildReferenceTrace({ cost }, `prediction-${cost.join('_')}`);
      const checks = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(new Set(checks.map(check => check.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return checks.map(check => check.answer);
    };
    expect(await answers([10, 15, 20])).toEqual([{ kind: 'int', value: 10 }, { kind: 'int', value: 15 }]);
    expect(await answers([1, 100, 1, 1, 100, 1])).toEqual([{ kind: 'int', value: 1 }, { kind: 'int', value: 4 }]);
    expect(await answers([0, 0])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
  });

  it('restores separate rolling assignments and deeply freezes all snapshots', async () => {
    const input = { cost: [10, 15, 20] };
    const trace = await buildReferenceTrace(input, 'restore');
    expect(await buildReferenceTrace(input, 'restore')).toEqual(trace);
    const steps = ['compute-next', 'shift-two-back', 'shift-one-back'].map(stepId =>
      trace.snapshots.find(s => s.stepId === stepId && intAt(s, 'i') === 3)!);
    const values = (state: State) => ['twoBack', 'oneBack', 'next'].map(name => intAt(state, name));
    expect(steps.map(values)).toEqual([[0, 10, 15], [10, 10, 15], [10, 15, 15]]);
    const before = steps.map(step => JSON.stringify(step));
    for (const step of [...steps].reverse()) expect(before).toContain(JSON.stringify(step));
    expect(Reflect.set(dpAt(steps[2]!).values, 1, 999)).toBe(false);
    expect(Reflect.set(steps[1]!.variables, 0, {})).toBe(false);
    expect(steps.map(step => JSON.stringify(step))).toEqual(before);
    const frozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(frozen);
      }
    };
    frozen(trace);
    input.cost[0] = 0;
    expect(arrayAt(trace.initialState).values).toEqual([10, 15, 20]);
    const other = await buildReferenceTrace(input, 'different');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(s => s.checkpointId && trace.snapshots.some(old => old.checkpointId === s.checkpointId))).toBe(false);
  });
});
