import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson145 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Tree = Extract<Structure, { kind: 'tree' }>;
type ArrayState = Extract<Structure, { kind: 'array' }>;
type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const treeOf = (state: State): Tree => state.structures.find((structure): structure is Tree => structure.kind === 'tree')!;
const outputOf = (state: State): ArrayState => state.structures.find((structure): structure is ArrayState => structure.kind === 'array' && structure.id === 'output-prefix')!;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('145 recursive postorder reference model', () => {
  it('matches the independent iterative oracle for every display-safe case and maps real Java lines', async () => {
    for (const testCase of lesson145.testSuite.cases.filter(item => item.id !== 'depth-limit-case')) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.finalOutput).toEqual(expectedOutput('145', testCase.input));
      expect(outputOf(trace.snapshots.at(-1)!).values).toEqual(testCase.expected.values);
      expect(predictions(trace)).toHaveLength(2);
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('builds compact trees with stable unique identities even for repeated values', async () => {
    const compact = await buildReferenceTrace({ root: [1, null, 2, 3] }, 'compact');
    expect(treeOf(compact.initialState)).toMatchObject({
      rootId: 't0', frameSemantics: 'traversal',
      nodes: [
        { id: 't0', value: 1, leftId: null, rightId: 't1' },
        { id: 't1', value: 2, leftId: 't2', rightId: null },
        { id: 't2', value: 3, leftId: null, rightId: null },
      ],
    });
    const repeated = await buildReferenceTrace({ root: [5, 5, 5, 5, null, null, 5] }, 'repeated');
    const nodes = treeOf(repeated.initialState).nodes;
    expect(nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3', 't4']);
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
    expect(nodes.map(node => node.value)).toEqual([5, 5, 5, 5, 5]);
    expect(repeated.snapshots.filter(snapshot => snapshot.stepId === 'visit-node')).toHaveLength(5);
  });

  it('maintains immutable tree fields and checks both descendant subtrees before every visit', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const initialNodes = treeOf(trace.initialState).nodes;
      const byId = new Map(initialNodes.map(node => [node.id, node]));
      const descendants = (id: string | null): string[] => {
        if (id === null) return [];
        const node = byId.get(id)!;
        return [id, ...descendants(node.leftId), ...descendants(node.rightId)];
      };
      const visitedIds: string[] = [];
      let previousLength = 0;
      for (const snapshot of trace.snapshots) {
        const tree = treeOf(snapshot);
        expect(tree.nodes).toEqual(initialNodes);
        expect(tree.frameSemantics).toBe('traversal');
        expect(tree.frames.every(frame => frame.leftDepth === null && frame.rightDepth === null && frame.returnValue === null)).toBe(true);
        expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
        const active = tree.frames.at(-1);
        expect(snapshot.variables.find(variable => variable.name === 'root')?.value).toEqual({ kind: 'reference', objectId: tree.rootId });
        expect(snapshot.variables.find(variable => variable.name === 'node')?.value).toEqual(active
          ? { kind: 'reference', objectId: active.nodeId }
          : undefined);
        if (snapshot.stepId === 'visit-node') {
          expect(active?.nodeId).not.toBeNull();
          const node = byId.get(active!.nodeId!)!;
          const visited = new Set(visitedIds);
          expect(descendants(node.leftId).every(id => visited.has(id))).toBe(true);
          expect(descendants(node.rightId).every(id => visited.has(id))).toBe(true);
          expect(visited.has(node.id)).toBe(false);
          visitedIds.push(active!.nodeId!);
        }
        const prefix = outputOf(snapshot).values;
        expect(prefix.length).toBeGreaterThanOrEqual(previousLength);
        expect(prefix.length - previousLength).toBe(snapshot.stepId === 'visit-node' ? 1 : 0);
        expect(prefix).toEqual(visitedIds.map(id => byId.get(id)!.value));
        previousLength = prefix.length;
      }
      expect(new Set(visitedIds).size).toBe(initialNodes.length);
      expect(visitedIds.length).toBe(initialNodes.length);
      expect(outputOf(trace.snapshots.at(-1)!).values).toEqual(trace.finalOutput.kind === 'int-array' ? trace.finalOutput.values : null);
    }
  });

  it('records correct recursive parent/child phase changes and restores earlier snapshots', async () => {
    const trace = await buildReferenceTrace({ root: [8, 4, 12, 2, 6, 10, 14] }, 'phases');
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'call-left' && treeOf(snapshot).frames.length === 1)!;
    const preserved = JSON.stringify(before);
    const leftChildVisit = trace.snapshots.find(snapshot => snapshot.stepId === 'visit-node' && treeOf(snapshot).frames.at(-1)?.nodeId === 't1')!;
    expect(treeOf(leftChildVisit).frames[0]).toMatchObject({ frameId: 'f0', nodeId: 't0', phase: 'await-left' });
    expect(treeOf(leftChildVisit).frames.at(-1)).toMatchObject({ nodeId: 't1', phase: 'await-right' });
    const afterLeft = trace.snapshots.find(snapshot => snapshot.stepId === 'call-right' && treeOf(snapshot).frames.length === 1)!;
    expect(treeOf(afterLeft).frames[0]).toMatchObject({ frameId: 'f0', nodeId: 't0', phase: 'await-right' });
    const rootVisit = trace.snapshots.find(snapshot => snapshot.stepId === 'visit-node' && treeOf(snapshot).frames.at(-1)?.nodeId === 't0')!;
    expect(outputOf(rootVisit).values).toEqual([2, 6, 4, 10, 14, 12, 8]);
    expect(JSON.stringify(before)).toBe(preserved);
    expect(treeOf(before).frames[0]).toMatchObject({ frameId: 'f0', nodeId: 't0', phase: 'await-left' });
  });

  it('uses input-specific predictions, deterministic hashes and frozen isolated snapshots', async () => {
    const raw = { root: [8, 4, 12, 2, 6, 10, 14] };
    const trace = await buildReferenceTrace(raw, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [8, 4, 12, 2, 6, 10, 14] }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update(JSON.stringify(raw)).digest('hex'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'not-null' },
      { kind: 'text', value: '[2,6,4,10,14,12,8]' },
    ]);
    const empty = await buildReferenceTrace({ root: [] }, 'empty');
    expect(predictions(empty).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'is-null' },
      { kind: 'text', value: '[]' },
    ]);
    expect(treeOf(empty.initialState).nodes).toEqual([]);
    raw.root[0] = 99;
    expect(treeOf(trace.initialState).nodes[0]!.value).toBe(8);
    const verifyFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(verifyFrozen);
      }
    };
    verifyFrozen(trace);
    expect(Reflect.set(treeOf(trace.snapshots.at(-1)!).nodes[0]!, 'leftId', 't9')).toBe(false);
  });

  it('differentially checks fixed-seed sparse trees against the independent stack oracle', async () => {
    let seed = 1452026;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    for (let index = 0; index < 40; index++) {
      if (index % 13 === 0) {
        const empty = { root: [] as (number | null)[] };
        expect((await buildReferenceTrace(empty, `generated-${index}`)).finalOutput).toEqual(expectedOutput('145', empty));
        continue;
      }
      const root: (number | null)[] = [next() % 21 - 10];
      const queue = [1];
      let count = 1;
      for (let parent = 0; parent < queue.length; parent++) {
        if (queue[parent]! >= 6 || count >= 20) break;
        for (let side = 0; side < 2; side++) {
          const hasChild = next() % 4 !== 0 && count < 20;
          root.push(hasChild ? next() % 21 - 10 : null);
          if (hasChild) { count++; queue.push(queue[parent]! + 1); }
        }
      }
      const input = { root };
      const trace = await buildReferenceTrace(input, `generated-${index}`);
      expect(trace.finalOutput).toEqual(expectedOutput('145', input));
      expect(trace.snapshots.filter(snapshot => snapshot.stepId === 'visit-node')).toHaveLength(count);
    }
  });

  it('rejects valid but oversized tree demos without narrowing the Java runner input contract', async () => {
    const depthLimit = lesson145.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')!;
    expect(expectedOutput('145', depthLimit.input)).toEqual(depthLimit.expected);
    await expect(buildReferenceTrace(depthLimit.input, depthLimit.id)).rejects.toThrow('深度最多 8');
    const wideTree = { root: Array(31).fill(1) as number[] };
    await expect(buildReferenceTrace(wideTree, '31-nodes')).rejects.toThrow('最多 30 个节点');
  });
});
