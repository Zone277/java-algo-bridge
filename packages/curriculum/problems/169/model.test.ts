import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MajorityElementInputSchema,
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type MajorityElementInput,
  type ReferenceTrace,
} from '@jab/contracts';
import { lesson169 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function booleanAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

/** Independently pair opposite values by original index; every input index is accounted for. */
function cancelPrefix(nums: readonly number[], length: number) {
  const unpaired: number[] = [];
  const pairs: [number, number][] = [];
  for (let index = 0; index < length; index++) {
    const last = unpaired.at(-1);
    if (last !== undefined && nums[last] !== nums[index]) {
      pairs.push([unpaired.pop()!, index]);
    } else {
      unpaired.push(index);
    }
  }
  return { unpaired, pairs };
}

function verifyIntermediateStates(trace: ReferenceTrace, input: MajorityElementInput) {
  expect(trace.initialState.structures).toEqual([{ kind: 'array', id: 'nums', values: input.nums, indices: [] }]);
  expect(intAt(trace.initialState, 'candidate')).toBeUndefined();
  const sourceLines = REFERENCE_SOURCE.split('\n');
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(mapping, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapping!.startLine, endLine: mapping!.endLine });
    expect(sourceLines[mapping!.startLine - 1]!.trim()).not.toBe('');
    const nums = snapshot.structures.find(structure => structure.id === 'nums');
    expect(nums).toMatchObject({ kind: 'array', values: input.nums });

    const i = intAt(snapshot, 'i');
    if (snapshot.stepId === 'init-candidate') {
      expect(intAt(snapshot, 'candidate')).toBe(input.nums[0]);
      expect(intAt(snapshot, 'votes')).toBeUndefined();
      continue;
    }
    if (snapshot.stepId === 'init-votes') {
      expect(intAt(snapshot, 'votes')).toBe(0);
      continue;
    }
    if (snapshot.stepId === 'return-candidate') {
      expect(i).toBeUndefined();
      expect(intAt(snapshot, 'candidate')).toBe((expectedOutput('169', input) as { kind: 'int'; value: number }).value);
      expect(intAt(snapshot, 'votes')).toBeGreaterThan(0);
      continue;
    }
    expect(i).toBeDefined();
    const processed = ['add-vote', 'remove-vote'].includes(snapshot.stepId) ? i! + 1 : i!;
    const { unpaired, pairs } = cancelPrefix(input.nums, processed);
    expect(pairs.every(([a, b]) => input.nums[a] !== input.nums[b]), snapshot.snapshotId).toBe(true);
    expect(pairs.flat().concat(unpaired).sort((a, b) => a - b), snapshot.snapshotId)
      .toEqual(Array.from({ length: processed }, (_, index) => index));
    expect(intAt(snapshot, 'votes'), snapshot.snapshotId).toBe(unpaired.length);
    if (unpaired.length > 0) {
      expect(unpaired.every(index => input.nums[index] === intAt(snapshot, 'candidate')), snapshot.snapshotId).toBe(true);
    }
    if (i === input.nums.length) {
      expect(snapshot.stepId).toBe('loop-index');
      expect(nums).toMatchObject({ indices: [] });
    } else {
      expect(nums).toMatchObject({ indices: [{ name: 'i', index: i }] });
      expect(intAt(snapshot, 'nums[i]（表达式）')).toBe(input.nums[i!]);
    }
    if (snapshot.stepId === 'check-empty') expect(booleanAt(snapshot, 'votes == 0')).toBe(unpaired.length === 0);
    if (snapshot.stepId === 'choose-candidate') {
      expect(intAt(snapshot, 'votes')).toBe(0);
      expect(intAt(snapshot, 'candidate')).toBe(input.nums[i!]);
    }
    if (snapshot.stepId === 'compare-value') expect(booleanAt(snapshot, 'nums[i] == candidate')).toBe(input.nums[i!] === intAt(snapshot, 'candidate'));
    if (snapshot.stepId === 'add-vote') expect(booleanAt(snapshot, 'nums[i] == candidate')).toBe(true);
    if (snapshot.stepId === 'remove-vote') expect(booleanAt(snapshot, 'nums[i] == candidate')).toBe(false);
  }
}

describe('169 immutable vote-cancellation reference model', () => {
  it('matches the independent frequency oracle and intermediate pairing invariant for every case', async () => {
    for (const item of lesson169.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace), item.id).toEqual(trace);
      expect(trace.finalOutput, item.id).toEqual(expectedOutput('169', item.input));
      verifyIntermediateStates(trace, item.input);
    }
  });

  it('derives two input-specific predictions and never rewrites nums', async () => {
    const answers = async (input: MajorityElementInput, id: string) => {
      const trace = await buildReferenceTrace(input, id);
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      verifyIntermediateStates(trace, input);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer);
    };
    expect(await answers({ nums: [1, 2, 2] }, 'change')).toEqual([
      { kind: 'int', value: 1 }, { kind: 'int', value: 2 },
    ]);
    expect(await answers({ nums: [-2, -1, -2, -2] }, 'negative')).toEqual([
      { kind: 'int', value: -2 }, { kind: 'int', value: -2 },
    ]);
    const trace = await buildReferenceTrace({ nums: [7] }, 'single');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('uses canonical hashes and frozen snapshots isolated from later input edits', async () => {
    const raw = { nums: [2, 1, 2] };
    const trace = await buildReferenceTrace(raw, 'freeze');
    expect(trace).toEqual(await buildReferenceTrace(raw, 'freeze'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(raw)).digest('hex'));
    raw.nums[0] = 77;
    expect(trace.initialState.structures[0]).toMatchObject({ values: [2, 1, 2] });
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'changed')).toBe(false);
  });

  it('checks seeded majority inputs and rejects invalid or overlong demonstrations', async () => {
    let seed = 1692026;
    const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
    for (let length = 1; length <= 30; length++) {
      const winner = length % 2 === 0 ? -length : length;
      const count = Math.floor(length / 2) + 1;
      const nums = Array.from({ length }, (_, index) => index < count ? winner : winner + index + 1);
      for (let index = nums.length - 1; index > 0; index--) {
        const target = Math.floor(next() * (index + 1));
        [nums[index], nums[target]] = [nums[target]!, nums[index]!];
      }
      const input = { nums };
      const trace = await buildReferenceTrace(input, `seeded-${length}`);
      expect(trace.finalOutput).toEqual({ kind: 'int', value: winner });
      verifyIntermediateStates(trace, input);
    }
    expect(MajorityElementInputSchema.safeParse({ nums: [1, 2] }).success).toBe(false);
    expect(MajorityElementInputSchema.safeParse({ nums: [] }).success).toBe(false);
    expect(MajorityElementInputSchema.safeParse({ nums: Array(10_001).fill(3) }).success).toBe(false);
    await expect(buildReferenceTrace({ nums: [1, 2] }, 'none')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array(31).fill(3) }, 'long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums: [1] }, '')).rejects.toThrow(/标识/);
  });
});
