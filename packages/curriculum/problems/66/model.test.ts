import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PlusOneInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function digitsAt(state: State): readonly number[] {
  const array = state.structures.find(structure => structure.id === 'digits');
  if (array?.kind !== 'array') throw new Error('Missing original digits array');
  return array.values;
}

function grownAt(state: State): readonly number[] | undefined {
  const array = state.structures.find(structure => structure.id === 'grown');
  if (array === undefined) return undefined;
  if (array.kind !== 'array') throw new Error('grown must be a separate array');
  return array.values;
}

function iAt(state: State): number | undefined {
  const value = state.variables.find(variable => variable.name === 'i')?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function verifyEveryStep(trace: ReferenceTrace, original: number[]): void {
  expect(digitsAt(trace.initialState)).toEqual(original);
  expect(trace.initialState.variables.find(variable => variable.name === 'digits')?.value).toEqual({ kind: 'reference', objectId: 'digits' });
  expect(grownAt(trace.initialState)).toBeUndefined();
  let processedNines = 0;
  let stopped = false;
  let grew = false;
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    const i = iAt(snapshot);
    const expectedDigits = [...original];
    for (let offset = 0; offset < processedNines; offset++) expectedDigits[original.length - 1 - offset] = 0;
    if (stopped) {
      const position = original.length - 1 - processedNines;
      expectedDigits[position] = original[position]! + 1;
    }

    if (snapshot.stepId === 'reset-nine') {
      expect(i).toBe(original.length - 1 - processedNines);
      expect(original[i!]).toBe(9);
      processedNines++;
      expectedDigits[i!] = 0;
    } else if (snapshot.stepId === 'increment-digit') {
      expect(i).toBe(original.length - 1 - processedNines);
      expect(original[i!]).toBeLessThan(9);
      stopped = true;
      expectedDigits[i!] = original[i!]! + 1;
    }
    expect(digitsAt(snapshot)).toEqual(expectedDigits);

    if (snapshot.stepId === 'check-digit' && i === -1) {
      expect(processedNines).toBe(original.length);
      expect(stopped).toBe(false);
    }
    if (snapshot.stepId === 'allocate-grown') {
      expect(processedNines).toBe(original.length);
      expect(grownAt(snapshot)).toEqual(Array(original.length + 1).fill(0));
      expect(snapshot.variables.find(variable => variable.name === 'grown')?.value).toEqual({ kind: 'reference', objectId: 'grown' });
      grew = true;
    }
    if (snapshot.stepId === 'set-leading' || snapshot.stepId === 'return-grown') {
      expect(grownAt(snapshot)).toEqual([1, ...Array(original.length).fill(0)]);
      expect(grew).toBe(true);
    }
    if (!grew) expect(grownAt(snapshot)).toBeUndefined();
  }
  const decimal = BigInt(original.join('')) + 1n;
  const independentDigits = [...String(decimal)].map(Number);
  expect(trace.finalOutput).toEqual({ kind: 'int-array', values: independentDigits });
  expect(trace.finalOutput).toEqual(expectedOutput('66', { digits: original }));
  expect(grew).toBe(original.every(digit => digit === 9));
}

describe('66 immutable decimal-carry reference model', () => {
  it('validates trace hashes, input limits and separate display limit', async () => {
    const input = { digits: [1, 2, 9] };
    const trace = await buildReferenceTrace(input, 'carry');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    await expect(buildReferenceTrace(input, ' ')).rejects.toThrow();
    await expect(buildReferenceTrace({ digits: [] }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ digits: [0, 1] }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ digits: [10] }, 'invalid')).rejects.toThrow();
    verifyEveryStep(await buildReferenceTrace({ digits: Array(30).fill(9) }, 'display-upper'), Array(30).fill(9));
    expect(PlusOneInputSchema.parse({ digits: Array(31).fill(9) })).toEqual({ digits: Array(31).fill(9) });
    await expect(buildReferenceTrace({ digits: Array(31).fill(9) }, 'run-only')).rejects.toThrow(/30.*100/);
    expect(PlusOneInputSchema.parse({ digits: Array(100).fill(9) }).digits).toHaveLength(100);
  });

  it('checks every intermediate carry state for boundaries and seeded inputs', async () => {
    const cases = [[0], [1], [8], [9], [1, 2, 3], [1, 2, 9], [1, 9, 9], [9, 9], [9, 0, 9], Array(30).fill(9)];
    for (const digits of cases) verifyEveryStep(await buildReferenceTrace({ digits }, `fixed-${digits.join('')}`), digits);
    let seed = 662026;
    for (let sample = 0; sample < 40; sample++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const length = seed % 12 + 1;
      const digits: number[] = [];
      for (let index = 0; index < length; index++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        digits.push(index === 0 && length > 1 ? seed % 9 + 1 : seed % 10);
      }
      verifyEveryStep(await buildReferenceTrace({ digits }, `seeded-${sample}`), digits);
    }
  });

  it('derives two unique predictions from the current input', async () => {
    const answers = async (digits: number[]) => {
      const trace = await buildReferenceTrace({ digits }, `prediction-${digits.join('')}`);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(prediction => prediction.checkpointId)).size).toBe(2);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
      return predictions;
    };
    expect((await answers([1, 2, 9])).map(item => item.answer)).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 3 }]);
    expect((await answers([9, 9])).map(item => item.answer)).toEqual([{ kind: 'int', value: 0 }, { kind: 'int', value: 3 }]);
    expect((await answers([0])).map(item => item.answer)).toEqual([{ kind: 'int', value: 1 }, { kind: 'int', value: 1 }]);
    expect((await answers([1, 2, 9])).map(item => item.checkpointId)).not.toEqual((await answers([9, 9])).map(item => item.checkpointId));
  });

  it('restores exact before/after states and freezes nested snapshots', async () => {
    const trace = await buildReferenceTrace({ digits: [1, 9, 9] }, 'restore');
    expect(trace).toEqual(await buildReferenceTrace({ digits: [1, 9, 9] }, 'restore'));
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'check-nine' && iAt(snapshot) === 1)!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'reset-nine' && iAt(snapshot) === 1)!;
    expect(digitsAt(before)).toEqual([1, 9, 0]);
    expect(digitsAt(after)).toEqual([1, 0, 0]);
    expect([JSON.stringify(after), JSON.stringify(before), JSON.stringify(after)][0]).toBe(JSON.stringify(after));
    expect(Reflect.set(digitsAt(after), 1, 8)).toBe(false);
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
  });
});
