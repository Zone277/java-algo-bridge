import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type ReferenceTrace,
  type RomanToIntegerInput,
} from '@jab/contracts';
import { lesson13 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
const values: Readonly<Record<string, number>> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const intAt = (state: State, name: string) => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const boolAt = (state: State, name: string) => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
};
function prefixTotal(s: string, length: number): number {
  let total = 0;
  for (let index = 0; index < length; index++) {
    const current = values[s[index]!]!;
    const next = index + 1 < s.length ? values[s[index + 1]!]! : undefined;
    total += next !== undefined && current < next ? -current : current;
  }
  return total;
}

function checkIntermediate(trace: ReferenceTrace, input: RomanToIntegerInput): void {
  expect(intAt(trace.initialState, 'total')).toBe(0);
  expect(intAt(trace.initialState, '已处理字符数（教学）')).toBe(0);
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapping, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapping!.startLine, endLine: mapping!.endLine });
    const processed = intAt(snapshot, '已处理字符数（教学）')!;
    expect(processed).toBeGreaterThanOrEqual(0);
    expect(processed).toBeLessThanOrEqual(input.s.length);
    expect(intAt(snapshot, 'total')).toBe(prefixTotal(input.s, processed));

    const window = snapshot.structures.find(item => item.id === 'roman-text');
    expect(window?.kind).toBe('window');
    if (window?.kind === 'window') {
      expect(window.text).toBe(input.s);
      expect(window.left).toBeGreaterThanOrEqual(0);
      expect(window.rightExclusive).toBeLessThanOrEqual(input.s.length);
    }
    if (snapshot.stepId === 'check-subtract') {
      const index = intAt(snapshot, 'i')!;
      const current = values[input.s[index]!]!;
      const next = index + 1 < input.s.length ? values[input.s[index + 1]!]! : undefined;
      expect(processed).toBe(index);
      expect(intAt(snapshot, 'current')).toBe(current);
      expect(intAt(snapshot, 'next')).toBe(next);
      expect(boolAt(snapshot, '本位应减')).toBe(next !== undefined && current < next);
    }
    if (snapshot.stepId === 'subtract-current' || snapshot.stepId === 'add-current') {
      expect(processed).toBe(intAt(snapshot, 'i')! + 1);
      expect(intAt(snapshot, '本位贡献')).toBe(prefixTotal(input.s, processed) - prefixTotal(input.s, processed - 1));
    }
    if (snapshot.stepId === 'return-total') {
      expect(intAt(snapshot, '返回值')).toBe(prefixTotal(input.s, input.s.length));
    }
    expect(Object.isFrozen(snapshot)).toBe(true);
  }
}

function toRoman(raw: number): string {
  const entries: readonly [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let value = raw;
  let result = '';
  for (const [amount, symbol] of entries) while (value >= amount) { result += symbol; value -= amount; }
  return result;
}

describe('13 immutable look-ahead reference model', () => {
  it('matches every published case and checks the prefix-sum invariant', async () => {
    for (const item of lesson13.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput).toEqual(expectedOutput('13', item.input));
      checkIntermediate(trace, item.input);
    }
  });

  it('differential-checks canonical numerals across the whole value range', async () => {
    for (let value = 1; value <= 3999; value += 37) {
      const input = { s: toRoman(value) };
      const trace = await buildReferenceTrace(input, `value-${value}`);
      expect(trace.finalOutput).toEqual({ kind: 'int', value });
      expect(trace.finalOutput).toEqual(expectedOutput('13', input));
      checkIntermediate(trace, input);
    }
  });

  it('binds predictions to each input and deeply freezes reversible snapshots', async () => {
    const answers = async (input: RomanToIntegerInput) => {
      const trace = await buildReferenceTrace(input, 'prediction');
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ s: 'MCMXCIV' })).toEqual([
      { kind: 'choice', optionId: 'subtract' }, { kind: 'int', value: 1994 },
    ]);
    expect(await answers({ s: 'LVIII' })).toEqual([
      { kind: 'choice', optionId: 'add' }, { kind: 'int', value: 58 },
    ]);
    expect(await answers({ s: 'IV' })).toEqual([
      { kind: 'choice', optionId: 'subtract' }, { kind: 'int', value: 4 },
    ]);

    const input = { s: 'MCMXCIV' };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.s = 'I';
    expect(trace.initialState.variables.find(item => item.name === 's（显示文本）')?.value).toEqual({ kind: 'string', value: 'MCMXCIV' });
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'rewritten')).toBe(false);
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });
});
