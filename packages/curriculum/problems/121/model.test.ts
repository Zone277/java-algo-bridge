import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(snapshot: State, name: string): number | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function boolAt(snapshot: State, name: string): boolean | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function pricesAt(snapshot: State) {
  const structure = snapshot.structures.find(item => item.kind === 'array');
  if (structure?.kind !== 'array') throw new Error('Missing prices array');
  expect(structure.id).toBe('prices');
  return structure;
}

function bestBefore(prices: readonly number[], dayExclusive: number): number {
  let minimum = prices[0]!;
  let best = 0;
  for (let day = 1; day < Math.min(dayExclusive, prices.length); day++) {
    best = Math.max(best, prices[day]! - minimum);
    minimum = Math.min(minimum, prices[day]!);
  }
  return best;
}

function minimumThrough(prices: readonly number[], endInclusive: number): number {
  return Math.min(...prices.slice(0, endInclusive + 1));
}

function verifyInvariants(trace: ReferenceTrace, prices: readonly number[]) {
  expect(pricesAt(trace.initialState).values).toEqual(prices);
  expect(pricesAt(trace.initialState).indices).toEqual([]);

  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    const structure = pricesAt(snapshot);
    expect(structure.values).toEqual(prices);
    const day = intAt(snapshot, 'day');
    const minimum = intAt(snapshot, 'minPrice');
    const minimumDay = intAt(snapshot, '最低价日（演示标记）');
    const best = intAt(snapshot, 'best');

    if (minimum !== undefined && minimumDay !== undefined) {
      expect(prices[minimumDay]).toBe(minimum);
      expect(minimumDay).toBeGreaterThanOrEqual(0);
      expect(minimumDay).toBeLessThan(prices.length);
    }
    if (snapshot.stepId === 'init-min') {
      expect(minimum).toBe(prices[0]);
      expect(minimumDay).toBe(0);
      expect(best).toBeUndefined();
    }
    if (snapshot.stepId === 'init-best') expect(best).toBe(0);

    if (day !== undefined && ['check-day', 'read-today', 'compute-profit', 'update-best'].includes(snapshot.stepId)) {
      expect(minimum).toBe(minimumThrough(prices, Math.max(0, day - 1)));
      expect(minimumDay).toBe(prices.slice(0, Math.max(1, day)).indexOf(minimum!));
    }
    if (snapshot.stepId === 'check-day' && day !== undefined) {
      expect(boolAt(snapshot, 'day < length')).toBe(day < prices.length);
      expect(best).toBe(bestBefore(prices, day));
      expect(intAt(snapshot, 'today')).toBeUndefined();
      expect(intAt(snapshot, 'profit')).toBeUndefined();
    }
    if (['read-today', 'compute-profit', 'update-best', 'update-min'].includes(snapshot.stepId) && day !== undefined) {
      expect(intAt(snapshot, 'today')).toBe(prices[day]);
    }
    if (['compute-profit', 'update-best', 'update-min'].includes(snapshot.stepId) && day !== undefined) {
      expect(intAt(snapshot, 'profit')).toBe(prices[day]! - minimumThrough(prices, day - 1));
    }
    if (snapshot.stepId === 'update-best' && day !== undefined) {
      expect(best).toBe(bestBefore(prices, day + 1));
    }
    if (snapshot.stepId === 'update-min' && day !== undefined) {
      expect(minimum).toBe(minimumThrough(prices, day));
      expect(best).toBe(bestBefore(prices, day + 1));
      expect(minimumDay).toBe(prices.slice(0, day + 1).indexOf(minimum!));
    }
    if (snapshot.stepId === 'return-best') {
      expect(minimum).toBe(Math.min(...prices));
      expect(best).toBe(bestBefore(prices, prices.length));
    }
  }
  expect(trace.finalOutput).toEqual(expectedOutput('121', { prices: [...prices] }));
}

describe('121 immutable one-pass minimum-price reference model', () => {
  it('validates hashes, initial state and input limits', async () => {
    const input = { prices: [7, 1, 5, 3, 6, 4] };
    const trace = await buildReferenceTrace(input, 'classic-market');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.variables.map(variable => variable.name)).toEqual(['prices', 'length', '阶段']);
    await expect(buildReferenceTrace({ prices: [] }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: [-1] }, 'negative')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: [10001] }, 'too-expensive')).rejects.toThrow();
    await expect(buildReferenceTrace({ prices: Array(31).fill(1) as number[] }, 'too-many-demo-days')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('keeps the buy-before-sell invariant and matches expectedOutput across edge shapes', async () => {
    const samples = [
      [5],
      [1, 5],
      [5, 1],
      [7, 1, 5, 3, 6, 4],
      [1, 2, 3, 4, 5],
      [7, 6, 4, 3, 1],
      [4, 4, 4, 4],
      [3, 2, 6, 1, 7],
      [2, 8, 1, 4],
      [1, 3, 2, 5],
      [10000, 0, 10000],
    ];
    for (const prices of samples) verifyInvariants(await buildReferenceTrace({ prices }, `case-${prices.join('_')}`), prices);

    const falling = await buildReferenceTrace({ prices: [7, 6, 4, 3, 1] }, 'falling');
    expect(falling.finalOutput).toEqual({ kind: 'int', value: 0 });
    expect(falling.snapshots.filter(snapshot => snapshot.stepId === 'update-best').every(snapshot => intAt(snapshot, 'best') === 0)).toBe(true);
  });

  it('derives exactly two input-specific predictions, including single-day and falling inputs', async () => {
    const predictions = async (prices: number[]) => {
      const trace = await buildReferenceTrace({ prices }, `prediction-${prices.join('_')}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
    };
    expect((await predictions([7, 1, 5, 3, 6, 4])).map(item => item.answer)).toEqual([
      { kind: 'int', value: 7 },
      { kind: 'int', value: 5 },
    ]);
    expect((await predictions([5])).map(item => item.answer)).toEqual([
      { kind: 'int', value: 5 },
      { kind: 'int', value: 0 },
    ]);
    expect((await predictions([7, 6, 4, 3, 1])).map(item => item.answer)).toEqual([
      { kind: 'int', value: 7 },
      { kind: 'int', value: 0 },
    ]);
  });

  it('is deterministic, deeply frozen, input-isolated and restores prior states exactly', async () => {
    const input = { prices: [7, 1, 5, 3, 6, 4] };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ prices: [...input.prices] }, 'history'));
    const dayOneProfit = trace.snapshots.find(snapshot => snapshot.stepId === 'compute-profit' && intAt(snapshot, 'day') === 1)!;
    const dayOneMinimum = trace.snapshots.find(snapshot => snapshot.stepId === 'update-min' && intAt(snapshot, 'day') === 1)!;
    const dayTwoProfit = trace.snapshots.find(snapshot => snapshot.stepId === 'compute-profit' && intAt(snapshot, 'day') === 2)!;
    expect([intAt(dayOneProfit, 'minPrice'), intAt(dayOneProfit, 'profit')]).toEqual([7, -6]);
    expect(intAt(dayOneMinimum, 'minPrice')).toBe(1);
    expect([intAt(dayTwoProfit, 'minPrice'), intAt(dayTwoProfit, 'profit')]).toEqual([1, 4]);
    expect([intAt(dayOneProfit, 'minPrice'), intAt(dayOneProfit, 'profit')]).toEqual([7, -6]);

    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(dayOneMinimum, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ prices: [7, 1, 5, 3, 7, 4] }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('returns null outside checkpoints and highlights only mapped Java statements', async () => {
    const trace = await buildReferenceTrace({ prices: [7, 1, 5, 3, 6, 4] }, 'mapping');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const lines = REFERENCE_SOURCE.split('\n');
    for (const snapshot of trace.snapshots) {
      const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
      expect(lines[mapped.startLine - 1]!.trim()).not.toBe('');
      expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
    }
  });
});
