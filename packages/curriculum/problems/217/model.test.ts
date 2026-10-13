import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ContainsDuplicateInputSchema,
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type ContainsDuplicateInput,
  type ReferenceTrace,
} from '@jab/contracts';
import { lesson217 } from './content.js';
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

function seenValues(state: State): number[] | null {
  const seen = state.structures.find(structure => structure.id === 'seen');
  if (!seen) return null;
  if (seen.kind !== 'map') throw new Error('seen must use the map structure for set membership');
  return seen.entries.map(entry => {
    if (entry.key.kind !== 'int' || entry.value.kind !== 'boolean' || entry.value.value !== true) {
      throw new Error('seen entries must be int -> true');
    }
    return entry.key.value;
  });
}

function unique(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function verifyInvariants(trace: ReferenceTrace, input: ContainsDuplicateInput) {
  const sourceLines = REFERENCE_SOURCE.split('\n');
  expect(trace.initialState.structures.find(structure => structure.id === 'seen')).toBeUndefined();
  expect(trace.initialState.structures.find(structure => structure.id === 'nums')).toMatchObject({
    kind: 'array', values: input.nums, indices: [],
  });

  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(mapped, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
    expect(sourceLines[mapped!.startLine - 1]!.trim()).not.toBe('');

    const nums = snapshot.structures.find(structure => structure.id === 'nums');
    expect(nums).toMatchObject({ kind: 'array', values: input.nums });
    const actualSeen = seenValues(snapshot);
    expect(actualSeen).not.toBeNull();
    expect(new Set(actualSeen!).size).toBe(actualSeen!.length);

    const i = intAt(snapshot, 'i');
    if (snapshot.stepId === 'init-set') expect(actualSeen).toEqual([]);
    if (i !== undefined && ['loop-index', 'check-seen', 'return-true'].includes(snapshot.stepId)) {
      expect(actualSeen).toEqual(unique(input.nums.slice(0, i)));
    }
    if (i !== undefined && snapshot.stepId === 'add-current') {
      expect(booleanAt(snapshot, '当前值已在 seen')).toBe(false);
      expect(actualSeen).toEqual(unique(input.nums.slice(0, i + 1)));
    }
    if (i !== undefined && snapshot.stepId === 'check-seen') {
      expect(booleanAt(snapshot, '当前值已在 seen')).toBe(new Set(input.nums.slice(0, i)).has(input.nums[i]!));
    }
    if (i !== undefined && snapshot.stepId === 'return-true') {
      expect(booleanAt(snapshot, '当前值已在 seen')).toBe(true);
      expect(booleanAt(snapshot, '返回值')).toBe(true);
      expect(actualSeen).toContain(input.nums[i]);
    }
    if (snapshot.stepId === 'return-false') {
      expect(booleanAt(snapshot, '返回值')).toBe(false);
      expect(actualSeen).toEqual(unique(input.nums));
      expect(intAt(snapshot, 'i')).toBeUndefined();
    }
  }
}

describe('217 immutable HashSet reference model', () => {
  it('matches expectedOutput for every course case and proves the intermediate seen invariant', async () => {
    for (const item of lesson217.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace), item.id).toEqual(trace);
      expect(trace.finalOutput, item.id).toEqual(expectedOutput('217', item.input));
      verifyInvariants(trace, item.input);
    }
  });

  it('represents the Set as int-to-true membership without changing nums', async () => {
    const raw = { nums: [4, 1, 4] };
    const trace = await buildReferenceTrace(raw, 'membership-view');
    const firstAdd = trace.snapshots.find(snapshot => snapshot.stepId === 'add-current')!;
    expect(seenValues(firstAdd)).toEqual([4]);
    const hit = trace.snapshots.find(snapshot => snapshot.stepId === 'return-true')!;
    expect(seenValues(hit)).toEqual([4, 1]);
    expect(hit.structures.find(structure => structure.id === 'nums')).toMatchObject({ kind: 'array', values: [4, 1, 4] });
    expect(raw.nums).toEqual([4, 1, 4]);
  });

  it('derives two input-specific predictions for duplicate and unique inputs', async () => {
    const answers = async (input: ContainsDuplicateInput, id: string) => {
      const trace = await buildReferenceTrace(input, id);
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ nums: [4, 1, 4] }, 'duplicate')).toEqual([
      { kind: 'choice', optionId: 'absent' },
      { kind: 'choice', optionId: 'duplicate' },
    ]);
    expect(await answers({ nums: [2, 7, 9] }, 'unique')).toEqual([
      { kind: 'choice', optionId: 'absent' },
      { kind: 'choice', optionId: 'all-unique' },
    ]);
    expect(await answers({ nums: [5, 5] }, 'adjacent')).toEqual([
      { kind: 'choice', optionId: 'absent' },
      { kind: 'choice', optionId: 'duplicate' },
    ]);
    const trace = await buildReferenceTrace({ nums: [1] }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('uses canonical hashes and returns deterministic, frozen, input-isolated snapshots', async () => {
    const raw = { nums: [-1, 0, 2, -1] };
    const trace = await buildReferenceTrace(raw, 'immutability');
    expect(trace).toEqual(await buildReferenceTrace(raw, 'immutability'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(raw)).digest('hex'));
    raw.nums[0] = 99;
    expect(trace.initialState.structures.find(structure => structure.id === 'nums')).toMatchObject({ values: [-1, 0, 2, -1] });

    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ nums: [1, 2, 3] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('rejects invalid input and enforces the separate 30-item visualization limit', async () => {
    expect(ContainsDuplicateInputSchema.safeParse({ nums: [] }).success).toBe(false);
    expect(ContainsDuplicateInputSchema.safeParse({ nums: Array(10_001).fill(1) }).success).toBe(false);
    expect(ContainsDuplicateInputSchema.safeParse({ nums: Array.from({ length: 31 }, (_, i) => i) }).success).toBe(true);
    await expect(buildReferenceTrace({ nums: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: Array.from({ length: 31 }, (_, i) => i) }, 'too-many')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums: [1] }, '')).rejects.toThrow(/标识/);
  });
});

