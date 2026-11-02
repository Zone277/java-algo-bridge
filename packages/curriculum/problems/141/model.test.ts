import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  LessonSchema,
  expectedOutput,
  type LinkedListCycleInput,
  type ReferenceTrace,
  type Structure,
} from '@jab/contracts';
import { demoInputs, lesson141 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type ListState = Extract<Structure, { kind: 'list' }>;

const listOf = (state: State): ListState => state.structures.find((structure): structure is ListState => structure.kind === 'list')!;
const binding = (list: ListState, name: string): string | null => {
  const found = list.bindings.find(item => item.name === name);
  if (!found) throw new Error(`missing binding ${name}`);
  return found.objectId;
};
const nextOf = (list: ListState, id: string | null): string | null => id === null ? null : list.nodes.find(node => node.id === id)!.nextId;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

function expectedNodes(input: LinkedListCycleInput) {
  return input.head.map((value, index) => ({
    id: `h${index}`, value,
    nextId: index + 1 < input.head.length ? `h${index + 1}` : input.pos === -1 ? null : `h${input.pos}`,
  }));
}

function verifyTrace(trace: ReferenceTrace, input: LinkedListCycleInput) {
  const original = expectedNodes(input);
  expect(listOf(trace.initialState).nodes).toEqual(original);
  let previous = trace.initialState as State;
  for (const snapshot of trace.snapshots) {
    const list = listOf(snapshot);
    expect(list.nodes).toEqual(original);
    expect(new Set(list.nodes.map(node => node.id)).size).toBe(list.nodes.length);
    for (const node of list.nodes) if (node.nextId !== null) expect(list.nodes.some(candidate => candidate.id === node.nextId)).toBe(true);
    for (const item of list.bindings) if (item.objectId !== null) expect(list.nodes.some(node => node.id === item.objectId)).toBe(true);
    const references = snapshot.variables
      .filter(variable => variable.value.kind === 'reference')
      .map(variable => ({ name: variable.name, objectId: variable.value.kind === 'reference' ? variable.value.objectId : null }));
    expect(references).toEqual(list.bindings);
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);

    if (snapshot.stepId === 'move-slow') {
      const before = listOf(previous);
      expect(binding(list, 'slow')).toBe(nextOf(before, binding(before, 'slow')));
      expect(binding(list, 'fast')).toBe(binding(before, 'fast'));
    }
    if (snapshot.stepId === 'move-fast') {
      const before = listOf(previous);
      expect(binding(list, 'fast')).toBe(nextOf(before, nextOf(before, binding(before, 'fast'))));
      expect(binding(list, 'slow')).toBe(binding(before, 'slow'));
    }
    if (snapshot.stepId === 'compare-runners') {
      const comparison = snapshot.variables.find(variable => variable.name === 'slow == fast')?.value;
      expect(comparison).toEqual({ kind: 'boolean', value: binding(list, 'slow') === binding(list, 'fast') });
    }
    if (snapshot.stepId === 'check-fast-next') expect(binding(list, 'fast')).not.toBeNull();
    previous = snapshot;
  }
  expect(trace.finalOutput).toEqual(expectedOutput('141', input));
  expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
}

describe('141 Floyd cycle course and immutable identity graph', () => {
  it('validates the full lesson, cases, source hash, starter separation and real-submit boundary', () => {
    expect(LessonSchema.parse(lesson141)).toEqual(lesson141);
    expect(lesson141.testSuite.cases).toHaveLength(13);
    expect(lesson141.testSuite.wrongFixtures).toHaveLength(2);
    for (const testCase of lesson141.testSuite.cases) expect(testCase.expected).toEqual(expectedOutput('141', testCase.input));
    expect(lesson141.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(lesson141.independent.initialSource).toBe(lesson141.starter.source);
    expect(lesson141.independent.initialSource).not.toContain('fast.next.next');
    expect(lesson141.guided.finalCheck).toBe('real-java-submit');
  });

  it('matches the independent next-index oracle for empty, acyclic, self-cycle, middle-entry and repeated values', async () => {
    const inputs: LinkedListCycleInput[] = [
      { head: [], pos: -1 },
      { head: [7], pos: -1 },
      { head: [7], pos: 0 },
      { head: [1, 2], pos: -1 },
      { head: [1, 2], pos: 0 },
      { head: [3, 2, 0, -4], pos: 1 },
      { head: [5, 5, 5, 5], pos: -1 },
      { head: [5, 5, 5, 5], pos: 1 },
      { head: Array.from({ length: 30 }, (_, index) => index), pos: 17 },
    ];
    for (const input of inputs) verifyTrace(await buildReferenceTrace(input, 'oracle-check'), input);
  });

  it('shows fast and fast.next safety checks separately and never dereferences null in acyclic exits', async () => {
    const empty = await buildReferenceTrace({ head: [], pos: -1 }, 'empty');
    expect(empty.snapshots.map(snapshot => snapshot.stepId)).toEqual(['init-slow', 'init-fast', 'check-fast', 'return-false']);
    const singleton = await buildReferenceTrace({ head: [1], pos: -1 }, 'single');
    expect(singleton.snapshots.map(snapshot => snapshot.stepId)).toEqual(['init-slow', 'init-fast', 'check-fast', 'check-fast-next', 'return-false']);
    const two = await buildReferenceTrace({ head: [1, 2], pos: -1 }, 'two');
    expect(two.snapshots.filter(snapshot => snapshot.stepId === 'move-fast')).toHaveLength(1);
    expect(binding(listOf(two.snapshots.find(snapshot => snapshot.stepId === 'move-fast')!), 'fast')).toBeNull();
    expect(two.snapshots.at(-1)?.stepId).toBe('return-false');
  });

  it('keeps repeated-value objects distinct and compares stable identities after movement', async () => {
    const cyclic = await buildReferenceTrace({ head: [5, 5, 5, 5], pos: 1 }, 'repeated-cycle');
    const list = listOf(cyclic.initialState);
    expect(list.nodes.map(node => node.id)).toEqual(['h0', 'h1', 'h2', 'h3']);
    expect(list.nodes.map(node => node.value)).toEqual([5, 5, 5, 5]);
    expect(list.nodes[3]?.nextId).toBe('h1');
    expect(cyclic.snapshots.some(snapshot => snapshot.stepId === 'compare-runners' &&
      binding(listOf(snapshot), 'slow') !== binding(listOf(snapshot), 'fast'))).toBe(true);
    const meeting = cyclic.snapshots.find(snapshot => snapshot.stepId === 'compare-runners' &&
      binding(listOf(snapshot), 'slow') === binding(listOf(snapshot), 'fast'))!;
    expect(binding(listOf(meeting), 'slow')).not.toBeNull();

    const acyclic = await buildReferenceTrace({ head: [5, 5, 5, 5], pos: -1 }, 'repeated-no-cycle');
    expect(acyclic.finalOutput).toEqual({ kind: 'boolean', value: false });
  });

  it('derives two input-specific predictions for every demo and freezes snapshots for back/forward restore', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      expect(predictions(trace)).toHaveLength(2);
      const expected = expectedOutput('141', demo.input);
      if (expected.kind !== 'boolean') throw new Error('141 期望输出必须是 boolean');
      expect(predictions(trace).at(-1)?.answer).toEqual({
        kind: 'choice', optionId: expected.value ? 'cycle' : 'no-cycle',
      });
      const checkFrozen = (value: unknown): void => {
        if (value && typeof value === 'object') {
          expect(Object.isFrozen(value)).toBe(true);
          Object.values(value).forEach(checkFrozen);
        }
      };
      checkFrozen(trace);
      const first = listOf(trace.initialState);
      const last = listOf(trace.snapshots.at(-1)!);
      expect(last.nodes).toEqual(first.nodes);
      if (last.nodes[0]) expect(Reflect.set(last.nodes[0], 'nextId', null)).toBe(false);
      expect(listOf(trace.initialState).nodes).toEqual(expectedNodes(demo.input));
    }
  });

  it('is deterministic, input-isolated and rejects malformed or oversized demonstrations explicitly', async () => {
    const input = { head: [1, 2, 3, 4], pos: 1 };
    const a = await buildReferenceTrace(input, 'stable');
    expect(a).toEqual(await buildReferenceTrace({ head: [1, 2, 3, 4], pos: 1 }, 'stable'));
    const b = await buildReferenceTrace({ head: [1, 2, 3, 4], pos: -1 }, 'other');
    expect(b.inputHash).not.toBe(a.inputHash);
    input.head[0] = 99;
    expect(listOf(a.initialState).nodes[0]?.value).toBe(1);
    await expect(buildReferenceTrace({ head: Array(31).fill(1) as number[], pos: -1 }, 'wide')).rejects.toThrow('最多 30 个节点');
    await expect(buildReferenceTrace({ head: [1], pos: 1 }, 'invalid-pos')).rejects.toThrow();
    await expect(buildReferenceTrace({ head: [], pos: -1 }, '')).rejects.toThrow('不能为空');
  });
});
