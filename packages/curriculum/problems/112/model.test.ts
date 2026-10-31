import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson112 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Tree = Extract<Structure, { kind: 'tree' }>;
type ArrayState = Extract<Structure, { kind: 'array' }>;
const treeOf = (state: State): Tree => state.structures.find((structure): structure is Tree => structure.kind === 'tree')!;
const pathOf = (state: State): ArrayState => state.structures.find((structure): structure is ArrayState => structure.kind === 'array')!;
const valueOf = (state: State, name: string) => state.variables.find(variable => variable.name === name)?.value;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('112 recursive remaining-target reference model', () => {
  it('matches the independent oracle for each displayable judged case and maps every step to Java', async () => {
    for (const testCase of lesson112.testSuite.cases.filter(item => item.id !== 'depth-limit-case')) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.finalOutput).toEqual(expectedOutput('112', testCase.input));
      expect(trace.mode).toBe('reference-model');
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the tree graph and object IDs fixed while frame paths and remaining values progress', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const initialNodes = treeOf(trace.initialState).nodes;
      for (const snapshot of trace.snapshots) {
        const tree = treeOf(snapshot);
        expect(tree.nodes).toEqual(initialNodes);
        expect(tree.rootId).toBe(tree.nodes[0]?.id ?? null);
        const byId = new Map(tree.nodes.map(node => [node.id, node]));
        const path = tree.frames.flatMap(frame => frame.nodeId === null ? [] : [byId.get(frame.nodeId)!.value]);
        expect(pathOf(snapshot).values).toEqual(path);
        expect(valueOf(snapshot, '路径前缀和')).toEqual({ kind: 'int', value: path.reduce((sum, value) => sum + value, 0) });
        expect(tree.frames[0]?.frameId ?? null).toBe(tree.frames.length === 0 ? null : 'f0');
        expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
        const active = tree.frames.at(-1)!;
        expect(valueOf(snapshot, '当前 root')).toEqual({ kind: 'reference', objectId: active.nodeId });
        if (active.nodeId !== null && valueOf(snapshot, 'remaining')) {
          const target = valueOf(snapshot, '当前 targetSum');
          const remaining = valueOf(snapshot, 'remaining');
          expect(target?.kind).toBe('int');
          expect(remaining?.kind).toBe('int');
          if (target?.kind === 'int' && remaining?.kind === 'int') {
            expect(remaining.value).toBe(target.value - byId.get(active.nodeId)!.value);
          }
        }
        if (snapshot.stepId === 'check-leaf' || snapshot.stepId === 'return-leaf') {
          const node = byId.get(active.nodeId!)!;
          const isLeaf = node.leftId === null && node.rightId === null;
          expect(valueOf(snapshot, '是叶节点')).toEqual({ kind: 'boolean', value: isLeaf });
          if (snapshot.stepId === 'return-leaf') {
            expect(isLeaf).toBe(true);
            const remaining = valueOf(snapshot, 'remaining');
            expect(remaining?.kind).toBe('int');
            if (remaining?.kind === 'int') expect(valueOf(snapshot, '本次返回值')).toEqual({ kind: 'boolean', value: remaining.value === 0 });
          }
        }
      }
    }
  });

  it('never accepts a matching nonleaf prefix and obeys Java || short-circuit', async () => {
    const nonleaf = await buildReferenceTrace({ root: [5, 4, 8], targetSum: 5 }, 'nonleaf');
    const rootSubtraction = nonleaf.snapshots.find(snapshot => snapshot.stepId === 'subtract-value' && treeOf(snapshot).frames.length === 1)!;
    expect(valueOf(rootSubtraction, 'remaining')).toEqual({ kind: 'int', value: 0 });
    expect(valueOf(nonleaf.snapshots.at(-1)!, '本次返回值')).toEqual({ kind: 'boolean', value: false });
    expect(nonleaf.finalOutput).toEqual({ kind: 'boolean', value: false });
    const shortCircuit = await buildReferenceTrace({ root: [0, 0, 0], targetSum: 0 }, 'short-circuit');
    expect(shortCircuit.snapshots.some(snapshot => snapshot.stepId === 'call-right')).toBe(false);
    expect(shortCircuit.finalOutput).toEqual({ kind: 'boolean', value: true });
    const rightOnly = await buildReferenceTrace({ root: [1, 2, 3], targetSum: 4 }, 'right-only');
    expect(rightOnly.snapshots.some(snapshot => snapshot.stepId === 'call-right')).toBe(true);
    expect(rightOnly.finalOutput).toEqual({ kind: 'boolean', value: true });
  });

  it('recalculates two input-specific predictions and freezes isolated snapshots', async () => {
    const input = { root: [1, 2, 3], targetSum: 4 };
    const trace = await buildReferenceTrace(input, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [1, 2, 3], targetSum: 4 }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"root":[1,2,3],"targetSum":4}').digest('hex'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'not-null' },
      { kind: 'choice', optionId: 'yes' },
    ]);
    const empty = await buildReferenceTrace({ root: [], targetSum: 0 }, 'empty');
    expect(predictions(empty).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'is-null' },
      { kind: 'choice', optionId: 'no' },
    ]);
    input.root[0] = 99;
    expect(treeOf(trace.initialState).nodes[0]!.value).toBe(1);
    const checkFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(checkFrozen);
      }
    };
    checkFrozen(trace);
    expect(Reflect.set(treeOf(trace.snapshots.at(-1)!).nodes[0]!, 'value', 99)).toBe(false);
  });

  it('separates same-value objects and rejects oversized displays without losing real runner coverage', async () => {
    const repeated = await buildReferenceTrace({ root: [1, 1, 1, 1, null, null, 1], targetSum: 3 }, 'repeated');
    expect(treeOf(repeated.initialState).nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3', 't4']);
    expect(new Set(treeOf(repeated.initialState).nodes.map(node => node.id)).size).toBe(5);
    const boundary = lesson112.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')!;
    await expect(buildReferenceTrace(boundary.input, boundary.id)).rejects.toThrow('深度最多 8');
    await expect(buildReferenceTrace({ root: Array(31).fill(1) as number[], targetSum: 3 }, '31')).rejects.toThrow('最多 30 个节点');
  });
});
