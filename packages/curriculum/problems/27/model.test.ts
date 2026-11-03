import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
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
function arrayAt(state: State, id = 'nums') {
  const structure = state.structures.find(item => item.id === id);
  if (structure?.kind !== 'array') throw new Error(`Missing array ${id}`);
  return structure;
}
function stableFilter(nums: readonly number[], val: number) {
  return nums.filter(value => value !== val);
}

function verifyInvariants(trace: ReferenceTrace, original: readonly number[], val: number) {
  expect(arrayAt(trace.initialState).values).toEqual(original);
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange, snapshot.stepId).toEqual({ startLine: mapped?.startLine, endLine: mapped?.endLine });
    const nums = arrayAt(snapshot);
    const read = intAt(snapshot, 'read');
    const write = intAt(snapshot, 'write');
    expect(write).toBeGreaterThanOrEqual(0);
    expect(write).toBeLessThanOrEqual(original.length);
    if (read !== undefined) {
      expect(read).toBeGreaterThanOrEqual(0);
      expect(read).toBeLessThanOrEqual(original.length);
      expect(write).toBeLessThanOrEqual(read + (snapshot.stepId === 'advance-write' ? 1 : 0));
    }
    for (const pointer of nums.indices) expect(pointer.index).toBe(intAt(snapshot, pointer.name));

    if (read !== undefined && read < original.length) {
      const includesCurrent = snapshot.stepId === 'copy-keep' || snapshot.stepId === 'advance-write';
      const expectedPrefix = stableFilter(original.slice(0, read + (includesCurrent ? 1 : 0)), val);
      const storedLength = snapshot.stepId === 'copy-keep' ? write! + 1 : write!;
      expect(nums.values.slice(0, storedLength), snapshot.snapshotId).toEqual(expectedPrefix);
      if (snapshot.stepId === 'check-keep') expect(boolAt(snapshot, '是否保留')).toBe(original[read] !== val);
      if (snapshot.stepId === 'copy-keep') expect(nums.values[write!]).toBe(original[read]);
    }
    if (snapshot.stepId === 'return-length') {
      const k = intAt(snapshot, '返回 k')!;
      expect(k).toBe(stableFilter(original, val).length);
      expect(arrayAt(snapshot, 'submitted-prefix').values).toEqual(stableFilter(original, val));
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'int-array', values: stableFilter(original, val) });
  expect(trace.finalOutput).toEqual(expectedOutput('27', { nums: [...original], val }));
}

describe('27 immutable stable-filter reference model', () => {
  it('validates hashes, empty input, display limits and deep immutability', async () => {
    const input = { nums: [3, 2, 2, 3], val: 3 };
    const trace = await buildReferenceTrace(input, 'mixed');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    verifyInvariants(await buildReferenceTrace({ nums: [], val: 7 }, 'empty'), [], 7);
    await expect(buildReferenceTrace({ nums: Array(31).fill(1), val: 1 }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'check-keep' && intAt(snapshot, 'read') === 1)!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'copy-keep' && intAt(snapshot, 'read') === 1)!;
    expect(arrayAt(before).values).toEqual([3, 2, 2, 3]);
    expect(arrayAt(after).values).toEqual([2, 2, 2, 3]);
    expect(arrayAt(before).values).toEqual([3, 2, 2, 3]);
    input.nums[0] = -9;
    expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [2, 2] });
    expect(Reflect.set(after, 'explanation', 'changed')).toBe(false);
  });

  it('checks the stable-prefix invariant for every short input over a small alphabet', async () => {
    const values = [-1, 0, 1];
    const arrays: number[][] = [[]];
    for (let length = 1; length <= 5; length++) {
      const start = arrays.filter(item => item.length === length - 1);
      arrays.push(...start.flatMap(prefix => values.map(value => [...prefix, value])));
    }
    for (const nums of arrays) {
      for (const val of values) verifyInvariants(await buildReferenceTrace({ nums, val }, `enum-${val}-${nums.join('_')}`), nums, val);
    }
  });

  it('derives input-specific decision and count predictions', async () => {
    const answers = async (nums: number[], val: number) => {
      const trace = await buildReferenceTrace({ nums, val }, `prediction-${val}-${nums.join('_')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers([3, 2, 2, 3], 3)).toEqual([
      { kind: 'choice', optionId: 'remove' }, { kind: 'int', value: 2 },
    ]);
    expect(await answers([1, 2, 3], 9)).toEqual([
      { kind: 'choice', optionId: 'keep' }, { kind: 'int', value: 3 },
    ]);
    expect(await answers([5, 5], 5)).toEqual([
      { kind: 'choice', optionId: 'remove' }, { kind: 'int', value: 0 },
    ]);
    expect(await answers([], 0)).toEqual([{ kind: 'int', value: 0 }]);
  });

  it('is deterministic, input-isolated and returns null outside checkpoints', async () => {
    const trace = await buildReferenceTrace({ nums: [-3, 1, -3, 2], val: -3 }, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [-3, 1, -3, 2], val: -3 }, 'history'));
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const other = await buildReferenceTrace({ nums: [-3, 1, 2], val: 2 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? [])).not.toContain(
      trace.snapshots.find(snapshot => snapshot.checkpointId)?.checkpointId,
    );
  });
});
