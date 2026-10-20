import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, SingleNumberInputSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson136 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string) {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

/** Independent arithmetic per-bit parity oracle: no XOR operator or model update. */
function parityOfPrefix(nums: number[], length: number): number {
  const counts = new Map<number, number>();
  for (const value of nums.slice(0, length)) counts.set(value, (counts.get(value) ?? 0) + 1);
  const oddValues = [...counts].filter(([, count]) => count % 2 === 1).map(([value]) => value < 0 ? value + 2 ** 32 : value);
  let unsigned = 0;
  for (let bit = 0; bit < 32; bit++) {
    const ones = oddValues.reduce((count, value) => count + Math.floor(value / 2 ** bit) % 2, 0);
    unsigned += (ones % 2) * 2 ** bit;
  }
  return unsigned >= 2 ** 31 ? unsigned - 2 ** 32 : unsigned;
}

function verifyStates(trace: ReferenceTrace, nums: number[]) {
  expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
  expect(intAt(trace.initialState, 'result')).toBeUndefined();
  let previousProcessed = 0;
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    const count = intAt(snapshot, 'processed（教学已处理项数）')!;
    expect(count).toBe(previousProcessed + (snapshot.stepId === 'xor-value' ? 1 : 0));
    expect(intAt(snapshot, 'result'), snapshot.snapshotId).toBe(parityOfPrefix(nums, count));
    previousProcessed = count;
    const result = intAt(snapshot, 'result')!;
    const binary = snapshot.variables.find(variable => variable.name === 'result 的 32 位表示（教学）')!.value;
    const unsigned = result < 0 ? result + 2 ** 32 : result;
    expect(binary).toEqual({ kind: 'string', value: unsigned.toString(2).padStart(32, '0') });
    const i = intAt(snapshot, 'i');
    if (snapshot.stepId === 'xor-value') expect(count).toBe(i! + 1);
    else if (i !== undefined) expect(count).toBe(i);
    expect(snapshot.structures).toEqual([{
      kind: 'array', id: 'nums', values: nums,
      indices: i !== undefined && i < nums.length ? [{ name: 'i', index: i }] : [],
    }]);
  }
  expect(previousProcessed).toBe(nums.length);
}

describe('136 immutable prefix-XOR model', () => {
  it('checks every intermediate prefix via independent frequency and bit parity, including negatives', async () => {
    for (const item of lesson136.testSuite.cases) {
      if (item.input.nums.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow(/30/);
      } else {
        const trace = await buildReferenceTrace(item.input, item.id);
        expect(trace.finalOutput).toEqual(item.expected);
        verifyStates(trace, item.input.nums);
      }
    }
  });

  it('derives exactly two predictions from each active input, including a single item', async () => {
    const ids = new Set<string>();
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(predictions.map(item => item.answer)).toEqual([
        { kind: 'int', value: demo.input.nums[0] },
        expectedOutput('136', demo.input),
      ]);
      for (const prediction of predictions) {
        expect(ids.has(prediction.checkpointId)).toBe(false);
        ids.add(prediction.checkpointId);
      }
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
    }
  });

  it('keeps hashes, immutable input copies and backward snapshot restoration stable', async () => {
    const raw = { nums: [6, 3, 6] };
    const trace = await buildReferenceTrace(raw, 'restore');
    expect(trace).toEqual(await buildReferenceTrace(raw, 'restore'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(raw)).digest('hex'));
    const saved = JSON.stringify(trace.snapshots[3]);
    raw.nums[0] = 88;
    for (const snapshot of [...trace.snapshots, ...[...trace.snapshots].reverse()]) {
      expect(snapshot.structures[0]).toMatchObject({ values: [6, 3, 6] });
    }
    expect(JSON.stringify(trace.snapshots[3])).toBe(saved);
    const frozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(frozen);
      }
    };
    frozen(trace);
    expect(Reflect.set(trace.snapshots[3]!, 'explanation', 'mutated')).toBe(false);
  });

  it('checks shuffled paired prefixes and refuses invalid inputs or oversized demonstrations', async () => {
    let seed = 1362026;
    const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let pairs = 0; pairs <= 14; pairs++) {
      const unique = pairs % 2 ? -30000 : 30000;
      const nums = [unique, ...Array.from({ length: pairs }, (_, i) => i - 7).flatMap(value => [value, value])];
      for (let i = nums.length - 1; i > 0; i--) {
        const target = Math.floor(next() * (i + 1));
        [nums[i], nums[target]] = [nums[target]!, nums[i]!];
      }
      const trace = await buildReferenceTrace({ nums }, `seed-${pairs}`);
      expect(trace.finalOutput).toEqual({ kind: 'int', value: unique });
      verifyStates(trace, nums);
    }
    for (const nums of [[], [1, 2], [1, 1], [1, 1, 1], [30001]]) {
      expect(SingleNumberInputSchema.safeParse({ nums }).success).toBe(false);
      await expect(buildReferenceTrace({ nums }, 'invalid')).rejects.toThrow();
    }
    const large = { nums: [100, ...Array.from({ length: 15 }, (_, i) => [i, i]).flat()] };
    expect(SingleNumberInputSchema.safeParse(large).success).toBe(true);
    await expect(buildReferenceTrace(large, 'long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ nums: [1] }, '')).rejects.toThrow(/标识/);
  });
});
