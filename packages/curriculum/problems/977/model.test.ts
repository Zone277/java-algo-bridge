import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, SortedSquaresInputSchema, expectedOutput, stableJson, type ReferenceTrace, type Structure } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type ArrayState = Extract<Structure, { kind: 'array' }>;

function integer(snapshot: Snapshot, name: string): number {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`Missing integer ${name} in ${snapshot.snapshotId}`);
  return value.value;
}

function array(snapshot: ReferenceTrace['initialState'] | Snapshot, id: string): ArrayState | undefined {
  return snapshot.structures.find((structure): structure is ArrayState => structure.kind === 'array' && structure.id === id);
}

function verifyTrace(trace: ReferenceTrace, nums: number[]) {
  const expected = expectedOutput('977', { nums });
  if (expected.kind !== 'int-array') throw new Error('Expected int-array');
  expect(trace.finalOutput).toEqual(expected);
  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const sourceStep = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: sourceStep.startLine, endLine: sourceStep.endLine });
    expect(array(snapshot, 'nums')?.values).toEqual(nums);
    const output = array(snapshot, 'result');
    expect(output, `${snapshot.snapshotId} must show result`).toBeDefined();
    expect(snapshot.structures.map(structure => structure.id)).toEqual(['nums', 'result']);
    const left = snapshot.variables.find(variable => variable.name === 'left')?.value;
    const right = snapshot.variables.find(variable => variable.name === 'right')?.value;
    const write = snapshot.variables.find(variable => variable.name === 'write')?.value;
    if (left?.kind === 'int') expect(array(snapshot, 'nums')?.indices.find(pointer => pointer.name === 'left')?.index).toBe(left.value);
    if (right?.kind === 'int') expect(array(snapshot, 'nums')?.indices.find(pointer => pointer.name === 'right')?.index).toBe(right.value);
    if (write?.kind === 'int') expect(output?.indices.find(pointer => pointer.name === 'write')?.index).toBe(write.value);

    if (snapshot.stepId === 'square-left') expect(integer(snapshot, 'leftSquare')).toBe(nums[integer(snapshot, 'left')]! ** 2);
    if (snapshot.stepId === 'square-right') expect(integer(snapshot, 'rightSquare')).toBe(nums[integer(snapshot, 'right')]! ** 2);
    if (snapshot.stepId === 'choose-side') {
      expect(snapshot.variables.find(variable => variable.name === '左侧平方更大')?.value).toEqual({ kind: 'boolean', value: integer(snapshot, 'leftSquare') > integer(snapshot, 'rightSquare') });
    }
    if (snapshot.stepId === 'write-left' || snapshot.stepId === 'write-right') {
      const position = integer(snapshot, 'write');
      const largest = Math.max(nums[integer(snapshot, 'left')]! ** 2, nums[integer(snapshot, 'right')]! ** 2);
      expect(output!.values[position]).toBe(largest);
      expect(output!.values.slice(position)).toEqual(expected.values.slice(position));
      expect(position).toBe(integer(snapshot, 'right') - integer(snapshot, 'left'));
    }
    if (snapshot.stepId === 'move-left') {
      expect(previous?.stepId).toBe('write-left');
      expect(integer(snapshot, 'left')).toBe(integer(previous!, 'left') + 1);
      expect(integer(snapshot, 'right')).toBe(integer(previous!, 'right'));
      expect(output!.values).toEqual(array(previous!, 'result')!.values);
      expect(integer(snapshot, 'write')).toBe(integer(snapshot, 'right') - integer(snapshot, 'left') + 1);
    }
    if (snapshot.stepId === 'move-right') {
      expect(previous?.stepId).toBe('write-right');
      expect(integer(snapshot, 'right')).toBe(integer(previous!, 'right') - 1);
      expect(integer(snapshot, 'left')).toBe(integer(previous!, 'left'));
      expect(output!.values).toEqual(array(previous!, 'result')!.values);
      expect(integer(snapshot, 'write')).toBe(integer(snapshot, 'right') - integer(snapshot, 'left') + 1);
    }
    if (snapshot.stepId === 'move-write') {
      expect(integer(snapshot, 'write')).toBe(integer(previous!, 'write') - 1);
      expect(integer(snapshot, 'write')).toBe(integer(snapshot, 'right') - integer(snapshot, 'left'));
      expect(output!.values).toEqual(array(previous!, 'result')!.values);
    }
    if (write?.kind === 'int' && left?.kind === 'int' && right?.kind === 'int') {
      const startsAtWrite = ['write-left', 'write-right', 'move-left', 'move-right'].includes(snapshot.stepId);
      const filledStart = startsAtWrite ? write.value : write.value + 1;
      expect(output!.values.slice(filledStart)).toEqual(expected.values.slice(filledStart));
      const suffix = output!.values.slice(filledStart);
      expect(suffix).toEqual([...suffix].sort((a, b) => a - b));
    }
    previous = snapshot;
  }
}

describe('977 immutable two-pointer reference model', () => {
  it('validates metadata and distinguishes the input and result array objects', async () => {
    const input = { nums: [-7, -3, 2, 3, 11] };
    const trace = await buildReferenceTrace(input, 'mixed');
    expect(ReferenceTraceSchema.safeParse(trace).success).toBe(true);
    expect(trace.problemId).toBe('977');
    expect(trace.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.structures.map(structure => structure.id)).toEqual(['nums']);
    expect(trace.snapshots.every(snapshot => snapshot.structures.map(structure => structure.id).join(',') === 'nums,result')).toBe(true);
    expect(array(trace.snapshots[0]!, 'result')?.values).toEqual([0, 0, 0, 0, 0]);
    verifyTrace(trace, input.nums);
  });

  it('checks both endpoint branches, duplicates, zero, singleton and intermediate suffix invariants', async () => {
    let sawLeftBranch = false;
    let sawRightBranch = false;
    for (const nums of [[0], [-5], [-9, -4, -1], [1, 2, 5], [-2, -2, 0, 2, 2], [-7, -3, 2, 3, 11], [-5, -3, -2, 4, 8]]) {
      const input = SortedSquaresInputSchema.parse({ nums });
      const trace = await buildReferenceTrace(input, 'invariants');
      verifyTrace(trace, input.nums);
      sawLeftBranch ||= trace.snapshots.some(snapshot => snapshot.stepId === 'write-left');
      sawRightBranch ||= trace.snapshots.some(snapshot => snapshot.stepId === 'write-right');
      expect(trace.snapshots.at(-1)?.stepId).toBe('return-result');
    }
    expect(sawLeftBranch).toBe(true);
    expect(sawRightBranch).toBe(true);
  });

  it('derives exactly two predictions from each selected input', async () => {
    for (const nums of [[-7, -3, 2, 3, 11], [-9, -4, -1], [0], [-2, -2, 0, 2, 2]]) {
      const trace = await buildReferenceTrace({ nums }, 'predictions');
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      const expected = expectedOutput('977', { nums });
      if (expected.kind !== 'int-array') throw new Error('Expected int-array');
      expect(predictions[0]?.answer).toEqual({ kind: 'int', value: expected.values.at(-1) });
      expect(predictions[1]?.answer).toEqual({ kind: 'int', value: nums.length - 2 });
    }
  });

  it('is deterministic, deeply frozen and isolated from later input mutation', async () => {
    const input = { nums: [-3, 0, 4] };
    const trace = await buildReferenceTrace(input, 'stable');
    expect(trace).toEqual(await buildReferenceTrace({ nums: [-3, 0, 4] }, 'stable'));
    input.nums[0] = -2;
    expect(array(trace.initialState, 'nums')?.values).toEqual([-3, 0, 4]);
    const frozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    const firstResult = array(trace.snapshots[0]!, 'result')!;
    expect(Reflect.set(firstResult.values, '0', 99)).toBe(false);
    expect(array(trace.snapshots[0]!, 'result')?.values[0]).toBe(0);
    const other = await buildReferenceTrace({ nums: [-3, 0, 5] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []).some(id => trace.snapshots.some(snapshot => snapshot.checkpointId === id))).toBe(false);
  });

  it('rejects invalid inputs and refuses rather than truncating over the snapshot budget', async () => {
    await expect(buildReferenceTrace({ nums: [2, 1] }, 'bad-sort')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [1] }, '')).rejects.toThrow();
    const supported = await buildReferenceTrace({ nums: Array(284).fill(0) as number[] }, 'supported');
    expect(supported.snapshots).toHaveLength(1994);
    await expect(buildReferenceTrace({ nums: Array(285).fill(0) as number[] }, 'too-many')).rejects.toThrow('2000');
  });
});
