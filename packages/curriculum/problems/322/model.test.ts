import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CoinChangeInputSchema, ReferenceTraceSchema, stableJson, type CoinChangeInput, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { demoInputs } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function dpAt(state: State) { return state.structures.find(structure => structure.kind === 'dp'); }

// Enumerate counts per denomination. This neither uses amount DP nor the judge's BFS.
function enumerate(coins: readonly number[], amount: number): number {
  let best = Infinity;
  const visit = (index: number, remaining: number, used: number): void => {
    if (remaining === 0) { best = Math.min(best, used); return; }
    if (index === coins.length || used >= best) return;
    for (let count = 0; count <= Math.floor(remaining / coins[index]!); count++) visit(index + 1, remaining - count * coins[index]!, used + count);
  };
  visit(0, amount, 0);
  return best;
}

function verifyInvariants(trace: ReferenceTrace, input: CoinChangeInput) {
  const { coins, amount } = input;
  const sentinel = amount + 1;
  const optimal = Array.from({ length: amount + 1 }, (_, value) => Math.min(sentinel, enumerate(coins, value)));
  expect(dpAt(trace.initialState)).toBeUndefined();
  expect(intAt(trace.initialState, 'unreachable')).toBeUndefined();
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    expect(intAt(snapshot, 'unreachable')).toBe(sentinel);
    const dp = dpAt(snapshot);
    if (snapshot.stepId === 'init-sentinel') { expect(dp).toBeUndefined(); continue; }
    if (!dp) throw new Error('Missing allocated dp');
    expect(dp.values).toHaveLength(amount);
    expect(dp.values.every(value => value !== null)).toBe(true);
    if (snapshot.stepId === 'allocate-dp' || snapshot.stepId === 'fill-dp') {
      const fill = snapshot.stepId === 'allocate-dp' ? 0 : sentinel;
      expect(intAt(snapshot, 'dp[0]')).toBe(fill);
      expect(dp.values).toEqual(Array.from({ length: amount }, () => fill));
      expect(intAt(snapshot, '已完成金额（教学标记）')).toBeUndefined();
      continue;
    }
    expect(intAt(snapshot, 'dp[0]')).toBe(0);
    const known = intAt(snapshot, '已完成金额（教学标记）')!;
    const processed = intAt(snapshot, '已检查面值数量（教学标记）')!;
    const current = intAt(snapshot, 'value');
    for (let value = 1; value <= amount; value++) {
      let expected = sentinel;
      if (value <= known) expected = optimal[value]!;
      else if (current === value) {
        for (const coin of coins.slice(0, processed)) if (coin <= value) expected = Math.min(expected, optimal[value - coin]! + 1);
      }
      expect(dp.values[value - 1], `${snapshot.snapshotId}, dp[${value}]`).toBe(expected);
    }
    const j = intAt(snapshot, 'j');
    const coin = intAt(snapshot, 'coin');
    if (snapshot.stepId === 'check-value' || snapshot.stepId === 'return-count' || snapshot.stepId === 'set-zero') {
      expect(j).toBeUndefined(); expect(coin).toBeUndefined();
    } else if (snapshot.stepId === 'check-coin') {
      expect(coin).toBeUndefined(); expect(j).toBeGreaterThanOrEqual(0); expect(j).toBeLessThanOrEqual(coins.length);
    } else {
      expect(coin).toBe(coins[j!]);
      if (snapshot.stepId === 'check-fit' || snapshot.stepId === 'update-dp') {
        expect(snapshot.variables.find(variable => variable.name === 'coin <= value')!.value).toEqual({ kind: 'boolean', value: coin! <= current! });
      }
      if (snapshot.stepId === 'update-dp') expect(coin!).toBeLessThanOrEqual(current!);
    }
    expect(dp.activeIndex).toBe(current !== undefined && current <= amount ? current - 1 : null);
  }
  expect(trace.finalOutput).toEqual({ kind: 'int', value: optimal[amount] === sentinel ? -1 : optimal[amount] });
}

describe('322 immutable amount DP model', () => {
  it('validates contract, exact hashes and all intermediate partial minima', async () => {
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
      expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(demo.input)).digest('hex'));
      verifyInvariants(trace, demo.input);
    }
    let seed = 3222026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 72; sample++) {
      const input = { coins: Array.from({ length: 1 + random() % 3 }, () => 1 + random() % 7), amount: random() % 12 };
      verifyInvariants(await buildReferenceTrace(input, `random-${sample}`), input);
    }
    const huge = { coins: [2147483647, 2], amount: 4 };
    verifyInvariants(await buildReferenceTrace(huge, 'huge-coin'), huge);
  });

  it('enforces display bounds with the largest legal snapshot count and non-null sentinel cells', async () => {
    const input = { coins: Array.from({ length: 12 }, () => 1), amount: 30 };
    const trace = await buildReferenceTrace(input, 'maximum-display');
    expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
    expect(trace.finalOutput).toEqual({ kind: 'int', value: 30 });
    for (const snapshot of [trace.initialState, ...trace.snapshots]) {
      for (const structure of snapshot.structures) {
        if (structure.kind === 'array' || structure.kind === 'dp') expect(structure.values.length).toBeLessThanOrEqual(30);
      }
      expect(dpAt(snapshot)?.values.every(value => value !== null) ?? true).toBe(true);
    }
    expect(CoinChangeInputSchema.parse({ coins: [1], amount: 10000 }).amount).toBe(10000);
    await expect(buildReferenceTrace({ coins: [1], amount: 31 }, 'large')).rejects.toThrow(/30.*10000/);
    for (const invalid of [{ coins: [], amount: 1 }, { coins: [0], amount: 1 }, { coins: [1], amount: -1 }, { coins: [1], amount: 10001 }, { coins: Array.from({ length: 13 }, () => 1), amount: 1 }]) {
      await expect(buildReferenceTrace(invalid, 'invalid')).rejects.toThrow();
    }
    await expect(buildReferenceTrace({ coins: [1], amount: 0 }, ' ')).rejects.toThrow();
  });

  it('keeps two input-dependent predictions even when the amount loop does not run', async () => {
    for (const [input, expected] of [
      [{ coins: [1, 3, 4], amount: 6 }, [7, 2]],
      [{ coins: [2, 4], amount: 7 }, [8, -1]],
      [{ coins: [2], amount: 0 }, [1, 0]],
    ] as const) {
      const trace = await buildReferenceTrace({ coins: [...input.coins], amount: input.amount }, `pred-${input.amount}`);
      const checks = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(new Set(checks.map(check => check.checkpointId)).size).toBe(2);
      expect(checks.map(check => check.answer)).toEqual(expected.map(value => ({ kind: 'int', value })));
      expect(predictionAt(trace, -1)).toBeNull(); expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
    }
  });

  it('restores initialization and candidate updates without aliasing past snapshots', async () => {
    const input = { coins: [1, 3, 4], amount: 6 };
    const trace = await buildReferenceTrace(input, 'restore');
    expect(await buildReferenceTrace(input, 'restore')).toEqual(trace);
    const updates = trace.snapshots.filter(snapshot => snapshot.stepId === 'update-dp' && intAt(snapshot, 'value') === 6);
    expect(updates.map(snapshot => dpAt(snapshot)!.values[5])).toEqual([3, 2, 2]);
    const before = updates.map(snapshot => JSON.stringify(snapshot));
    expect([...updates].reverse().map(snapshot => JSON.stringify(snapshot))).toEqual([...before].reverse());
    expect(Reflect.set(dpAt(updates[0]!)!.values, 5, 999)).toBe(false);
    const frozen = (value: unknown): void => {
      if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); }
    };
    frozen(trace);
    input.coins[0] = 9;
    const array = trace.initialState.structures[0];
    expect(array?.kind === 'array' ? array.values : []).toEqual([1, 3, 4]);
    const other = await buildReferenceTrace(input, 'changed');
    expect(other.inputHash).not.toBe(trace.inputHash);
    const oldChecks = new Set(trace.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []));
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && oldChecks.has(snapshot.checkpointId))).toBe(false);
  });
});
