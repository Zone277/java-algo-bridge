import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedReversedList, LessonSchema, type ReferenceTrace, type Structure } from '@jab/contracts';
import { lesson206, demoInputs } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type List = Extract<Structure, { kind: 'list' }>;
const listOf = (s: ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number]) => s.structures.find((s): s is List => s.kind === 'list')!;
function reachable(list: List, root: string | null): string[] {
  const ids: string[] = [];
  while (root !== null) {
    if (ids.includes(root)) throw new Error('cycle');
    ids.push(root);
    const node = list.nodes.find(n => n.id === root);
    if (!node) throw new Error('unknown node');
    root = node.nextId;
  }
  return ids;
}
const binding = (list: List, name: string) => list.bindings.find(b => b.name === name)!.objectId;

describe('206 content and reference identity model', () => {
  it('validates complete lesson, source SHA, cases and starter separation', () => {
    expect(LessonSchema.safeParse(lesson206)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson206.reference.sourceHash);
    expect(lesson206.independent.initialSource).not.toContain('curr.next = prev');
    expect(lesson206.testSuite.cases).toHaveLength(9);
    expect(lesson206.testSuite.wrongFixtures).toHaveLength(3);
    expect(demoInputs.map(d => d.id)).toEqual(['duplicates', 'empty', 'singleton', 'two']);
  });

  it('checks each assignment effect, code line, loop partition and node identity', async () => {
    for (const head of [[], [7], [2, 9], [5, 5, 8], [4, 4, 4, 4], [-2, 0, 3, -1, 0]]) {
      const trace = await buildReferenceTrace({ head }, 'step-test');
      expect(trace.finalOutput).toEqual(expectedReversedList({ head }));
      let old = listOf(trace.initialState);
      for (const snapshot of trace.snapshots) {
        const list = listOf(snapshot);
        expect(list.nodes.map(n => [n.id, n.value])).toEqual(head.map((v, i) => [`h${i}`, v]));
        expect(snapshot.variables.filter(v => v.value.kind === 'reference').map(v => ({ name: v.name, objectId: v.value.kind === 'reference' ? v.value.objectId : null }))).toEqual(list.bindings);
        const map = REFERENCE_STEP_MAP.find(m => m.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: map.startLine, endLine: map.endLine });
        const line = REFERENCE_SOURCE.split('\n')[map.startLine - 1]!.trim();
        if (snapshot.stepId === 'save-next') {
          expect(line).toBe('ListNode next = curr.next;');
          expect(list.nodes).toEqual(old.nodes);
          expect(binding(list, 'next')).toBe(old.nodes.find(n => n.id === binding(old, 'curr'))!.nextId);
          expect(binding(list, 'prev')).toBe(binding(old, 'prev'));
        } else if (snapshot.stepId === 'reverse-next') {
          expect(line).toBe('curr.next = prev;');
          expect(list.bindings).toEqual(old.bindings);
          for (const node of list.nodes) expect(node.nextId).toBe(node.id === binding(list, 'curr') ? binding(old, 'prev') : old.nodes.find(n => n.id === node.id)!.nextId);
          const after = reachable(list, binding(list, 'curr'));
          const remaining = reachable(list, binding(list, 'next'));
          expect(new Set([...after, ...remaining]).size).toBe(head.length);
          expect(after.length + remaining.length).toBe(head.length);
        } else if (snapshot.stepId === 'move-prev') {
          expect(line).toBe('prev = curr;'); expect(list.nodes).toEqual(old.nodes);
          expect(binding(list, 'prev')).toBe(binding(old, 'curr'));
          expect(binding(list, 'curr')).toBe(binding(old, 'curr'));
        } else if (snapshot.stepId === 'move-curr') {
          expect(line).toBe('curr = next;'); expect(list.nodes).toEqual(old.nodes);
          expect(binding(list, 'curr')).toBe(binding(old, 'next'));
          expect(binding(list, 'prev')).toBe(binding(old, 'prev'));
        }
        if (snapshot.stepId === 'check-loop' || snapshot.stepId === 'move-curr') {
          const a = reachable(list, binding(list, 'prev')); const b = reachable(list, binding(list, 'curr'));
          expect(new Set([...a, ...b]).size).toBe(head.length); expect(a.length + b.length).toBe(head.length);
          expect(a).toEqual(Array.from({ length: a.length }, (_, i) => `h${a.length - i - 1}`));
          expect(b).toEqual(Array.from({ length: b.length }, (_, i) => `h${a.length + i}`));
        }
        old = list;
      }
      expect(trace.snapshots.flatMap((_, i) => predictionAt(trace, i) ?? [])).toHaveLength(2);
    }
  });

  it('preserves repeated-value identities and restores snapshots without inverse mutations', async () => {
    const input = { head: [5, 5, 8] };
    const trace = await buildReferenceTrace(input, 'duplicates');
    const before = trace.snapshots.find(s => s.stepId === 'save-next')!;
    const after = trace.snapshots.find(s => s.stepId === 'reverse-next')!;
    expect(listOf(before).nodes[0]!.nextId).toBe('h1');
    expect(listOf(after).nodes[0]!.nextId).toBeNull();
    expect(listOf(after).nodes.map(n => n.id)).toEqual(['h0', 'h1', 'h2']);
    input.head[0] = 99;
    expect(listOf(before).nodes[0]!.value).toBe(5);
    const checkFrozen = (v: unknown): void => { if (v && typeof v === 'object') { expect(Object.isFrozen(v)).toBe(true); Object.values(v).forEach(checkFrozen); } };
    checkFrozen(trace);
    expect(Reflect.set(listOf(after).nodes[0]!, 'nextId', 'h1')).toBe(false);
    expect(listOf(before).nodes[0]!.nextId).toBe('h1');
  });

  it('constructs cycle, lost-chain and identity counterexamples independently of model output', () => {
    const good = expectedReversedList({ head: [5, 5] });
    const list: List = { kind: 'list', id: 'test', nodes: good.nodes, bindings: [] };
    expect(reachable(list, good.headId)).toEqual(['h1', 'h0']);
    const cycle: List = { ...list, nodes: [{ id: 'h0', value: 5, nextId: 'h1' }, { id: 'h1', value: 5, nextId: 'h0' }] };
    expect(() => reachable(cycle, 'h1')).toThrow('cycle');
    expect(reachable(list, 'h0')).toHaveLength(1);
    expect(reachable(list, 'h0').length).not.toBe(good.nodes.length);
    expect(() => reachable(list, 'new-node')).toThrow('unknown node');
  });

  it('has deterministic dynamic predictions, isolated input SHA and transparent limits', async () => {
    const a = await buildReferenceTrace({ head: [5, 5, 8] }, 'd');
    expect(a).toEqual(await buildReferenceTrace({ head: [5, 5, 8] }, 'd'));
    expect(a.inputHash).toBe(createHash('sha256').update('{"head":[5,5,8]}').digest('hex'));
    const answers = (t: ReferenceTrace) => t.snapshots.flatMap((_, i) => { const p = predictionAt(t, i); return p ? [p.answer] : []; });
    expect(answers(a)).toEqual([{ kind: 'text', value: 'h1' }, { kind: 'text', value: 'null' }]);
    const empty = await buildReferenceTrace({ head: [] }, 'empty');
    expect(answers(empty)).toEqual([{ kind: 'text', value: 'null' }, { kind: 'text', value: 'null' }]);
    expect(empty.inputHash).not.toBe(a.inputHash);
    await expect(buildReferenceTrace({ head: Array(400).fill(1) as number[] }, 'too-many')).rejects.toThrow('2000');
    await expect(buildReferenceTrace({ head: [6000] }, 'invalid')).rejects.toThrow();
    const supported = await buildReferenceTrace({ head: Array(399).fill(1) as number[] }, 'supported');
    expect(supported.snapshots).toHaveLength(1999);
  });
});
