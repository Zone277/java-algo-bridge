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
function unique(nums: readonly number[]) {
  return nums.filter((value, index) => index === 0 || nums[index - 1] !== value);
}

function verifyInvariants(trace: ReferenceTrace, original: readonly number[]) {
  expect(arrayAt(trace.initialState).values).toEqual(original);
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange, snapshot.stepId).toEqual({ startLine: mapped?.startLine, endLine: mapped?.endLine });
    const nums = arrayAt(snapshot);
    const read = intAt(snapshot, 'read');
    const write = intAt(snapshot, 'write');
    if (read !== undefined) {
      expect(read).toBeGreaterThanOrEqual(1);
      expect(read).toBeLessThanOrEqual(original.length);
    }
    if (write !== undefined) {
      expect(write).toBeGreaterThanOrEqual(1);
      expect(write).toBeLessThanOrEqual(original.length);
    }
    for (const pointer of nums.indices) expect(pointer.index).toBe(intAt(snapshot, pointer.name));

    if (read !== undefined && write !== undefined) {
      const includesCurrent = snapshot.stepId === 'copy-unique' || snapshot.stepId === 'advance-write';
      const expectedPrefix = unique(original.slice(0, read + (includesCurrent ? 1 : 0)));
      const storedLength = snapshot.stepId === 'copy-unique' ? write + 1 : write;
      expect(nums.values.slice(0, storedLength), snapshot.snapshotId).toEqual(expectedPrefix);
      if (snapshot.stepId === 'check-unique') expect(boolAt(snapshot, '是否为新值')).toBe(original[read] !== original[read - 1]);
      if (snapshot.stepId === 'copy-unique') expect(nums.values[write]).toBe(original[read]);
    }
    if (snapshot.stepId === 'return-length') {
      const k = intAt(snapshot, '返回 k')!;
      expect(k).toBe(unique(original).length);
      expect(arrayAt(snapshot, 'submitted-prefix').values).toEqual(unique(original));
    }
  }
  expect(trace.finalOutput).toEqual({ kind: 'int-array', values: unique(original) });
  expect(trace.finalOutput).toEqual(expectedOutput('26', { nums: [...original] }));
}

describe('26 immutable stable unique-prefix reference model', () => {
  it('validates hashes, sorted input, display limits and deep immutability', async () => {
    const input = { nums: [1, 1, 2, 2, 3] };
    const trace = await buildReferenceTrace(input, 'clusters');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [2, 1] }, 'unsorted')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array(31).fill(1) }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'check-unique' && intAt(snapshot, 'read') === 2)!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'copy-unique' && intAt(snapshot, 'read') === 2)!;
    expect(arrayAt(before).values).toEqual([1, 1, 2, 2, 3]);
    expect(arrayAt(after).values).toEqual([1, 2, 2, 2, 3]);
    expect(arrayAt(before).values).toEqual([1, 1, 2, 2, 3]);
    input.nums[0] = -9;
    expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [1, 2, 3] });
    expect(Reflect.set(after, 'explanation', 'changed')).toBe(false);
  });

  it('checks the prefix invariant for every nonempty sorted short input', async () => {
    const arrays: number[][] = [];
    const values = [-1, 0, 1];
    const append = (prefix: number[], firstAllowed: number): void => {
      if (prefix.length > 0) arrays.push(prefix);
      if (prefix.length === 6) return;
      for (let index = firstAllowed; index < values.length; index++) append([...prefix, values[index]!], index);
    };
    append([], 0);
    for (const nums of arrays) verifyInvariants(await buildReferenceTrace({ nums }, `enum-${nums.join('_')}`), nums);
  });

  it('derives input-specific decision and count predictions', async () => {
    const answers = async (nums: number[]) => {
      const trace = await buildReferenceTrace({ nums }, `prediction-${nums.join('_')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers([1, 1, 2, 2, 3])).toEqual([
      { kind: 'choice', optionId: 'skip' }, { kind: 'int', value: 3 },
    ]);
    expect(await answers([1, 2, 3])).toEqual([
      { kind: 'choice', optionId: 'copy' }, { kind: 'int', value: 3 },
    ]);
    expect(await answers([4, 4, 4])).toEqual([
      { kind: 'choice', optionId: 'skip' }, { kind: 'int', value: 1 },
    ]);
    expect(await answers([7])).toEqual([
      { kind: 'choice', optionId: 'stop' }, { kind: 'int', value: 1 },
    ]);
  });

  it('is deterministic, input-isolated and returns null outside checkpoints', async () => {
    const trace = await buildReferenceTrace({ nums: [-2, -2, 0, 1, 1] }, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [-2, -2, 0, 1, 1] }, 'history'));
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const other = await buildReferenceTrace({ nums: [-2, 0, 1] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? [])).not.toContain(
      trace.snapshots.find(snapshot => snapshot.checkpointId)?.checkpointId,
    );
  });
});
