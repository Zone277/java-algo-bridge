import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson100 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Tree = Extract<Structure, { kind: 'tree' }>;
type Stack = Extract<Structure, { kind: 'stack' }>;
const treeOf = (state: State, id: 'p-tree' | 'q-tree'): Tree => state.structures.find((item): item is Tree => item.kind === 'tree' && item.id === id)!;
const stackOf = (state: State): Stack => state.structures.find((item): item is Stack => item.kind === 'stack')!;
const predictions = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('100 recursive paired-tree reference model', () => {
  it('matches the independent oracle for every displayable judged case and maps real Java lines', async () => {
    for (const testCase of lesson100.testSuite.cases.filter(testCase => testCase.id !== 'depth-limit-case')) {
      const trace = await buildReferenceTrace(testCase.input, testCase.id);
      expect(trace.mode).toBe('reference-model');
      expect(trace.finalOutput).toEqual(expectedOutput('100', testCase.input));
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      expect(predictions(trace)).toHaveLength(2);
      for (const snapshot of trace.snapshots) {
        const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
        expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps p/q object identity separate, preserves repeated values, and binds both frame views to one pair', async () => {
    const trace = await buildReferenceTrace({ p: [1, 7, 7, 7], q: [1, 7, 7, null, null, 7] }, 'repeated');
    const initialP = treeOf(trace.initialState, 'p-tree');
    const initialQ = treeOf(trace.initialState, 'q-tree');
    expect(initialP.nodes.map(node => node.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(initialQ.nodes.map(node => node.id)).toEqual(['q0', 'q1', 'q2', 'q3']);
    expect(initialP.nodes.filter(node => node.value === 7)).toHaveLength(3);
    expect(initialQ.nodes.filter(node => node.value === 7)).toHaveLength(3);
    for (const snapshot of trace.snapshots) {
      const pTree = treeOf(snapshot, 'p-tree');
      const qTree = treeOf(snapshot, 'q-tree');
      const stack = stackOf(snapshot);
      expect(pTree.nodes).toEqual(initialP.nodes);
      expect(qTree.nodes).toEqual(initialQ.nodes);
      expect(pTree.frames.map(frame => frame.frameId)).toEqual(qTree.frames.map(frame => frame.frameId));
      expect(pTree.frames.map(frame => frame.frameId)).toEqual(stack.items.map(item => item.kind === 'string' ? item.value.split(':')[0] : ''));
      const activeP = pTree.frames.at(-1);
      const activeQ = qTree.frames.at(-1);
      if (activeP && activeQ) {
        expect(snapshot.variables.find(variable => variable.name === '当前 p')?.value).toEqual({ kind: 'reference', objectId: activeP.nodeId });
        expect(snapshot.variables.find(variable => variable.name === '当前 q')?.value).toEqual({ kind: 'reference', objectId: activeQ.nodeId });
      }
    }
  });

  it('keeps every active pair on matching left/right paths and honors && short circuit', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const pNodes = new Map(treeOf(trace.initialState, 'p-tree').nodes.map(node => [node.id, node]));
      const qNodes = new Map(treeOf(trace.initialState, 'q-tree').nodes.map(node => [node.id, node]));
      for (let index = 0; index < trace.snapshots.length; index++) {
        const snapshot = trace.snapshots[index]!;
        const item = stackOf(snapshot).items.at(-1);
        const match = item?.kind === 'string' ? /^f\d+: (p\d+|null) ↔ (q\d+|null)$/.exec(item.value) : null;
        if (!match) continue;
        const pId = match[1] === 'null' ? null : match[1]!;
        const qId = match[2] === 'null' ? null : match[2]!;
        if (pId !== null) expect(pNodes.has(pId)).toBe(true);
        if (qId !== null) expect(qNodes.has(qId)).toBe(true);
        if (snapshot.stepId === 'return-both-null') expect([pId, qId]).toEqual([null, null]);
        if (snapshot.stepId === 'return-one-null') expect((pId === null) !== (qId === null)).toBe(true);
        if (snapshot.stepId === 'return-values-differ') expect(pNodes.get(pId!)!.value).not.toBe(qNodes.get(qId!)!.value);
        if (snapshot.stepId === 'call-left-pair' || snapshot.stepId === 'call-right-pair') {
          const p = pNodes.get(pId!)!;
          const q = qNodes.get(qId!)!;
          const expectedP = snapshot.stepId === 'call-left-pair' ? p.leftId : p.rightId;
          const expectedQ = snapshot.stepId === 'call-left-pair' ? q.leftId : q.rightId;
          const next = trace.snapshots[index + 1]!;
          expect(next.stepId).toBe('enter-pair');
          expect(next.variables.find(variable => variable.name === '当前 p')?.value).toEqual({ kind: 'reference', objectId: expectedP });
          expect(next.variables.find(variable => variable.name === '当前 q')?.value).toEqual({ kind: 'reference', objectId: expectedQ });
        }
      }
    }
    const mismatch = await buildReferenceTrace(demoInputs[1]!.input, 'short-circuit');
    expect(mismatch.snapshots.some(snapshot => snapshot.stepId === 'short-circuit-left')).toBe(true);
    expect(stackOf(mismatch.snapshots.at(-2)!).items.some(item => item.kind === 'string' && item.value.includes('p2 ↔ q2'))).toBe(false);
  });

  it('recalculates both predictions from the selected input and deeply freezes restored snapshots', async () => {
    const raw = { p: [1, 2, 3, null, 4], q: [1, 2, 3, null, 4] };
    const trace = await buildReferenceTrace(raw, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ p: [1, 2, 3, null, 4], q: [1, 2, 3, null, 4] }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"p":[1,2,3,null,4],"q":[1,2,3,null,4]}').digest('hex'));
    expect(predictions(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'values-equal' }, { kind: 'choice', optionId: 'same' },
    ]);
    const different = await buildReferenceTrace({ p: [1], q: [2] }, 'different');
    expect(predictions(different).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'values-differ' }, { kind: 'choice', optionId: 'different' },
    ]);
    const oneNull = await buildReferenceTrace({ p: [], q: [1] }, 'one-null');
    expect(predictions(oneNull).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'one-null' }, { kind: 'choice', optionId: 'different' },
    ]);
    const bothNull = await buildReferenceTrace({ p: [], q: [] }, 'both-null');
    expect(predictions(bothNull).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'both-null' }, { kind: 'choice', optionId: 'same' },
    ]);
    raw.p[0] = 99;
    expect(treeOf(trace.initialState, 'p-tree').nodes[0]?.value).toBe(1);
    const checkFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(checkFrozen);
      }
    };
    checkFrozen(trace);
  });

  it('rejects only the smaller presentation limits and leaves the real judge boundary to contracts', async () => {
    await expect(buildReferenceTrace({ p: Array(31).fill(1) as number[], q: [] }, 'wide')).rejects.toThrow('最多 30 个节点');
    const deep: (number | null)[] = [1];
    for (let level = 1; level < 9; level++) deep.push(null, 1);
    await expect(buildReferenceTrace({ p: deep, q: [...deep] }, 'deep')).rejects.toThrow('深度最多 8');
  });
});
