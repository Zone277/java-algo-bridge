import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson111 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Tree = Extract<Structure, { kind: 'tree' }>;
type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const treeOf = (state: State): Tree => state.structures.find((structure): structure is Tree => structure.kind === 'tree')!;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('111 minimum-depth reference model', () => {
  it('matches the independent contract oracle on every model-sized lesson case and maps code lines', async () => {
    for (const testCase of lesson111.testSuite.cases.filter(item => item.input.root.length <= 30)) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.finalOutput).toEqual(expectedOutput('111', testCase.input));
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps stable node identities and parses compact queue children correctly', async () => {
    const trace = await buildReferenceTrace({ root: [1, null, 2, 3] }, 'compact');
    expect(treeOf(trace.initialState).nodes).toEqual([
      { id: 't0', value: 1, leftId: null, rightId: 't1' },
      { id: 't1', value: 2, leftId: 't2', rightId: null },
      { id: 't2', value: 3, leftId: null, rightId: null },
    ]);
    const repeated = await buildReferenceTrace({ root: [7, 7, 7, null, 7] }, 'repeated');
    expect(treeOf(repeated.initialState).nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3']);
    expect(new Set(treeOf(repeated.initialState).nodes.map(node => node.id)).size).toBe(4);
  });

  it('enforces the intermediate minimum-depth invariant at every non-null return', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const fixedNodes = treeOf(trace.initialState).nodes;
      for (const snapshot of trace.snapshots) {
        const tree = treeOf(snapshot);
        expect(tree.nodes).toEqual(fixedNodes);
        expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
        const active = tree.frames.at(-1);
        if (snapshot.stepId === 'return-null') {
          expect(active).toMatchObject({ nodeId: null, returnValue: 0 });
        }
        if (snapshot.stepId === 'return-only-child') {
          expect(active?.leftDepth === 0 || active?.rightDepth === 0).toBe(true);
          expect(active?.returnValue).toBe(1 + Math.max(active!.leftDepth!, active!.rightDepth!));
        }
        if (snapshot.stepId === 'return-nearer-child') {
          expect(active!.leftDepth).toBeGreaterThan(0);
          expect(active!.rightDepth).toBeGreaterThan(0);
          expect(active?.returnValue).toBe(1 + Math.min(active!.leftDepth!, active!.rightDepth!));
        }
      }
    }
  });

  it('makes one-child roots use the non-zero side and restores earlier immutable frames', async () => {
    const trace = await buildReferenceTrace({ root: [1, null, 2, 3] }, 'one-child');
    const waitingLeft = trace.snapshots.find(snapshot => snapshot.stepId === 'await-left' && treeOf(snapshot).frames.length === 1)!;
    const serialized = JSON.stringify(waitingLeft);
    const rootReturn = trace.snapshots.find(snapshot => snapshot.stepId === 'return-only-child' && treeOf(snapshot).frames.length === 1)!;
    expect(treeOf(rootReturn).frames[0]).toMatchObject({ nodeId: 't0', leftDepth: 0, rightDepth: 2, returnValue: 3 });
    expect(JSON.stringify(waitingLeft)).toBe(serialized);
    expect(treeOf(waitingLeft).frames[0]).toMatchObject({ phase: 'await-left', leftDepth: null, rightDepth: null });
  });

  it('describes a single node as a leaf rather than as a node with an existing child', async () => {
    const trace = await buildReferenceTrace({ root: [8] }, 'single-leaf');
    const check = trace.snapshots.find(snapshot => snapshot.stepId === 'check-missing-child' && treeOf(snapshot).frames.length === 1)!;
    const returned = trace.snapshots.find(snapshot => snapshot.stepId === 'return-only-child' && treeOf(snapshot).frames.length === 1)!;
    expect(check.explanation).toContain('当前节点本身是叶节点');
    expect(returned.explanation).toContain('两侧子树深度都是 0');
    expect(returned.explanation).not.toContain('存在孩子');
    expect(treeOf(returned).frames[0]).toMatchObject({ leftDepth: 0, rightDepth: 0, returnValue: 1 });
  });

  it('produces input-specific predictions, deterministic hashes and deeply frozen snapshots', async () => {
    const raw = { root: [1, 2, 3, 4, null, null, null, 5] };
    const trace = await buildReferenceTrace(raw, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [1, 2, 3, 4, null, null, null, 5] }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"root":[1,2,3,4,null,null,null,5]}').digest('hex'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'not-null' },
      { kind: 'int', value: 2 },
    ]);
    const empty = await buildReferenceTrace({ root: [] }, 'empty');
    expect(predictions(empty).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'is-null' },
      { kind: 'int', value: 0 },
    ]);
    raw.root[0] = 99;
    expect(treeOf(trace.initialState).nodes[0]!.value).toBe(1);
    const verifyFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(verifyFrozen);
      }
    };
    verifyFrozen(trace);
    expect(Reflect.set(treeOf(trace.snapshots.at(-1)!).nodes[0]!, 'leftId', 't9')).toBe(false);
  });

  it('rejects over-depth visualizations while leaving valid real-runner boundary cases in the lesson', async () => {
    const boundary = lesson111.testSuite.cases.find(item => item.id === 'depth-limit-case')!;
    expect(expectedOutput('111', boundary.input)).toEqual({ kind: 'int', value: 128 });
    await expect(buildReferenceTrace(boundary.input, boundary.id)).rejects.toThrow('深度最多 8');
  });
});
