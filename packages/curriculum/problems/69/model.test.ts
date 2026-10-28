import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson69 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Snapshot = ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function boolAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}
function assertDeepFrozen(value: unknown): void {
  if (value && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(assertDeepFrozen);
  }
}
function verifyTrace(trace: ReferenceTrace, x: number): void {
  const root = Math.floor(Math.sqrt(x));
  expect(BigInt(root) * BigInt(root) <= BigInt(x)).toBe(true);
  expect(BigInt(root + 1) * BigInt(root + 1) > BigInt(x)).toBe(true);
  expect(trace.finalOutput).toEqual({ kind: 'int', value: root });
  expect(trace.finalOutput).toEqual(expectedOutput('69', { x }));
  expect(intAt(trace.initialState, 'x')).toBe(x);
  expect(trace.initialState.structures).toEqual([]);
  expect(trace.snapshots.length).toBeLessThanOrEqual(2000);

  let previous: Snapshot | undefined;
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(snapshot.codeRange, snapshot.stepId).toEqual({ startLine: mapped?.startLine, endLine: mapped?.endLine });
    expect(intAt(snapshot, 'x')).toBe(x);
    const left = intAt(snapshot, 'left');
    const right = intAt(snapshot, 'right');
    const answer = intAt(snapshot, 'answer');
    const mid = intAt(snapshot, 'mid');
    const quotient = intAt(snapshot, 'x / mid（表达式）');
    const bounds = snapshot.structures.find(item => item.id === 'numeric-interval');
    if (bounds !== undefined) {
      expect(bounds.kind).toBe('map');
      if (bounds.kind === 'map') {
        const numbers = Object.fromEntries(bounds.entries.map(entry => {
          if (entry.key.kind !== 'string' || entry.value.kind !== 'int') throw new Error('Invalid number-bound entry');
          return [entry.key.value, entry.value.value];
        }));
        expect(numbers).toEqual(Object.fromEntries([['left', left], ['right', right], ['answer', answer], ['mid', mid]].filter((pair): pair is [string, number] => pair[1] !== undefined)));
      }
    }
    if (left !== undefined && right !== undefined && answer !== undefined) {
      expect(left).toBeGreaterThanOrEqual(1);
      expect(right).toBeLessThanOrEqual(Math.floor(x / 2));
      expect(answer).toBeGreaterThanOrEqual(1);
      expect(BigInt(answer) * BigInt(answer) <= BigInt(x)).toBe(true);
      // The true answer is still a candidate unless it is already recorded.
      expect(answer === root || (left <= root && root <= right), snapshot.snapshotId).toBe(true);
    }
    if (snapshot.stepId === 'check-small') expect(boolAt(snapshot, 'x < 2（条件表达式）')).toBe(x < 2);
    if (snapshot.stepId === 'return-small') {
      expect(x).toBeLessThan(2);
      expect(intAt(snapshot, '返回值')).toBe(x);
      expect(left).toBeUndefined();
    }
    if (snapshot.stepId === 'check-loop') {
      expect(mid).toBeUndefined();
      expect(quotient).toBeUndefined();
      expect(boolAt(snapshot, 'left <= right（条件表达式）')).toBe(left! <= right!);
    }
    if (snapshot.stepId === 'compute-mid') {
      expect(mid).toBe(left! + Math.floor((right! - left!) / 2));
      expect(mid).toBeGreaterThanOrEqual(left!);
      expect(mid).toBeLessThanOrEqual(right!);
      expect(quotient).toBeUndefined();
    }
    if (snapshot.stepId === 'compare-square') {
      expect(mid).toBeDefined();
      expect(quotient).toBe(Math.floor(x / mid!));
      expect(boolAt(snapshot, 'mid <= x / mid（条件表达式）')).toBe(mid! <= quotient!);
      expect(mid! <= quotient!).toBe(BigInt(mid!) * BigInt(mid!) <= BigInt(x));
    }
    if (snapshot.stepId === 'record-answer') {
      expect(previous?.stepId).toBe('compare-square');
      expect(boolAt(previous!, 'mid <= x / mid（条件表达式）')).toBe(true);
      expect(answer).toBe(mid);
    }
    if (snapshot.stepId === 'move-left') {
      expect(previous?.stepId).toBe('record-answer');
      expect(left).toBe(mid! + 1);
      expect(right).toBe(intAt(previous!, 'right'));
    }
    if (snapshot.stepId === 'move-right') {
      expect(previous?.stepId).toBe('compare-square');
      expect(boolAt(previous!, 'mid <= x / mid（条件表达式）')).toBe(false);
      expect(right).toBe(mid! - 1);
      expect(left).toBe(intAt(previous!, 'left'));
    }
    if (snapshot.stepId.startsWith('return-')) expect(intAt(snapshot, '返回值')).toBe(root);
    previous = snapshot;
  }
}

describe('69 immutable integer-square-root reference model', () => {
  it('validates schema, content hashes, input isolation, boundaries and frozen snapshots', async () => {
    const input = { x: 8 };
    const trace = await buildReferenceTrace(input, 'eight');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.mode).toBe('reference-model');
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    assertDeepFrozen(trace);
    input.x = 16;
    expect(intAt(trace.initialState, 'x')).toBe(8);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'changed')).toBe(false);
    await expect(buildReferenceTrace({ x: -1 }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ x: 8 }, '')).rejects.toThrow();
    for (const x of [0, 1, 2147395599, 2147395600, 2147483647]) verifyTrace(await buildReferenceTrace({ x }, `edge-${x}`), x);
  });

  it('checks intermediate interval and comparison invariants across published and seeded inputs', async () => {
    const values = new Set<number>([...lesson69.testSuite.cases.map(item => item.input.x), ...demoInputs.map(item => item.input.x)]);
    for (let x = 0; x <= 128; x++) values.add(x);
    let seed = 0x69b1a5d;
    for (let i = 0; i < 160; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      values.add(seed % 2147483648);
    }
    for (const x of values) verifyTrace(await buildReferenceTrace({ x }, `seed-${x}`), x);
  });

  it('generates input-specific predictions, including both zero and one early-return paths', async () => {
    const answers = async (x: number) => {
      const trace = await buildReferenceTrace({ x }, `prediction-${x}`);
      return { trace, predictions: trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []) };
    };
    expect((await answers(8)).predictions.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'continue' }, { kind: 'int', value: 2 }, { kind: 'int', value: 2 },
    ]);
    expect((await answers(0)).predictions.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'return' }, { kind: 'int', value: 0 },
    ]);
    expect((await answers(1)).predictions.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'return' }, { kind: 'int', value: 1 },
    ]);
    const eight = await answers(8);
    const sixteen = await answers(16);
    expect(eight.trace.inputHash).not.toBe(sixteen.trace.inputHash);
    expect(eight.predictions[0]?.checkpointId).not.toBe(sixteen.predictions[0]?.checkpointId);
    expect(predictionAt(eight.trace, -1)).toBeNull();
    expect(predictionAt(eight.trace, 999)).toBeNull();
    expect(eight.predictions.every(item => item.explanation.length > 0)).toBe(true);
  });
});
