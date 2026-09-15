import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OutputSchema, ReferenceTraceSchema, judgeProblemOutput, stableJson, type MergeListsInput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type ListState = Extract<Structure, { kind: 'list' }>;

function listOf(state: ReferenceTrace['initialState'] | Snapshot): ListState {
  const list = state.structures.find((structure): structure is ListState => structure.kind === 'list');
  if (!list) throw new Error(`Missing list in ${state.snapshotId}`);
  return list;
}

function binding(list: ListState, name: string): string | null {
  const result = list.bindings.find(item => item.name === name);
  if (!result) throw new Error(`Missing binding ${name}`);
  return result.objectId;
}

function walk(list: ListState, head: string | null, stopAfter?: string): string[] {
  const ids: string[] = [];
  while (head !== null) {
    if (ids.includes(head)) throw new Error('cycle');
    ids.push(head);
    if (head === stopAfter) break;
    const node = list.nodes.find(item => item.id === head);
    if (!node) throw new Error(`unknown ${head}`);
    head = node.nextId;
  }
  return ids;
}

function expectOnlyFieldChanged(before: ListState, after: ListState, ownerId: string) {
  for (const node of after.nodes) {
    const old = before.nodes.find(item => item.id === node.id)!;
    expect(node.value).toBe(old.value);
    if (node.id !== ownerId) expect(node.nextId).toBe(old.nextId);
  }
}

function verifyStablePartition(list: ListState, input: MergeListsInput) {
  const tail = binding(list, 'tail');
  const merged = tail === 'd0' ? [] : walk(list, list.nodes.find(node => node.id === 'd0')!.nextId, tail ?? undefined);
  if (tail !== 'd0') expect(merged.at(-1)).toBe(tail);
  const remainderA = walk(list, binding(list, 'list1'));
  const remainderB = walk(list, binding(list, 'list2'));
  const all = [...merged, ...remainderA, ...remainderB];
  const originals = [...input.list1.map((_, index) => `a${index}`), ...input.list2.map((_, index) => `b${index}`)];
  expect(new Set(all).size).toBe(all.length);
  expect(new Set(all)).toEqual(new Set(originals));
  const values = merged.map(id => list.nodes.find(node => node.id === id)!.value);
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(() => walk(list, 'd0')).not.toThrow();
}

function verifyTrace(trace: ReferenceTrace, input: MergeListsInput) {
  const originalValues = new Map<string, number>([
    ...input.list1.map((value, index) => [`a${index}`, value] as const),
    ...input.list2.map((value, index) => [`b${index}`, value] as const),
  ]);
  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const list = listOf(snapshot);
    const step = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: step.startLine, endLine: step.endLine });
    expect(list.nodes[0]).toMatchObject({ id: 'd0', value: 0 });
    expect(new Set(list.nodes.map(node => node.id)).size).toBe(list.nodes.length);
    for (const [id, value] of originalValues) expect(list.nodes.find(node => node.id === id)?.value).toBe(value);
    const referenceVariables = snapshot.variables.filter(variable => variable.value.kind === 'reference').map(variable => ({ name: variable.name, objectId: variable.value.kind === 'reference' ? variable.value.objectId : null }));
    expect(referenceVariables).toEqual(list.bindings);
    for (const node of list.nodes) if (node.nextId !== null) expect(list.nodes.some(candidate => candidate.id === node.nextId)).toBe(true);
    for (const node of list.nodes) expect(() => walk(list, node.id)).not.toThrow();

    if (['init-tail', 'check-loop', 'move-tail'].includes(snapshot.stepId)) verifyStablePartition(list, input);
    if (snapshot.stepId === 'attach-list1' || snapshot.stepId === 'attach-list2') {
      expect(previous?.stepId).toBe('choose-source');
      expect(list.bindings).toEqual(listOf(previous!).bindings);
      expectOnlyFieldChanged(listOf(previous!), list, binding(list, 'tail')!);
      const selected = snapshot.stepId === 'attach-list1' ? binding(list, 'list1') : binding(list, 'list2');
      expect(list.nodes.find(node => node.id === binding(list, 'tail'))!.nextId).toBe(selected);
    }
    if (snapshot.stepId === 'move-list1' || snapshot.stepId === 'move-list2') {
      const source = snapshot.stepId === 'move-list1' ? 'list1' : 'list2';
      const before = listOf(previous!);
      expect(list.nodes).toEqual(before.nodes);
      const selected = binding(before, source);
      expect(binding(list, source)).toBe(before.nodes.find(node => node.id === selected)!.nextId);
      const other = source === 'list1' ? 'list2' : 'list1';
      expect(binding(list, other)).toBe(binding(before, other));
      expect(binding(list, 'tail')).toBe(binding(before, 'tail'));
    }
    if (snapshot.stepId === 'move-tail') {
      const before = listOf(previous!);
      expect(list.nodes).toEqual(before.nodes);
      expect(binding(list, 'tail')).toBe(before.nodes.find(node => node.id === binding(before, 'tail'))!.nextId);
    }
    if (snapshot.stepId === 'attach-remainder') {
      const before = listOf(previous!);
      expectOnlyFieldChanged(before, list, binding(list, 'tail')!);
      const expectedRemainder = binding(list, 'list1') ?? binding(list, 'list2');
      expect(list.nodes.find(node => node.id === binding(list, 'tail'))!.nextId).toBe(expectedRemainder);
      const full = walk(list, list.nodes.find(node => node.id === 'd0')!.nextId);
      expect(new Set(full)).toEqual(new Set(originalValues.keys()));
      expect(full).toHaveLength(originalValues.size);
    }
    previous = snapshot;
  }
  expect(trace.finalOutput.kind).toBe('list-graph');
  if (trace.finalOutput.kind === 'list-graph') {
    expect(trace.finalOutput.nodes.some(node => node.id === 'd0')).toBe(false);
    expect(judgeProblemOutput('21', input, OutputSchema.parse(trace.finalOutput))).toMatchObject({ passed: true });
  }
}

describe('21 immutable identity-aware merge model', () => {
  it('validates metadata, stable IDs and the auxiliary d0 boundary', async () => {
    const input = { list1: [1, 4, 7], list2: [2, 3, 8] };
    const trace = await buildReferenceTrace(input, 'interleave');
    expect(ReferenceTraceSchema.safeParse(trace).success).toBe(true);
    expect(trace.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(listOf(trace.initialState).nodes.map(node => node.id)).toEqual(['a0', 'a1', 'a2', 'b0', 'b1', 'b2']);
    expect(trace.snapshots.every(snapshot => listOf(snapshot).nodes[0]?.id === 'd0')).toBe(true);
    verifyTrace(trace, input);
  });

  it('checks empty, one-sided, alternating, negative and repeated-value partitions', async () => {
    const inputs: MergeListsInput[] = [
      { list1: [], list2: [] }, { list1: [], list2: [1, 3] }, { list1: [-2, 4], list2: [] },
      { list1: [1], list2: [2] }, { list1: [1, 4, 7], list2: [2, 3, 8] },
      { list1: [1, 2, 2], list2: [1, 2, 3] }, { list1: [5, 5], list2: [5, 5, 5] },
      { list1: [-5, -1, 2], list2: [-4, 0, 3] },
    ];
    for (const input of inputs) verifyTrace(await buildReferenceTrace(input, 'invariants'), input);
  });

  it('derives two input-specific reference predictions including empty chains', async () => {
    const checks: Array<{ input: MergeListsInput; answers: string[] }> = [
      { input: { list1: [1], list2: [2] }, answers: ['a0', 'a0'] },
      { input: { list1: [4], list2: [1] }, answers: ['b0', 'b0'] },
      { input: { list1: [], list2: [3] }, answers: ['b0', 'b0'] },
      { input: { list1: [], list2: [] }, answers: ['null', 'null'] },
    ];
    for (const { input, answers } of checks) {
      const trace = await buildReferenceTrace(input, 'prediction');
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(predictions.map(prediction => prediction.answer)).toEqual(answers.map(value => ({ kind: 'text', value })));
    }
  });

  it('keeps repeated identities separate and restores old next fields without inverse mutation', async () => {
    const input = { list1: [5, 5], list2: [5, 5, 5] };
    const trace = await buildReferenceTrace(input, 'duplicates');
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'choose-source')!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'attach-list1')!;
    expect(listOf(before).nodes.find(node => node.id === 'd0')?.nextId).toBeNull();
    expect(listOf(after).nodes.find(node => node.id === 'd0')?.nextId).toBe('a0');
    expect(listOf(before).nodes.map(node => node.id)).toEqual(['d0', 'a0', 'a1', 'b0', 'b1', 'b2']);
    input.list1[0] = 9;
    expect(listOf(before).nodes.find(node => node.id === 'a0')?.value).toBe(5);
    const frozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    expect(Reflect.set(listOf(after).nodes[0]!, 'nextId', null)).toBe(false);
    expect(listOf(before).nodes.find(node => node.id === 'd0')?.nextId).toBeNull();
  });

  it('is deterministic, input-isolated and supports the full judge node bound within the snapshot cap', async () => {
    const input = { list1: [1, 3], list2: [2, 4] };
    const a = await buildReferenceTrace(input, 'stable');
    expect(a).toEqual(await buildReferenceTrace(input, 'stable'));
    const b = await buildReferenceTrace({ list1: [1, 3], list2: [2, 5] }, 'other');
    expect(b.inputHash).not.toBe(a.inputHash);
    const aCheckpoints = new Set(a.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []));
    expect(b.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []).some(id => aCheckpoints.has(id))).toBe(false);
    const large = { list1: Array.from({ length: 50 }, (_, index) => index * 2), list2: Array.from({ length: 50 }, (_, index) => index * 2 + 1) };
    const trace = await buildReferenceTrace(large, 'max-nodes');
    expect(trace.snapshots.length).toBeLessThan(2000);
    expect(trace.finalOutput.kind === 'list-graph' && trace.finalOutput.nodes).toHaveLength(100);
  });

  it('rejects malformed inputs and blank demonstration IDs', async () => {
    await expect(buildReferenceTrace({ list1: [2, 1], list2: [] }, 'unsorted')).rejects.toThrow();
    await expect(buildReferenceTrace({ list1: Array(51).fill(1) as number[], list2: [] }, 'too-long')).rejects.toThrow();
    await expect(buildReferenceTrace({ list1: [], list2: [] }, '')).rejects.toThrow();
  });
});
