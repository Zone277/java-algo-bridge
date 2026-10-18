import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, stableJson, type ContainerWaterInput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson11 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}
function arrayAt(state: State) {
  const array = state.structures.find(structure => structure.kind === 'array' && structure.id === 'height');
  if (array?.kind !== 'array') throw new Error('height array missing');
  return array;
}
function pairArea(height: readonly number[], left: number, right: number) {
  return (right - left) * Math.min(height[left]!, height[right]!);
}
function enumerateArea(height: readonly number[], left = 0, right = height.length - 1) {
  let best = 0;
  for (let i = left; i <= right; i++) for (let j = i + 1; j <= right; j++) best = Math.max(best, pairArea(height, i, j));
  return best;
}
function discardedMaximum(height: readonly number[], left: number, right: number) {
  let best = 0;
  for (let i = 0; i < height.length; i++) for (let j = i + 1; j < height.length; j++) if (i < left || j > right) best = Math.max(best, pairArea(height, i, j));
  return best;
}

function assertInvariant(trace: ReferenceTrace, height: readonly number[]) {
  const optimum = enumerateArea(height);
  let previous: State = trace.initialState;
  let measuredBest = 0;
  let iterations = 0;
  expect(arrayAt(previous).values).toEqual(height);
  expect(previous.variables.map(variable => variable.name)).toEqual(['height']);
  for (const snapshot of trace.snapshots) {
    const map = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: map.startLine, endLine: map.endLine });
    expect(arrayAt(snapshot).values).toEqual(height);
    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const best = intAt(snapshot, 'best');
    expect(arrayAt(snapshot).indices).toEqual([
      ...(left === undefined ? [] : [{ name: 'left', index: left }]),
      ...(right === undefined ? [] : [{ name: 'right', index: right }]),
    ]);
    if (left !== undefined && right !== undefined) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(right);
      expect(right).toBeLessThan(height.length);
      if (best !== undefined) {
        expect(discardedMaximum(height, left, right), snapshot.snapshotId).toBeLessThanOrEqual(best);
        expect(Math.max(best, enumerateArea(height, left, right)), snapshot.snapshotId).toBe(optimum);
        expect(best).toBeGreaterThanOrEqual(intAt(previous, 'best') ?? 0);
      }
    }
    if (snapshot.stepId === 'check-loop') {
      expect(boolAt(snapshot, 'left < right')).toBe(left! < right!);
      for (const local of ['width', 'shorter', 'area']) expect(intAt(snapshot, local)).toBeUndefined();
      expect(boolAt(snapshot, '本轮 height[left] <= height[right]')).toBeUndefined();
    }
    if (snapshot.stepId === 'compute-width') {
      iterations++;
      expect(intAt(snapshot, 'width')).toBe(right! - left!);
      expect(intAt(snapshot, 'shorter')).toBeUndefined();
      expect(intAt(snapshot, 'area')).toBeUndefined();
    }
    if (snapshot.stepId === 'compute-shorter') expect(intAt(snapshot, 'shorter')).toBe(Math.min(height[left!]!, height[right!]!));
    if (snapshot.stepId === 'compute-area') {
      expect(intAt(snapshot, 'area')).toBe(pairArea(height, left!, right!));
      expect(best).toBe(measuredBest);
    }
    if (snapshot.stepId === 'update-best') {
      measuredBest = Math.max(measuredBest, pairArea(height, left!, right!));
      expect(best).toBe(measuredBest);
    }
    if (snapshot.stepId === 'choose-side') expect(boolAt(snapshot, '本轮 height[left] <= height[right]')).toBe(height[left!]! <= height[right!]!);
    if (snapshot.stepId === 'move-left' || snapshot.stepId === 'move-right') {
      const wasLeft = intAt(previous, 'left')!;
      const wasRight = intAt(previous, 'right')!;
      const shouldMoveLeft = height[wasLeft]! <= height[wasRight]!;
      expect(snapshot.stepId).toBe(shouldMoveLeft ? 'move-left' : 'move-right');
      expect(left).toBe(wasLeft + (shouldMoveLeft ? 1 : 0));
      expect(right).toBe(wasRight - (shouldMoveLeft ? 0 : 1));
      expect(right! - left!).toBe(wasRight - wasLeft - 1);
      for (const local of ['width', 'shorter', 'area']) expect(intAt(snapshot, local)).toBe(intAt(previous, local));
      expect(snapshot.explanation).toContain('移动前配对');
    }
    previous = snapshot;
  }
  expect(iterations).toBe(height.length - 1);
  expect(intAt(trace.snapshots.at(-1)!, '返回值')).toBe(optimum);
  expect(trace.finalOutput).toEqual({ kind: 'int', value: optimum });
}

describe('11 immutable shorter-side reference model', () => {
  it('proves discarded pairs cannot beat best and checks each displayed intermediate value', async () => {
    const smallCases = lesson11.testSuite.cases.filter(item => item.input.height.length <= 30).map(item => item.input);
    for (const [index, input] of [...demoInputs.map(demo => demo.input), ...smallCases].entries()) {
      const trace = await buildReferenceTrace(input, `invariant-${index}`);
      assertInvariant(trace, input.height);
    }
  });

  it('checks the elimination invariant for fixed-seed unsorted inputs with zeros and ties', async () => {
    let seed = 112026;
    const next = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 40; sample++) {
      const height = Array.from({ length: 2 + next() % 19 }, () => next() % 11);
      assertInvariant(await buildReferenceTrace({ height }, `seed-${sample}`), height);
    }
  });

  it('generates two input-specific predictions even for the shortest and zero-height arrays', async () => {
    const answers = async (input: ContainerWaterInput, inputId: string) => {
      const trace = await buildReferenceTrace(input, inputId);
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions.map(prediction => prediction.checkpointId)).toEqual(trace.snapshots.filter(snapshot => snapshot.checkpointId).map(snapshot => snapshot.checkpointId));
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      return predictions.map(prediction => prediction.answer);
    };
    expect(await answers(demoInputs[0]!.input, 'first')).toEqual([{ kind: 'int', value: 10 }, { kind: 'choice', optionId: 'left' }]);
    expect(await answers(demoInputs[1]!.input, 'second')).toEqual([{ kind: 'int', value: 15 }, { kind: 'choice', optionId: 'right' }]);
    expect(await answers(demoInputs[2]!.input, 'equal')).toEqual([{ kind: 'int', value: 4 }, { kind: 'choice', optionId: 'left' }]);
    expect(await answers(demoInputs[3]!.input, 'zero')).toEqual([{ kind: 'int', value: 0 }, { kind: 'choice', optionId: 'left' }]);
    const trace = await buildReferenceTrace(demoInputs[0]!.input, 'static-link');
    expect(trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer)).toEqual(lesson11.predictionChecks.map(check => check.answer));
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('preserves separate immutable pointer states when selecting next and previous snapshots', async () => {
    const input = { height: [2, 6, 4, 1, 5, 3] };
    const trace = await buildReferenceTrace(input, 'restoration');
    const beforeIndex = trace.snapshots.findIndex(snapshot => snapshot.stepId === 'choose-side');
    const afterIndex = beforeIndex + 1;
    const before = trace.snapshots[beforeIndex]!;
    const saved = stableJson(before);
    let selected = trace.snapshots[afterIndex]!;
    expect(selected.stepId).toBe('move-left');
    expect([intAt(selected, 'left'), intAt(selected, 'right')]).toEqual([1, 5]);
    selected = trace.snapshots[beforeIndex]!;
    expect([intAt(selected, 'left'), intAt(selected, 'right')]).toEqual([0, 5]);
    expect(stableJson(selected)).toBe(saved);
    input.height[0] = 100;
    expect(arrayAt(before).values[0]).toBe(2);
    const checkFrozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(checkFrozen); } };
    checkFrozen(trace);
    expect(Reflect.set(arrayAt(before).values, '0', 100)).toBe(false);
    expect(Reflect.set(before, 'explanation', 'changed')).toBe(false);
    expect(arrayAt(trace.snapshots[afterIndex]!)).not.toBe(arrayAt(before));
  });

  it('validates exact source/input hashes, deterministic output and explicit demo limits', async () => {
    const input = demoInputs[0]!.input;
    const trace = await buildReferenceTrace(input, 'hashes');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.mode).toBe('reference-model');
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace).toEqual(await buildReferenceTrace(input, 'hashes'));
    const maximumDemo = await buildReferenceTrace({ height: Array<number>(30).fill(10000) }, 'demo-limit');
    expect(maximumDemo.finalOutput).toEqual({ kind: 'int', value: 290000 });
    expect(maximumDemo.snapshots.length).toBeLessThanOrEqual(2000);
    await expect(buildReferenceTrace({ height: Array<number>(31).fill(1) }, 'oversize')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ height: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ height: [1] }, 'one')).rejects.toThrow();
    await expect(buildReferenceTrace({ height: [-1, 3] }, 'negative')).rejects.toThrow();
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow(/标识/);
  });
});
