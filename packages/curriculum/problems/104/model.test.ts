import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson104 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Tree = Extract<Structure, { kind: 'tree' }>;
type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const treeOf = (state: State): Tree => state.structures.find((structure): structure is Tree => structure.kind === 'tree')!;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('104 reference recursion model', () => {
  it('differentially matches the contract for every lesson case and maps each code step', async () => {
    for (const testCase of lesson104.testSuite.cases) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.finalOutput).toEqual(expectedOutput('104', testCase.input));
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('uses compact queue parsing, stable t node IDs and distinct repeated-value objects', async () => {
    const compact = await buildReferenceTrace({ root: [1, null, 2, 3] }, 'compact');
    expect(treeOf(compact.initialState)).toMatchObject({
      rootId: 't0',
      nodes: [
        { id: 't0', value: 1, leftId: null, rightId: 't1' },
        { id: 't1', value: 2, leftId: 't2', rightId: null },
        { id: 't2', value: 3, leftId: null, rightId: null },
      ],
    });
    const repeated = await buildReferenceTrace({ root: [5, 5, 5, 5, null, null, 5] }, 'duplicates');
    const nodes = treeOf(repeated.initialState).nodes;
    expect(nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3', 't4']);
    expect(nodes.map(node => node.value)).toEqual([5, 5, 5, 5, 5]);
    expect(new Set(nodes.map(node => node.id)).size).toBe(5);
  });

  it('keeps the object graph fixed while frames progress bottom-to-top through all phases', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const initialNodes = treeOf(trace.initialState).nodes;
      const seenPhases = new Set<string>();
      for (const snapshot of trace.snapshots) {
        const tree = treeOf(snapshot);
        expect(tree.nodes).toEqual(initialNodes);
        expect(tree.frames[0]?.frameId ?? null).toBe(tree.frames.length === 0 ? null : 'f0');
        expect(tree.frames.length).toBeGreaterThan(0);
        expect(snapshot.variables.find(variable => variable.name === 'root')?.value).toEqual({
          kind: 'reference', objectId: tree.frames.at(-1)!.nodeId,
        });
        expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
        for (let index = 1; index < tree.frames.length; index++) {
          expect(Number(tree.frames[index]!.frameId.slice(1))).toBeGreaterThan(Number(tree.frames[index - 1]!.frameId.slice(1)));
        }
        for (const frame of tree.frames) {
          seenPhases.add(frame.phase);
          expect(frame.frameId).toMatch(/^f\d+$/);
          if (frame.nodeId !== null) expect(frame.nodeId).toMatch(/^t\d+$/);
          expect(frame.frameId).not.toBe(frame.nodeId);
          if (frame.phase === 'await-left') {
            expect(frame.leftDepth).toBeNull(); expect(frame.rightDepth).toBeNull(); expect(frame.returnValue).toBeNull();
          } else if (frame.phase === 'await-right') {
            expect(frame.leftDepth).not.toBeNull(); expect(frame.rightDepth).toBeNull(); expect(frame.returnValue).toBeNull();
          } else if (frame.phase === 'return') {
            expect(frame.returnValue).not.toBeNull();
            if (frame.nodeId === null) {
              expect(frame.leftDepth).toBeNull(); expect(frame.rightDepth).toBeNull(); expect(frame.returnValue).toBe(0);
            } else {
              expect(frame.leftDepth).not.toBeNull(); expect(frame.rightDepth).not.toBeNull();
              expect(frame.returnValue).toBe(1 + Math.max(frame.leftDepth!, frame.rightDepth!));
            }
          }
        }
      }
      expect(seenPhases).toEqual(demo.input.root.length === 0
        ? new Set(['enter', 'return'])
        : new Set(['enter', 'await-left', 'await-right', 'return']));
    }
  });

  it('records explicit null returns and restores parent frames when moving back or forward', async () => {
    const trace = await buildReferenceTrace({ root: [1, null, 2, 3] }, 'restore');
    const rootWaitingLeft = trace.snapshots.find(snapshot => snapshot.stepId === 'await-left' && treeOf(snapshot).frames.length === 1)!;
    const serializedBefore = JSON.stringify(rootWaitingLeft);
    const nullReturn = trace.snapshots.find(snapshot => snapshot.stepId === 'return-null')!;
    expect(treeOf(nullReturn).frames.at(-1)).toMatchObject({ nodeId: null, phase: 'return', returnValue: 0 });
    const rootWaitingRight = trace.snapshots.find(snapshot => snapshot.stepId === 'await-right' && treeOf(snapshot).frames.length === 1)!;
    expect(treeOf(rootWaitingRight).frames).toEqual([
      expect.objectContaining({ frameId: 'f0', nodeId: 't0', phase: 'await-right', leftDepth: 0, rightDepth: null }),
    ]);
    expect(JSON.stringify(rootWaitingLeft)).toBe(serializedBefore);
    expect(treeOf(rootWaitingLeft).frames[0]).toMatchObject({ frameId: 'f0', phase: 'await-left', leftDepth: null });
  });

  it('generates two input-specific predictions, deterministic hashes and frozen isolated snapshots', async () => {
    const raw = { root: [1, null, 2, 3] };
    const trace = await buildReferenceTrace(raw, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [1, null, 2, 3] }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"root":[1,null,2,3]}').digest('hex'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'not-null' },
      { kind: 'int', value: 3 },
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

  it('supports the depth-128 boundary but fails transparently when a valid model input exceeds snapshot capacity', async () => {
    const boundary = lesson104.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')!;
    const trace = await buildReferenceTrace(boundary.input, boundary.id);
    expect(trace.finalOutput).toEqual({ kind: 'int', value: 128 });
    expect(trace.snapshots.length).toBeLessThan(2000);
    await expect(buildReferenceTrace({ root: Array(1000).fill(1) as number[] }, 'too-many')).rejects.toThrow('2000');
  });
});
