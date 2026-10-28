import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];

function intAt(snapshot: Snapshot, name: string): number | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function positivePrefix(prices: readonly number[], dayExclusive: number): number {
  let sum = 0;
  for (let day = 1; day < Math.min(prices.length, dayExclusive); day++) {
    sum += Math.max(0, prices[day]! - prices[day - 1]!);
  }
  return sum;
}

function verifyMiddleStates(trace: ReferenceTrace, prices: readonly number[]) {
  const array = trace.initialState.structures.find(item => item.kind === 'array');
  expect(array?.kind === 'array' && array.values).toEqual(prices);
  expect(trace.initialState.variables.some(variable => variable.name === 'profit')).toBe(false);
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    const structure = snapshot.structures.find(item => item.kind === 'array');
    expect(structure?.kind === 'array' && structure.values).toEqual(prices);
    const day = intAt(snapshot, 'day');
    const profit = intAt(snapshot, 'profit');
    if (snapshot.stepId === 'init-profit') expect(profit).toBe(0);
    if (snapshot.stepId === 'check-day') {
      expect(day).toBeDefined();
      expect(profit).toBe(positivePrefix(prices, day!));
      expect(intAt(snapshot, 'gain')).toBeUndefined();
      const condition = snapshot.variables.find(variable => variable.name === 'day < prices.length（表达式）')?.value;
      expect(condition).toEqual({ kind: 'boolean', value: day! < prices.length });
    }
    if (['compute-gain', 'check-positive', 'add-gain'].includes(snapshot.stepId)) {
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThan(prices.length);
      const gain = prices[day!]! - prices[day! - 1]!;
      expect(intAt(snapshot, 'gain')).toBe(gain);
      expect(profit).toBe(positivePrefix(prices, snapshot.stepId === 'add-gain' ? day! + 1 : day!));
      if (snapshot.stepId === 'check-positive') {
        expect(snapshot.variables.find(variable => variable.name === 'gain > 0（表达式）')?.value).toEqual({ kind: 'boolean', value: gain > 0 });
      }
      if (snapshot.stepId === 'add-gain') expect(gain).toBeGreaterThan(0);
    }
    if (snapshot.stepId === 'return-profit') {
      expect(day).toBeUndefined();
      expect(profit).toBe(positivePrefix(prices, prices.length));
    }
  }
  expect(trace.finalOutput).toEqual(expectedOutput('122', { prices: [...prices] }));
}

describe('122 immutable positive-delta reference model', () => {
  it('checks strict input, display limit, hashes, and schema', async () => {
    const input = { prices: [7, 1, 5, 3, 6, 4] };
    const trace = await buildReferenceTrace(input, 'wave-market');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace({ prices: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: [-1] }, 'negative')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: [10001] }, 'price-limit')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: Array(31).fill(1) }, 'display-limit')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('maintains prefix-profit invariant across adversarial and fixed-seed prices', async () => {
    const examples = [
      [5], [1, 5], [5, 1], [7, 1, 5, 3, 6, 4], [1, 2, 3, 4, 5], [7, 6, 4, 3, 1],
      [4, 4, 4], [1, 1, 3, 3, 2, 2, 4], [1, 3, 2, 5], [3, 2, 6, 1, 7], [2, 8, 1, 4],
    ];
    let seed = 1222026;
    for (let i = 0; i < 60; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const length = 1 + seed % 12;
      const prices: number[] = [];
      for (let day = 0; day < length; day++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        prices.push(seed % 21);
      }
      examples.push(prices);
    }
    for (const prices of examples) {
      verifyMiddleStates(await buildReferenceTrace({ prices }, `case-${prices.join('-')}`), prices);
    }
  });

  it('generates input-specific predictions, including single-day and falling cases', async () => {
    const answers = async (prices: number[]) => {
      const trace = await buildReferenceTrace({ prices }, `predict-${prices.join('-')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers([7, 1, 5, 3, 6, 4])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: -6 }, { kind: 'int', value: 7 }]);
    expect(await answers([1, 5])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 4 }, { kind: 'int', value: 4 }]);
    expect(await answers([5])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 0 }]);
    expect(await answers([7, 6, 4, 3, 1])).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: -1 }, { kind: 'int', value: 0 }]);
  });

  it('freezes every state and leaves prior snapshots unchanged when moving forward', async () => {
    const input = { prices: [1, 3, 2, 5] };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ prices: [...input.prices] }, 'history'));
    const dayOne = trace.snapshots.find(s => s.stepId === 'add-gain' && intAt(s, 'day') === 1)!;
    const dayThree = trace.snapshots.find(s => s.stepId === 'add-gain' && intAt(s, 'day') === 3)!;
    expect(intAt(dayOne, 'profit')).toBe(2);
    expect(intAt(dayThree, 'profit')).toBe(5);
    expect(intAt(dayOne, 'profit')).toBe(2);
    const checkFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(checkFrozen);
      }
    };
    checkFrozen(trace);
    expect(Reflect.set(dayOne, 'explanation', 'tampered')).toBe(false);
    input.prices[0] = 9;
    expect(trace.initialState.structures.find(s => s.kind === 'array')).toMatchObject({ values: [1, 3, 2, 5] });
    const changed = await buildReferenceTrace({ prices: [1, 3, 2, 6] }, 'changed');
    expect(changed.inputHash).not.toBe(trace.inputHash);
  });

  it('returns null outside checkpoints and never exposes an invalid code highlight', async () => {
    const trace = await buildReferenceTrace({ prices: [1, 3, 2, 5] }, 'mapping');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const lines = REFERENCE_SOURCE.split('\n');
    for (const snapshot of trace.snapshots) {
      expect(lines[snapshot.codeRange.startLine - 1]!.trim().length).toBeGreaterThan(0);
      expect(snapshot.codeRange.startLine).toBe(snapshot.codeRange.endLine);
    }
  });
});
