import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ArrayIntersectionInputSchema,
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type ArrayIntersectionInput,
  type ReferenceTrace,
} from '@jab/contracts';
import { lesson349 } from './content.js';
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

function setAt(state: State, id: string): number[] | undefined {
  const structure = state.structures.find(item => item.id === id);
  if (structure === undefined) return undefined;
  if (structure.kind !== 'map') throw new Error(`${id} must use a membership map`);
  return structure.entries.map(entry => {
    if (entry.key.kind !== 'int' || entry.value.kind !== 'boolean' || entry.value.value !== true) {
      throw new Error(`${id} must contain int -> true entries`);
    }
    return entry.key.value;
  });
}

function arrayAt(state: State, id: string): readonly number[] | undefined {
  const structure = state.structures.find(item => item.id === id);
  if (structure === undefined) return undefined;
  if (structure.kind !== 'array') throw new Error(`${id} must be an array`);
  return structure.values;
}

const uniqueSorted = (values: readonly number[]) => [...new Set(values)].sort((a, b) => a - b);
const commonPrefix = (input: ArrayIntersectionInput, length: number) => {
  const second = new Set(input.nums2);
  return uniqueSorted(input.nums1.slice(0, length).filter(value => second.has(value)));
};

function verifyIntermediate(trace: ReferenceTrace, input: ArrayIntersectionInput): void {
  expect(setAt(trace.initialState, 'members')).toBeUndefined();
  expect(setAt(trace.initialState, 'common')).toBeUndefined();
  expect(arrayAt(trace.initialState, 'nums1')).toEqual(input.nums1);
  expect(arrayAt(trace.initialState, 'nums2')).toEqual(input.nums2);
  const allMembers = uniqueSorted(input.nums2);
  const allCommon = commonPrefix(input, input.nums1.length);
  let secondItems = 0;
  let firstItems = 0;
  let writtenItems = 0;

  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapped, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
    expect(arrayAt(snapshot, 'nums1')).toEqual(input.nums1);
    expect(arrayAt(snapshot, 'nums2')).toEqual(input.nums2);
    const members = setAt(snapshot, 'members');
    const common = setAt(snapshot, 'common');
    if (snapshot.stepId === 'init-members') expect(members).toEqual([]);
    if (snapshot.stepId === 'scan-second') {
      expect(members).toEqual(uniqueSorted(input.nums2.slice(0, secondItems)));
    }
    if (snapshot.stepId === 'add-second') {
      secondItems++;
      expect(members).toEqual(uniqueSorted(input.nums2.slice(0, secondItems)));
    }
    if (['init-common', 'scan-first', 'check-member', 'add-common', 'allocate-result', 'init-index', 'write-result', 'advance-index', 'return-result'].includes(snapshot.stepId)) {
      expect(members).toEqual(allMembers);
    }
    if (snapshot.stepId === 'init-common') expect(common).toEqual([]);
    if (snapshot.stepId === 'scan-first' || snapshot.stepId === 'check-member') {
      expect(common).toEqual(commonPrefix(input, firstItems));
      if (snapshot.stepId === 'check-member') {
        const current = intAt(snapshot, 'value')!;
        expect(boolAt(snapshot, 'members 包含 value')).toBe(new Set(input.nums2).has(current));
        firstItems++;
      }
    }
    if (snapshot.stepId === 'add-common') expect(common).toEqual(commonPrefix(input, firstItems));
    if (['allocate-result', 'init-index', 'write-result', 'advance-index', 'return-result'].includes(snapshot.stepId)) {
      expect(common).toEqual(allCommon);
    }
    if (snapshot.stepId === 'allocate-result' || snapshot.stepId === 'init-index') {
      expect(arrayAt(snapshot, 'result')).toEqual(Array(allCommon.length).fill(0));
    }
    if (snapshot.stepId === 'write-result') {
      expect(intAt(snapshot, 'index')).toBe(writtenItems);
      expect(arrayAt(snapshot, 'result')).toEqual([...allCommon.slice(0, writtenItems + 1), ...Array(allCommon.length - writtenItems - 1).fill(0)]);
    }
    if (snapshot.stepId === 'advance-index') {
      writtenItems++;
      expect(intAt(snapshot, 'index')).toBe(writtenItems);
      expect(arrayAt(snapshot, 'result')).toEqual([...allCommon.slice(0, writtenItems), ...Array(allCommon.length - writtenItems).fill(0)]);
    }
    if (snapshot.stepId === 'return-result') {
      expect(writtenItems).toBe(allCommon.length);
      expect(arrayAt(snapshot, 'result')).toEqual(allCommon);
      expect(intAt(snapshot, '返回数组长度')).toBe(allCommon.length);
    }
    expect(Object.isFrozen(snapshot)).toBe(true);
  }
  expect(secondItems).toBe(input.nums2.length);
  expect(firstItems).toBe(input.nums1.length);
}

describe('349 immutable two-set reference model', () => {
  it('matches every published expected output and proves both prefix-set invariants', async () => {
    for (const item of lesson349.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace), item.id).toEqual(trace);
      expect(trace.finalOutput, item.id).toEqual(expectedOutput('349', item.input));
      verifyIntermediate(trace, item.input);
    }
  });

  it('derives two input-specific predictions for overlap and disjoint inputs', async () => {
    const answers = async (input: ArrayIntersectionInput) => {
      const trace = await buildReferenceTrace(input, 'prediction');
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ nums1: [4, 9, 5, 4], nums2: [9, 4, 9, 8, 4] })).toEqual([
      { kind: 'choice', optionId: 'present' }, { kind: 'int', value: 2 },
    ]);
    expect(await answers({ nums1: [1, 3, 5], nums2: [2, 4, 6] })).toEqual([
      { kind: 'choice', optionId: 'absent' }, { kind: 'int', value: 0 },
    ]);
    expect(await answers({ nums1: [0, 0], nums2: [0] })).toEqual([
      { kind: 'choice', optionId: 'present' }, { kind: 'int', value: 1 },
    ]);
    const trace = await buildReferenceTrace({ nums1: [1], nums2: [1] }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('keeps duplicate values as one set member while leaving both inputs unchanged', async () => {
    const input = { nums1: [1, 2, 2, 1], nums2: [2, 2] };
    const trace = await buildReferenceTrace(input, 'duplicates');
    const final = trace.snapshots.at(-1)!;
    expect(setAt(final, 'members')).toEqual([2]);
    expect(setAt(final, 'common')).toEqual([2]);
    expect(arrayAt(final, 'result')).toEqual([2]);
    expect(arrayAt(final, 'nums1')).toEqual([1, 2, 2, 1]);
    expect(arrayAt(final, 'nums2')).toEqual([2, 2]);
  });

  it('uses canonical hashes and deeply freezes caller-isolated snapshots', async () => {
    const input = { nums1: [0, 500, 1000], nums2: [1000, 7, 0] };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.nums1[0] = 99;
    input.nums2[0] = 98;
    expect(arrayAt(trace.initialState, 'nums1')).toEqual([0, 500, 1000]);
    expect(arrayAt(trace.initialState, 'nums2')).toEqual([1000, 7, 0]);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'rewritten')).toBe(false);
  });

  it('rejects invalid inputs and keeps the 30-item display limit separate from the runner limit', async () => {
    expect(ArrayIntersectionInputSchema.safeParse({ nums1: Array(31).fill(1), nums2: [1] }).success).toBe(true);
    await expect(buildReferenceTrace({ nums1: Array(31).fill(1), nums2: [1] }, 'too-long-first')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums1: [1], nums2: Array(31).fill(1) }, 'too-long-second')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums1: [], nums2: [1] }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums1: [1], nums2: [1] }, '')).rejects.toThrow(/标识/);
  });
});
