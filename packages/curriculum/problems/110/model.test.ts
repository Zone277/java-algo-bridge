import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson110 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Tree = Extract<Structure, { kind: 'tree' }>;
const treeOf = (state: State): Tree => state.structures.find((structure): structure is Tree => structure.kind === 'tree')!;
const variable = (state: State, name: string) => state.variables.find(item => item.name === name)?.value;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

function expectedHeight(tree: Tree, id: string | null): number {
  if (id === null) return 0;
  const node = tree.nodes.find(item => item.id === id)!;
  const left = expectedHeight(tree, node.leftId);
  const right = expectedHeight(tree, node.rightId);
  if (left === -1 || right === -1 || Math.abs(left - right) > 1) return -1;
  return 1 + Math.max(left, right);
}

describe('110 bottom-up balanced-tree course and reference model', () => {
  it('validates the complete lesson, independent expected cases, source hash, and wrong-fixture targets', () => {
    expect(LessonSchema.parse(lesson110)).toEqual(lesson110);
    expect(lesson110.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson110.testSuite.wrongFixtures).toHaveLength(2);
    expect(new Set(lesson110.testSuite.cases.map(item => item.id)).size).toBe(lesson110.testSuite.cases.length);
    for (const testCase of lesson110.testSuite.cases) expect(testCase.expected).toEqual(expectedOutput('110', testCase.input));
    for (const fixture of lesson110.testSuite.wrongFixtures) {
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const id of fixture.targetedCaseIds) expect(lesson110.testSuite.cases.some(item => item.id === id)).toBe(true);
    }
    expect(lesson110.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(lesson110.guided.finalCheck).toBe('real-java-submit');
    expect(lesson110.independent.initialSource).toBe(lesson110.starter.source);
    expect(lesson110.reference.source).toBe(REFERENCE_SOURCE);
  });

  it('matches the independent oracle on every displayable judged case and maps steps to real Java lines', async () => {
    for (const testCase of lesson110.testSuite.cases.filter(item => item.id !== 'depth-limit-case')) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.mode).toBe('reference-model');
      expect(trace.finalOutput).toEqual(expectedOutput('110', testCase.input));
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps stable object identity and correct subtree-height or failure values in every intermediate frame', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const initial = treeOf(trace.initialState);
      expect(initial.nodes.map(node => node.id)).toEqual(initial.nodes.map((_, index) => `t${index}`));
      for (const snapshot of trace.snapshots) {
        const tree = treeOf(snapshot);
        expect(tree.nodes).toEqual(initial.nodes);
        expect(tree.rootId).toBe(initial.rootId);
        expect(new Set(tree.nodes.map(node => node.id)).size).toBe(tree.nodes.length);
        expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
        for (const frame of tree.frames) {
          const node = tree.nodes.find(item => item.id === frame.nodeId);
          if (frame.leftDepth !== null) expect(frame.leftDepth).toBe(expectedHeight(tree, node!.leftId));
          if (frame.rightDepth !== null) expect(frame.rightDepth).toBe(expectedHeight(tree, node!.rightId));
          if (frame.returnValue !== null) expect(frame.returnValue).toBe(expectedHeight(tree, frame.nodeId));
        }
        const active = tree.frames.at(-1);
        if (active) expect(variable(snapshot, '当前 node')).toEqual({ kind: 'reference', objectId: active.nodeId });
      }
    }
  });

  it('propagates inner failures and skips later branches exactly as the Java reference does', async () => {
    const hiddenLeft = await buildReferenceTrace({ root: [1, 2, 3, 4, null, 6, 7, 5] }, 'left');
    expect(hiddenLeft.finalOutput).toEqual({ kind: 'boolean', value: false });
    expect(hiddenLeft.snapshots.some(snapshot => snapshot.stepId === 'propagate-left-failure')).toBe(true);
    expect(hiddenLeft.snapshots.some(snapshot => treeOf(snapshot).frames.some(frame => frame.nodeId === 't2'))).toBe(false);
    const hiddenRight = await buildReferenceTrace({ root: [1, 2, 3, 4, 5, 6, null, null, null, null, null, 7] }, 'right');
    expect(hiddenRight.finalOutput).toEqual({ kind: 'boolean', value: false });
    expect(hiddenRight.snapshots.some(snapshot => snapshot.stepId === 'propagate-right-failure')).toBe(true);
    expect(hiddenRight.snapshots.some(snapshot => treeOf(snapshot).frames.some(frame => frame.nodeId === 't2'))).toBe(true);
    const rootDifference = await buildReferenceTrace({ root: [1, 2, null, 3] }, 'root-difference');
    expect(rootDifference.snapshots.some(snapshot => snapshot.stepId === 'return-unbalanced')).toBe(true);
  });

  it('recalculates input-specific predictions and freezes all state snapshots', async () => {
    const input = { root: [3, 9, 20, null, null, 15, 7] };
    const trace = await buildReferenceTrace(input, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [3, 9, 20, null, null, 15, 7] }, 'dynamic'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'int', value: 1 }, { kind: 'choice', optionId: 'balanced' },
    ]);
    const hidden = await buildReferenceTrace({ root: [1, 2, 3, 4, null, 6, 7, 5] }, 'hidden');
    expect(predictions(hidden).map(item => item.answer)).toEqual([
      { kind: 'int', value: -1 }, { kind: 'choice', optionId: 'unbalanced' },
    ]);
    const empty = await buildReferenceTrace({ root: [] }, 'empty');
    expect(predictions(empty).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'is-null' }, { kind: 'choice', optionId: 'balanced' },
    ]);
    input.root[0] = 99;
    expect(treeOf(trace.initialState).nodes[0]?.value).toBe(3);
    const checkFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(checkFrozen);
      }
    };
    checkFrozen(trace);
    expect(Reflect.set(treeOf(trace.snapshots.at(-1)!).nodes[0]!, 'value', 99)).toBe(false);
  });

  it('rejects oversized presentations explicitly, while keeping distinct same-value nodes', async () => {
    const repeated = await buildReferenceTrace({ root: [1, 1, 1, 1, 1, null, 1] }, 'repeated');
    expect(treeOf(repeated.initialState).nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5']);
    expect(treeOf(repeated.initialState).nodes.every(node => node.value === 1)).toBe(true);
    await expect(buildReferenceTrace({ root: Array(31).fill(1) as number[] }, 'wide')).rejects.toThrow('最多 30 个节点');
    const deep: (number | null)[] = [1];
    for (let i = 1; i < 9; i++) deep.push(1, null);
    await expect(buildReferenceTrace({ root: deep }, 'deep')).rejects.toThrow('深度最多 8');
  });
});
