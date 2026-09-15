import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(snapshot: State, name: string): number | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function boolAt(snapshot: State, name: string): boolean | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function dpAt(snapshot: State) {
  const structure = snapshot.structures.find(item => item.kind === 'dp');
  if (structure?.kind !== 'dp') throw new Error('Missing recurrence teaching table');
  expect(structure.id).toBe('ways-definition');
  return structure;
}

function expectedWays(n: number): (number | null)[] {
  const values: (number | null)[] = Array(n + 1).fill(null) as null[];
  values[1] = 1;
  if (n >= 2) values[2] = 2;
  for (let step = 3; step <= n; step++) values[step] = values[step - 2]! + values[step - 1]!;
  return values;
}

function verifyInvariants(trace: ReferenceTrace, n: number) {
  const full = expectedWays(n);
  expect(dpAt(trace.initialState).values).toEqual(Array(n + 1).fill(null));
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    const dp = dpAt(snapshot);
    expect(dp.values).toHaveLength(n + 1);
    if (dp.activeIndex === null) expect(dp.values.every(value => value === null)).toBe(true);
    else {
      expect(dp.activeIndex).toBeGreaterThanOrEqual(1);
      expect(dp.activeIndex).toBeLessThanOrEqual(n);
      expect(dp.values.slice(1, dp.activeIndex + 1)).toEqual(full.slice(1, dp.activeIndex + 1));
      expect(dp.values.slice(dp.activeIndex + 1).every(value => value === null)).toBe(true);
    }

    const step = intAt(snapshot, 'step');
    if (snapshot.stepId === 'check-base') expect(boolAt(snapshot, 'n == 1')).toBe(n === 1);
    if (snapshot.stepId === 'check-loop' && step !== undefined) {
      expect(boolAt(snapshot, 'step <= n')).toBe(step <= n);
      expect(intAt(snapshot, 'previous')).toBe(full[step - 2]);
      expect(intAt(snapshot, 'current')).toBe(full[step - 1]);
    }
    if (snapshot.stepId === 'compute-next' && step !== undefined) {
      expect(intAt(snapshot, 'previous')).toBe(full[step - 2]);
      expect(intAt(snapshot, 'current')).toBe(full[step - 1]);
      expect(intAt(snapshot, 'next')).toBe(full[step]);
    }
    if (snapshot.stepId === 'move-previous' && step !== undefined) {
      expect(intAt(snapshot, 'previous')).toBe(full[step - 1]);
      expect(intAt(snapshot, 'current')).toBe(full[step - 1]);
      expect(intAt(snapshot, 'next')).toBe(full[step]);
    }
    if (snapshot.stepId === 'move-current' && step !== undefined) {
      expect(intAt(snapshot, 'previous')).toBe(full[step - 1]);
      expect(intAt(snapshot, 'current')).toBe(full[step]);
      expect(intAt(snapshot, 'next')).toBe(full[step]);
    }
    if (['return-base', 'return-current'].includes(snapshot.stepId)) {
      expect(intAt(snapshot, '返回值')).toBe(full[n]);
      expect(dp.activeIndex).toBe(n);
    }
  }
  expect(trace.finalOutput).toEqual(expectedOutput('70', { n }));
}

describe('70 immutable rolling-DP reference model', () => {
  it('validates hashes, the teaching table and the separate initial state', async () => {
    const input = { n: 5 };
    const trace = await buildReferenceTrace(input, 'five-steps');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.variables.map(variable => variable.name)).toEqual(['n', '阶段', 'ways（教学递推表）']);
    expect(dpAt(trace.initialState)).toEqual({ kind: 'dp', id: 'ways-definition', values: [null, null, null, null, null, null], activeIndex: null });
    await expect(buildReferenceTrace({ n: 0 }, 'bad-low')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 46 }, 'bad-high')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 31 }, 'demo-too-large')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('checks every old/new rolling-value transition and recurrence cell', async () => {
    for (const n of [1, 2, 3, 4, 5, 7, 10, 20, 30]) {
      verifyInvariants(await buildReferenceTrace({ n }, `invariant-${n}`), n);
    }
    const nThree = await buildReferenceTrace({ n: 3 }, 'inclusive-loop');
    expect(nThree.snapshots.filter(snapshot => snapshot.stepId === 'compute-next')).toHaveLength(1);
    expect(nThree.finalOutput).toEqual({ kind: 'int', value: 3 });
  });

  it('produces two input-specific Answer predictions and supplies options for choices', async () => {
    const predictions = async (n: number) => {
      const trace = await buildReferenceTrace({ n }, `prediction-${n}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
    };
    const five = await predictions(5);
    expect(five.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'continue' },
      { kind: 'int', value: 8 },
    ]);
    const one = await predictions(1);
    expect(one.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'return-base' },
      { kind: 'int', value: 1 },
    ]);
    const two = await predictions(2);
    expect(two.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'continue' },
      { kind: 'int', value: 2 },
    ]);
    for (const item of [...five, ...one, ...two]) {
      if (item.answer.kind === 'choice') {
        const optionId = item.answer.optionId;
        expect(item.options?.length).toBeGreaterThanOrEqual(2);
        expect(item.options?.some(option => option.id === optionId)).toBe(true);
      }
    }
  });

  it('is deterministic, deeply frozen, input-isolated and restores prior rolling states exactly', async () => {
    const trace = await buildReferenceTrace({ n: 5 }, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ n: 5 }, 'history'));
    const computed = trace.snapshots.find(snapshot => snapshot.stepId === 'compute-next' && intAt(snapshot, 'step') === 3)!;
    const movedPrevious = trace.snapshots.find(snapshot => snapshot.stepId === 'move-previous' && intAt(snapshot, 'step') === 3)!;
    const movedCurrent = trace.snapshots.find(snapshot => snapshot.stepId === 'move-current' && intAt(snapshot, 'step') === 3)!;
    expect([intAt(computed, 'previous'), intAt(computed, 'current'), intAt(computed, 'next')]).toEqual([1, 2, 3]);
    expect([intAt(movedPrevious, 'previous'), intAt(movedPrevious, 'current'), intAt(movedPrevious, 'next')]).toEqual([2, 2, 3]);
    expect([intAt(movedCurrent, 'previous'), intAt(movedCurrent, 'current'), intAt(movedCurrent, 'next')]).toEqual([2, 3, 3]);
    expect([intAt(computed, 'previous'), intAt(computed, 'current'), intAt(computed, 'next')]).toEqual([1, 2, 3]);

    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(movedCurrent, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ n: 6 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('returns null outside checkpoints and highlights only mapped Java statements', async () => {
    const trace = await buildReferenceTrace({ n: 5 }, 'mapping');
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
