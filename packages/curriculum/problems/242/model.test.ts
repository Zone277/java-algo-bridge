import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ReferenceTraceSchema, ValidAnagramInputSchema, expectedOutput, stableJson,
  type ReferenceTrace, type ValidAnagramInput,
} from '@jab/contracts';
import { lesson242 } from './content.js';
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

function countsAt(state: State): readonly number[] | undefined {
  const value = state.structures.find(structure => structure.id === 'count');
  if (value === undefined) return undefined;
  if (value.kind !== 'array') throw new Error('count must be an array');
  return value.values;
}

function prefixDifference(input: ValidAnagramInput, sLength: number, tLength: number): number[] {
  const expected = Array<number>(26).fill(0);
  for (let pos = 0; pos < sLength; pos++) expected[input.s.charCodeAt(pos) - 97]!++;
  for (let pos = 0; pos < tLength; pos++) expected[input.t.charCodeAt(pos) - 97]!--;
  return expected;
}

function verifyIntermediateStates(trace: ReferenceTrace, input: ValidAnagramInput): void {
  expect(countsAt(trace.initialState)).toBeUndefined();
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapped, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
    const values = countsAt(snapshot);
    const i = intAt(snapshot, 'i');
    switch (snapshot.stepId) {
      case 'check-length':
        expect(values).toBeUndefined();
        expect(boolAt(snapshot, '长度相同')).toBe(input.s.length === input.t.length);
        break;
      case 'return-length-false':
        expect(values).toBeUndefined();
        expect(boolAt(snapshot, '返回值')).toBe(false);
        break;
      case 'init-count':
        expect(values).toEqual(Array(26).fill(0));
        break;
      case 'loop-index':
        expect(i).toBeDefined();
        expect(values).toEqual(prefixDifference(input, i!, i!));
        break;
      case 'increase-s':
        expect(i).toBeDefined();
        expect(values).toEqual(prefixDifference(input, i! + 1, i!));
        break;
      case 'decrease-t':
        expect(i).toBeDefined();
        expect(values).toEqual(prefixDifference(input, i! + 1, i! + 1));
        break;
      case 'loop-letter':
      case 'check-count':
      case 'return-mismatch':
      case 'return-true':
        expect(i).toBeUndefined();
        expect(values).toEqual(prefixDifference(input, input.s.length, input.t.length));
        if (snapshot.stepId === 'check-count') {
          const letter = intAt(snapshot, 'letter')!;
          expect(boolAt(snapshot, '当前槽非零')).toBe(values![letter] !== 0);
        }
        if (snapshot.stepId === 'return-mismatch') expect(boolAt(snapshot, '返回值')).toBe(false);
        if (snapshot.stepId === 'return-true') {
          expect(boolAt(snapshot, '返回值')).toBe(true);
          expect(values!.every(value => value === 0)).toBe(true);
        }
        break;
      default:
        throw new Error(`Unverified step ${snapshot.stepId}`);
    }
  }
}

describe('242 immutable frequency-count reference model', () => {
  it('matches all display-sized published oracles and checks every intermediate prefix invariant', async () => {
    for (const item of lesson242.testSuite.cases) {
      if (item.input.s.length > 30 || item.input.t.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow(/30/);
        continue;
      }
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace), item.id).toEqual(trace);
      expect(trace.finalOutput, item.id).toEqual(expectedOutput('242', item.input));
      verifyIntermediateStates(trace, item.input);
    }
  });

  it('derives input-specific length, first-pair and result predictions', async () => {
    const answers = async (input: ValidAnagramInput) => {
      const trace = await buildReferenceTrace(input, 'prediction');
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ s: 'aab', t: 'aba' })).toEqual([
      { kind: 'choice', optionId: 'same' }, { kind: 'int', value: 0 }, { kind: 'choice', optionId: 'anagram' },
    ]);
    expect(await answers({ s: 'ab', t: 'ba' })).toEqual([
      { kind: 'choice', optionId: 'same' }, { kind: 'int', value: 1 }, { kind: 'choice', optionId: 'anagram' },
    ]);
    expect(await answers({ s: 'aab', t: 'abb' })).toEqual([
      { kind: 'choice', optionId: 'same' }, { kind: 'int', value: 0 }, { kind: 'choice', optionId: 'different' },
    ]);
    expect(await answers({ s: 'ab', t: 'abc' })).toEqual([
      { kind: 'choice', optionId: 'different' }, { kind: 'choice', optionId: 'different' },
    ]);
    const trace = await buildReferenceTrace({ s: 'a', t: 'a' }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('handles deterministic varied small inputs, including repeated letters and unequal lengths', async () => {
    let seed = 2422026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const alphabet = 'abcdz';
    for (let trial = 0; trial < 80; trial++) {
      const sLength = 1 + random() % 12;
      const tLength = 1 + random() % 12;
      const make = (length: number) => Array.from({ length }, () => alphabet[random() % alphabet.length]).join('');
      const input = { s: make(sLength), t: make(tLength) };
      const trace = await buildReferenceTrace(input, `random-${trial}`);
      expect(trace.finalOutput, JSON.stringify(input)).toEqual(expectedOutput('242', input));
      verifyIntermediateStates(trace, input);
    }
  });

  it('freezes snapshots, uses canonical hashes and isolates later caller edits', async () => {
    const input = { s: 'ab', t: 'ba' };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.s = 'zz';
    expect(trace.initialState.variables.find(variable => variable.name === 's（显示文本）')?.value).toEqual({ kind: 'string', value: 'ab' });
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'rewritten')).toBe(false);
    const other = await buildReferenceTrace({ s: 'zz', t: 'zz' }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
  });

  it('rejects invalid and over-30 display inputs without reducing the 10000-character runner contract', async () => {
    expect(ValidAnagramInputSchema.safeParse({ s: 'a'.repeat(10000), t: 'a' }).success).toBe(true);
    await expect(buildReferenceTrace({ s: 'a'.repeat(31), t: 'a'.repeat(31) }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ s: 'a', t: 'a'.repeat(31) }, 'too-long-t')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ s: 'a', t: 'A' }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: 'a', t: 'a' }, '')).rejects.toThrow(/标识/);
  });
});
