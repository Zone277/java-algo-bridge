import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedOutput, type ReferenceTrace, type Structure } from '@jab/contracts';
import { demoInputs, lesson101 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Tree = Extract<Structure, { kind: 'tree' }>;
type Stack = Extract<Structure, { kind: 'stack' }>;
type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const treeOf = (state: State): Tree => state.structures.find((item): item is Tree => item.kind === 'tree')!;
const stackOf = (state: State): Stack => state.structures.find((item): item is Stack => item.kind === 'stack')!;
const checkpoints = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);

describe('101 recursive mirror reference model', () => {
  it('matches the independent contract oracle for every judged case and highlights real reference lines', async () => {
    for (const item of lesson101.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(trace.finalOutput).toEqual(expectedOutput('101', item.input));
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
      expect(checkpoints(trace)).toHaveLength(2);
      for (let index = 0; index < trace.snapshots.length; index++) {
        const snapshot = trace.snapshots[index]!;
        const range = REFERENCE_STEP_MAP.find(mapping => mapping.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: range.startLine, endLine: range.endLine });
        expect(REFERENCE_SOURCE.split('\n')[range.startLine - 1]?.trim()).not.toBe('');
      }
    }
  });

  it('keeps a stable object graph, distinct repeated-value IDs and paired stack frames', async () => {
    const trace = await buildReferenceTrace({ root: [1, 5, 5, 5, null, 5, null] }, 'repeated');
    const initial = treeOf(trace.initialState);
    expect(initial.nodes.map(node => node.id)).toEqual(['t0', 't1', 't2', 't3', 't4']);
    expect(initial.nodes.map(node => node.value)).toEqual([1, 5, 5, 5, 5]);
    expect(initial.nodes[1]).toMatchObject({ leftId: 't3', rightId: null });
    expect(initial.nodes[2]).toMatchObject({ leftId: 't4', rightId: null });
    for (const snapshot of trace.snapshots) {
      const tree = treeOf(snapshot); const stack = stackOf(snapshot);
      expect(tree.nodes).toEqual(initial.nodes);
      expect(tree.frames.map(frame => frame.frameId)).toEqual(stack.items.map(item => item.kind === 'string' ? item.value.split(':')[0] : ''));
      expect(stack.topIndex).toBe(stack.items.length ? stack.items.length - 1 : null);
      expect(new Set(tree.frames.map(frame => frame.frameId)).size).toBe(tree.frames.length);
      for (const frame of tree.frames) {
        expect(frame.leftDepth).toBeNull(); expect(frame.rightDepth).toBeNull(); expect(frame.returnValue).toBeNull();
      }
      const active = tree.frames.at(-1);
      if (active) {
        expect(snapshot.variables.find(v => v.name === 'a')?.value).toEqual({ kind: 'reference', objectId: active.nodeId });
        expect(snapshot.variables.find(v => v.name === 'b')?.value.kind).toBe('reference');
      }
    }
  });

  it('checks intermediate outer and inner mirror pair invariants, including null structure and && short circuit', async () => {
    for (const input of demoInputs) {
      const trace = await buildReferenceTrace(input.input, input.id);
      const nodes = new Map(treeOf(trace.initialState).nodes.map(node => [node.id, node]));
      const seen = new Set<string>();
      for (let index = 0; index < trace.snapshots.length; index++) {
        const snapshot = trace.snapshots[index]!;
        seen.add(snapshot.stepId);
        const tree = treeOf(snapshot); const stack = stackOf(snapshot);
        const active = tree.frames.at(-1);
        if (!active) continue;
        const pairText = stack.items.at(-1);
        expect(pairText?.kind).toBe('string');
        const match = pairText?.kind === 'string' ? /^f\d+: (t\d+|null) ↔ (t\d+|null)$/.exec(pairText.value) : null;
        expect(match).not.toBeNull();
        const aId = match![1] === 'null' ? null : match![1]!;
        const bId = match![2] === 'null' ? null : match![2]!;
        expect(aId).toBe(active.nodeId);
        if (aId !== null) expect(nodes.has(aId)).toBe(true);
        if (bId !== null) expect(nodes.has(bId)).toBe(true);
        if (snapshot.stepId === 'return-both-null') expect([aId, bId]).toEqual([null, null]);
        if (snapshot.stepId === 'return-one-null') expect((aId === null) !== (bId === null)).toBe(true);
        if (snapshot.stepId === 'return-values-differ') expect(nodes.get(aId!)!.value).not.toBe(nodes.get(bId!)!.value);
        if (snapshot.stepId === 'call-outer-pair' || snapshot.stepId === 'call-inner-pair') {
          const a = nodes.get(aId!)!; const b = nodes.get(bId!)!;
          expect(a.value).toBe(b.value);
          const expectedA = snapshot.stepId === 'call-outer-pair' ? a.leftId : a.rightId;
          const expectedB = snapshot.stepId === 'call-outer-pair' ? b.rightId : b.leftId;
          expect(snapshot.explanation).toContain(`${expectedA ?? 'null'}`);
          expect(snapshot.explanation).toContain(`${expectedB ?? 'null'}`);
          expect(active.phase).toBe(snapshot.stepId === 'call-outer-pair' ? 'await-left' : 'await-right');
          const next = trace.snapshots[index + 1];
          expect(next?.stepId).toBe('enter-pair');
          expect(next?.variables.find(v => v.name === 'a')?.value).toEqual({ kind: 'reference', objectId: expectedA });
          expect(next?.variables.find(v => v.name === 'b')?.value).toEqual({ kind: 'reference', objectId: expectedB });
        }
      }
      if (input.id === 'mirror-sparse') expect(seen).toContain('call-inner-pair');
      if (input.id === 'same-values-wrong-shape') expect(seen).toContain('return-one-null');
      if (input.id === 'empty-tree') expect(seen).toContain('return-empty-root');
    }
  });

  it('derives input-specific prediction answers and freezes every restored state', async () => {
    const raw = { root: [1, 2, 2, null, 3, 3, null] };
    const trace = await buildReferenceTrace(raw, 'dynamic');
    expect(trace).toEqual(await buildReferenceTrace({ root: [1, 2, 2, null, 3, 3, null] }, 'dynamic'));
    expect(trace.inputHash).toBe(createHash('sha256').update('{"root":[1,2,2,null,3,3,null]}').digest('hex'));
    expect(checkpoints(trace).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'both-nodes' }, { kind: 'choice', optionId: 'true' },
    ]);
    const wrong = await buildReferenceTrace({ root: [1, 2, 2, null, 3, null, 3] }, 'wrong');
    expect(checkpoints(wrong).at(-1)?.answer).toEqual({ kind: 'choice', optionId: 'false' });
    const empty = await buildReferenceTrace({ root: [] }, 'empty');
    expect(checkpoints(empty).map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'has-null' }, { kind: 'choice', optionId: 'true' },
    ]);
    const before = JSON.stringify(trace.snapshots[2]);
    raw.root[0] = 99;
    expect(treeOf(trace.initialState).nodes[0]?.value).toBe(1);
    expect(JSON.stringify(trace.snapshots[2])).toBe(before);
    const checkFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(checkFrozen); }
    };
    checkFrozen(trace);
  });

  it('does not reveal child references before Java evaluates root.left and root.right', async () => {
    const empty = await buildReferenceTrace({ root: [] }, 'empty-timing');
    const check = empty.snapshots.find(snapshot => snapshot.stepId === 'check-root')!;
    expect(check.variables.map(variable => variable.name)).toEqual(['root']);
    expect(empty.snapshots.map(snapshot => snapshot.stepId)).toEqual(['check-root', 'return-empty-root']);
    expect(empty.snapshots.every(snapshot => !snapshot.variables.some(variable => variable.name.startsWith('首对')))).toBe(true);
    expect(checkpoints(empty)).toHaveLength(2);
    const nonEmpty = await buildReferenceTrace({ root: [1, 2, 2] }, 'nonempty-timing');
    expect(nonEmpty.snapshots[0]?.variables.map(variable => variable.name)).toEqual(['root']);
    const call = nonEmpty.snapshots.find(snapshot => snapshot.stepId === 'call-root-pair')!;
    expect(call.variables.find(variable => variable.name === '首对左引用')?.value).toEqual({ kind: 'reference', objectId: 't1' });
    expect(call.variables.find(variable => variable.name === '首对右引用')?.value).toEqual({ kind: 'reference', objectId: 't2' });
  });

  it('rejects inputs exceeding the smaller reference visualization limit without changing real judge limits', async () => {
    await expect(buildReferenceTrace({ root: Array(31).fill(1) as number[] }, 'too-many')).rejects.toThrow('30');
    const deep: (number | null)[] = [1];
    for (let value = 2; value <= 9; value++) deep.push(null, 1);
    await expect(buildReferenceTrace({ root: deep }, 'too-deep')).rejects.toThrow('深度最多 8');
  });
});
