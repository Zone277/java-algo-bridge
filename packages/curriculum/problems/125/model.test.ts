import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, ValidPalindromeInputSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { lesson125 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const numberAt = (state: State, name: string): number | undefined => {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const booleanAt = (state: State, name: string): boolean | undefined => {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
};
const filtered = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function verifyIntermediateStates(trace: ReferenceTrace, s: string): void {
  let previousLeft = 0;
  let previousRight = s.length - 1;
  expect(trace.initialState.structures[0]).toEqual({ kind: 'window', id: 'source-string', text: s, left: 0, rightExclusive: s.length, members: [] });
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapped, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
    const left = numberAt(snapshot, 'left');
    const right = numberAt(snapshot, 'right');
    if (left !== undefined && right !== undefined) {
      expect(left).toBeGreaterThanOrEqual(previousLeft);
      expect(right).toBeLessThanOrEqual(previousRight);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThan(s.length);
      expect(left).toBeLessThanOrEqual(right + 1);
      expect(snapshot.structures[0]).toEqual({ kind: 'window', id: 'source-string', text: s, left, rightExclusive: right + 1, members: [] });
      previousLeft = left;
      previousRight = right;
    }
    if (snapshot.stepId === 'skip-left') expect(/[^A-Za-z0-9]/.test(s.charAt(left! - 1))).toBe(true);
    if (snapshot.stepId === 'skip-right') expect(/[^A-Za-z0-9]/.test(s.charAt(right! + 1))).toBe(true);
    if (snapshot.stepId === 'compare') {
      expect(/[A-Za-z0-9]/.test(s.charAt(left!))).toBe(true);
      expect(/[A-Za-z0-9]/.test(s.charAt(right!))).toBe(true);
      expect(booleanAt(snapshot, '有效字符相同')).toBe(s.charAt(left!).toLowerCase() === s.charAt(right!).toLowerCase());
    }
    if (snapshot.stepId === 'advance-right') {
      const before = filtered(s.slice(0, left!));
      const after = filtered(s.slice(right! + 1));
      expect(before).toBe(after.split('').reverse().join(''));
    }
    if (snapshot.stepId === 'return-false') expect(booleanAt(snapshot, '返回值')).toBe(false);
    if (snapshot.stepId === 'return-true') expect(booleanAt(snapshot, '返回值')).toBe(true);
  }
}

describe('125 immutable two-pointer reference model', () => {
  it('matches every published display-sized oracle and verifies intermediate reference states', async () => {
    for (const item of lesson125.testSuite.cases) {
      if (item.input.s.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow(/30/);
        continue;
      }
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace), item.id).toEqual(trace);
      expect(trace.finalOutput, item.id).toEqual(expectedOutput('125', item.input));
      verifyIntermediateStates(trace, item.input.s);
    }
  });

  it('derives three input-specific predictions including no comparable characters', async () => {
    const answers = async (s: string) => {
      const trace = await buildReferenceTrace({ s }, 'prediction');
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers('A,b,a!')).toEqual([
      { kind: 'int', value: 5 }, { kind: 'choice', optionId: 'same' }, { kind: 'choice', optionId: 'palindrome' },
    ]);
    expect(await answers('1a2')).toEqual([
      { kind: 'int', value: 2 }, { kind: 'choice', optionId: 'different' }, { kind: 'choice', optionId: 'different' },
    ]);
    expect(await answers(' . ')).toEqual([
      { kind: 'int', value: 2 }, { kind: 'choice', optionId: 'none' }, { kind: 'choice', optionId: 'palindrome' },
    ]);
    const one = await buildReferenceTrace({ s: 'Z' }, 'bounds');
    expect(predictionAt(one, -1)).toBeNull();
    expect(predictionAt(one, one.snapshots.length)).toBeNull();
  });

  it('handles deterministic varied small ASCII inputs and rejects truncation', async () => {
    let seed = 1252026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const alphabet = 'aAbB12!? ,';
    for (let trial = 0; trial < 80; trial++) {
      const length = 1 + random() % 30;
      const s = Array.from({ length }, () => alphabet[random() % alphabet.length]).join('');
      const trace = await buildReferenceTrace({ s }, `random-${trial}`);
      expect(trace.finalOutput, JSON.stringify(s)).toEqual(expectedOutput('125', { s }));
      verifyIntermediateStates(trace, s);
    }
    await expect(buildReferenceTrace({ s: 'a'.repeat(31) }, 'too-long')).rejects.toThrow(/30/);
  });

  it('freezes snapshots, hashes exact source/input and isolates caller edits', async () => {
    const input = { s: 'A,b,a!' };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.s = '1a2';
    expect(trace.initialState.structures[0]?.kind === 'window' ? trace.initialState.structures[0].text : null).toBe('A,b,a!');
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'rewritten')).toBe(false);
    expect((await buildReferenceTrace({ s: '1a2' }, 'other')).inputHash).not.toBe(trace.inputHash);
  });

  it('preserves independent runner and reference input bounds', async () => {
    expect(ValidPalindromeInputSchema.safeParse({ s: 'a'.repeat(10000) }).success).toBe(true);
    await expect(buildReferenceTrace({ s: 'a'.repeat(10000) }, 'runner-only')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ s: '' }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: 'é' }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: 'a' }, '')).rejects.toThrow(/标识/);
  });
});
