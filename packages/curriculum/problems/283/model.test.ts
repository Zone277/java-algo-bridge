import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];

function numberAt(snapshot: Snapshot, name: string): number | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function booleanAt(snapshot: Snapshot, name: string): boolean | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function arrayAt(snapshot: Snapshot | ReferenceTrace['initialState']) {
  const structure = snapshot.structures.find(item => item.kind === 'array');
  if (structure?.kind !== 'array') throw new Error('Missing nums array');
  return structure;
}

function verifyInvariants(trace: ReferenceTrace, original: readonly number[]) {
  const stable = original.filter(value => value !== 0);
  for (const snapshot of trace.snapshots) {
    const structure = arrayAt(snapshot);
    expect(structure.id).toBe('nums');
    expect(structure.values).toHaveLength(original.length);
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    for (const pointer of structure.indices) {
      const variableName = pointer.name === '最近写入' ? '最近写入下标' : pointer.name;
      expect(pointer.index).toBe(numberAt(snapshot, variableName));
    }

    const read = numberAt(snapshot, 'read');
    const write = numberAt(snapshot, 'write');
    if (read !== undefined) { expect(read).toBeGreaterThanOrEqual(0); expect(read).toBeLessThanOrEqual(original.length); }
    if (write !== undefined) { expect(write).toBeGreaterThanOrEqual(0); expect(write).toBeLessThanOrEqual(original.length); }

    const phase = snapshot.variables.find(variable => variable.name === '阶段')?.value;
    if (phase?.kind === 'string' && phase.value === '扫描非零元素' && read !== undefined && write !== undefined) {
      const throughCurrent = snapshot.stepId === 'copy-nonzero' || snapshot.stepId === 'advance-write';
      const expectedPrefix = original.slice(0, read + (throughCurrent ? 1 : 0)).filter(value => value !== 0);
      const writtenLength = snapshot.stepId === 'copy-nonzero' ? write + 1 : write;
      expect(structure.values.slice(0, writtenLength)).toEqual(expectedPrefix);
      if (snapshot.stepId !== 'copy-nonzero') expect(write).toBeLessThanOrEqual(read + (snapshot.stepId === 'advance-write' ? 1 : 0));
      if (snapshot.stepId === 'check-read') expect(booleanAt(snapshot, '条件结果')).toBe(read < original.length);
      if (snapshot.stepId === 'check-nonzero') expect(booleanAt(snapshot, '条件结果')).toBe(original[read] !== 0);
      if (snapshot.stepId === 'copy-nonzero') {
        expect(numberAt(snapshot, '最近写入下标')).toBe(write);
        expect(numberAt(snapshot, '最近写入值')).toBe(original[read]);
      }
    }

    if (phase?.kind === 'string' && phase.value === '补齐尾部零' && write !== undefined) {
      expect(structure.values.slice(0, stable.length)).toEqual(stable);
      const filledEnd = snapshot.stepId === 'fill-zero' ? write + 1 : write;
      expect(structure.values.slice(stable.length, filledEnd)).toEqual(Array(filledEnd - stable.length).fill(0));
      if (snapshot.stepId === 'check-fill') expect(booleanAt(snapshot, '条件结果')).toBe(write < original.length);
      if (snapshot.stepId === 'fill-zero') {
        expect(numberAt(snapshot, '最近写入下标')).toBe(write);
        expect(numberAt(snapshot, '最近写入值')).toBe(0);
      }
    }
  }
  expect(trace.finalOutput).toEqual(expectedOutput('283', { nums: [...original] }));
  expect(arrayAt(trace.snapshots.at(-1)!).values).toEqual(trace.finalOutput.kind === 'int-array' ? trace.finalOutput.values : []);
}

describe('283 immutable stable-compaction reference model', () => {
  it('validates input, metadata hashes and initial state separately from statements', async () => {
    const input = { nums: [0, 1, 0, 3, 12] };
    const trace = await buildReferenceTrace(input, 'mixed');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.variables.map(variable => variable.name)).toEqual(['nums', 'length', '阶段']);
    expect(arrayAt(trace.initialState)).toEqual({ kind: 'array', id: 'nums', values: input.nums, indices: [] });
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array(31).fill(0) }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('checks stable prefixes and fill ranges across zeros, duplicates and every pointer relation', async () => {
    const samples = [
      [0], [9], [0, 1, 0, 3, 12], [1, 2, 3], [0, 0, 0], [0, 4, 5],
      [1, 0, 2, 0, 3], [0, -1, 0, -1, 2, 0], [-2147483648, 0, 2147483647],
      Array.from({ length: 30 }, (_, index) => index % 4 === 0 ? 0 : index - 15),
    ];
    for (const nums of samples) verifyInvariants(await buildReferenceTrace({ nums }, `case-${nums.length}-${nums.join('_')}`), nums);
  });

  it('derives two input-specific Answer predictions even for all-zero and no-zero arrays', async () => {
    const answers = async (nums: number[]) => {
      const trace = await buildReferenceTrace({ nums }, `prediction-${nums.join('_')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer);
    };
    expect(await answers([0, 1, 0, 3, 12])).toEqual([{ kind: 'choice', optionId: 'skip' }, { kind: 'int', value: 1 }]);
    expect(await answers([2, 3])).toEqual([{ kind: 'choice', optionId: 'copy' }, { kind: 'int', value: 2 }]);
    expect(await answers([0, 0])).toEqual([{ kind: 'choice', optionId: 'skip' }, { kind: 'int', value: 0 }]);
  });

  it('is deterministic, deeply frozen, input-isolated and restores earlier array states exactly', async () => {
    const input = { nums: [0, 5, 0, 7] };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [0, 5, 0, 7] }, 'history'));
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'check-nonzero' && numberAt(snapshot, 'read') === 1)!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'copy-nonzero' && numberAt(snapshot, 'read') === 1)!;
    expect(arrayAt(before).values).toEqual([0, 5, 0, 7]);
    expect(arrayAt(after).values).toEqual([5, 5, 0, 7]);
    expect(arrayAt(before).values).toEqual([0, 5, 0, 7]);
    input.nums[1] = 99;
    expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [5, 7, 0, 0] });
    const frozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    expect(Reflect.set(after, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ nums: [0, 6] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('returns null outside checkpoints and maps highlighted lines to the actual source', async () => {
    const trace = await buildReferenceTrace({ nums: [0, 1] }, 'mapping');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const lines = REFERENCE_SOURCE.split('\n');
    for (const snapshot of trace.snapshots) {
      const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
      expect(lines[mapped.startLine - 1]!.trim()).not.toBe('');
    }
  });
});
