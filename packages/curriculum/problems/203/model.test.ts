import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson203 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type List = Extract<Structure, { kind: 'list' }>;
type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const listOf = (state: State): List => state.structures.find((structure): structure is List => structure.kind === 'list')!;
const binding = (list: List, name: string) => list.bindings.find(item => item.name === name)?.objectId;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

function reachable(list: List, root: string | null): string[] {
  const ids: string[] = [];
  while (root !== null) {
    if (ids.includes(root)) throw new Error('cycle');
    ids.push(root);
    const node = list.nodes.find(item => item.id === root);
    if (!node) throw new Error(`unknown node ${root}`);
    root = node.nextId;
  }
  return ids;
}

describe('203 dummy-filter reference model', () => {
  it('matches the independent value oracle on every model-sized case and maps real source lines', async () => {
    for (const testCase of lesson203.testSuite.cases.filter(item => item.input.head.length <= 30)) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.finalOutput).toEqual(expectedOutput('203', testCase.input));
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves stable identities, an acyclic ordered retained prefix and every unprocessed node', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const expectedIds = demo.input.head.map((_, index) => `h${index}`);
      expect(listOf(trace.initialState).nodes.map(node => node.id)).toEqual(expectedIds);
      let processed = 0;
      for (const snapshot of trace.snapshots) {
        const list = listOf(snapshot);
        const originals = list.nodes.filter(node => node.id.startsWith('h'));
        expect(originals.map(node => [node.id, node.value])).toEqual(demo.input.head.map((value, index) => [`h${index}`, value]));
        expect(new Set(list.nodes.map(node => node.id)).size).toBe(list.nodes.length);

        if (snapshot.stepId === 'skip-node' || snapshot.stepId === 'move-curr') processed++;
        if (list.nodes.some(node => node.id === 'd0') && snapshot.stepId !== 'create-dummy') {
          const reachableFromDummy = reachable(list, 'd0');
          expect(reachableFromDummy[0]).toBe('d0');
          expect(reachableFromDummy.slice(1)).toEqual([
            ...expectedIds.slice(0, processed).filter((_, index) => demo.input.head[index] !== demo.input.val),
            ...expectedIds.slice(processed),
          ]);
        }
        if (snapshot.stepId === 'check-loop') {
          const curr = binding(list, 'curr');
          const retainedProcessed = expectedIds.slice(0, processed).filter((_, index) => demo.input.head[index] !== demo.input.val);
          expect(curr).toBe(retainedProcessed.at(-1) ?? 'd0');
          const currNode = list.nodes.find(node => node.id === curr)!;
          expect(currNode.nextId).toBe(expectedIds[processed] ?? null);
        }
      }
    }
  });

  it('keeps repeated values as different objects and leaves skipped objects visible without claiming collection', async () => {
    const trace = await buildReferenceTrace({ head: [5, 5, 6, 5], val: 6 }, 'repeated');
    const initial = listOf(trace.initialState);
    expect(initial.nodes.map(node => node.id)).toEqual(['h0', 'h1', 'h2', 'h3']);
    expect(initial.nodes.filter(node => node.value === 5).map(node => node.id)).toEqual(['h0', 'h1', 'h3']);
    const skipped = trace.snapshots.find(snapshot => snapshot.stepId === 'skip-node')!;
    const skippedList = listOf(skipped);
    expect(skippedList.nodes.find(node => node.id === 'h1')?.nextId).toBe('h3');
    expect(skippedList.nodes.find(node => node.id === 'h2')).toEqual({ id: 'h2', value: 6, nextId: 'h3' });
    expect(reachable(skippedList, 'd0')).toEqual(['d0', 'h0', 'h1', 'h3']);
    expect(skipped.explanation).toContain('仍显示在教学图中');
    expect(skipped.explanation).toContain('不可据此推断垃圾回收');
  });

  it('checks dynamic predictions for remove, keep and empty inputs', async () => {
    const removed = predictions(await buildReferenceTrace({ head: [6, 1], val: 6 }, 'remove'));
    expect(removed.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'remove' },
      { kind: 'text', value: 'h1' },
    ]);
    const kept = predictions(await buildReferenceTrace({ head: [5, 6], val: 6 }, 'keep'));
    expect(kept.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'keep' },
      { kind: 'text', value: 'h0' },
    ]);
    const empty = predictions(await buildReferenceTrace({ head: [], val: 1 }, 'empty'));
    expect(empty.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'done' },
      { kind: 'text', value: 'null' },
    ]);
    expect(empty[1]?.prompt).toContain('直接退出循环并返回前');
    expect(empty[1]?.prompt).not.toContain('第一次处理动作后');
  });

  it('is deterministic, hashes canonical input, deep-freezes snapshots and rejects display overflow', async () => {
    const raw = { head: [6, 1, 6, 2, 6], val: 6 };
    const trace = await buildReferenceTrace(raw, 'stable');
    expect(trace).toEqual(await buildReferenceTrace({ head: [6, 1, 6, 2, 6], val: 6 }, 'stable'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"head":[6,1,6,2,6],"val":6}').digest('hex'));
    raw.head[0] = 49;
    expect(listOf(trace.initialState).nodes[0]?.value).toBe(6);
    const verifyFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(verifyFrozen);
      }
    };
    verifyFrozen(trace);
    expect(Reflect.set(listOf(trace.snapshots.at(-1)!).nodes[0]!, 'nextId', null)).toBe(false);
    await expect(buildReferenceTrace({ head: Array(31).fill(1), val: 1 }, 'too-large')).rejects.toThrow('最多 30');
    await expect(buildReferenceTrace({ head: [0], val: 0 }, 'invalid')).rejects.toThrow();
  });
});
