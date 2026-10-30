import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type RansomNoteInput, type ReferenceTrace } from '@jab/contracts';
import { lesson383 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

const intAt = (state: State, name: string) => {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const boolAt = (state: State, name: string) => {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
};
const countOf = (text: string) => {
  const result = Array<number>(26).fill(0);
  for (const char of text) result[char.charCodeAt(0) - 97]!++;
  return result;
};
const availableAt = (state: State): readonly number[] | undefined => {
  const structure = state.structures.find(item => item.id === 'available');
  return structure?.kind === 'array' ? structure.values : undefined;
};
const shownPrefixLength = (state: State, id: string) => {
  const structure = state.structures.find(item => item.id === id);
  if (structure?.kind !== 'window') throw new Error(`383 missing text window ${id}`);
  return structure.rightExclusive;
};

function checkIntermediate(trace: ReferenceTrace, input: RansomNoteInput): void {
  expect(availableAt(trace.initialState)).toBeUndefined();
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapping, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapping!.startLine, endLine: mapping!.endLine });
    const stock = availableAt(snapshot);
    if (!stock) throw new Error('383 array must exist after first Java statement');
    expect(stock).toHaveLength(26);
    expect(stock.every(value => Number.isInteger(value) && value >= 0)).toBe(true);
    const counted = shownPrefixLength(snapshot, 'magazine 已计数前缀（教学视图）');
    const consumed = shownPrefixLength(snapshot, 'ransomNote 已消耗前缀（教学视图）');
    const phase = snapshot.variables.find(item => item.name === '当前轮次（教学）')?.value;
    if (phase?.kind !== 'string') throw new Error('383 missing phase');
    if (phase.value === '先建库存') {
      expect(consumed).toBe(0);
      expect(stock).toEqual(countOf(input.magazine.slice(0, counted)));
    } else {
      expect(counted).toBe(input.magazine.length);
      const expected = countOf(input.magazine);
      for (const char of input.ransomNote.slice(0, consumed)) expected[char.charCodeAt(0) - 97]!--;
      expect(stock).toEqual(expected);
      if (snapshot.stepId === 'check-available' || snapshot.stepId === 'return-false') {
        const i = intAt(snapshot, 'i')!;
        const slot = input.ransomNote.charCodeAt(i) - 97;
        expect(consumed).toBe(i);
        expect(intAt(snapshot, '字符槽号（表达式）')).toBe(slot);
        expect(intAt(snapshot, '取用前库存（表达式）')).toBe(stock[slot]);
        expect(boolAt(snapshot, '还有字母卡（表达式）')).toBe(stock[slot]! > 0);
      }
      if (snapshot.stepId === 'consume-char') expect(consumed).toBe(intAt(snapshot, 'i')! + 1);
    }
    if (snapshot.stepId === 'return-false') expect(boolAt(snapshot, '返回值')).toBe(false);
    if (snapshot.stepId === 'return-true') expect(boolAt(snapshot, '返回值')).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  }
}

describe('383 immutable consumption model', () => {
  it('matches all published display-size cases and verifies every intermediate inventory', async () => {
    for (const item of lesson383.testSuite.cases) {
      if (item.input.ransomNote.length > 30 || item.input.magazine.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow('30');
        continue;
      }
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput).toEqual(expectedOutput('383', item.input));
      checkIntermediate(trace, item.input);
    }
  });

  it('checks varied short pairs and changes both predictions with the actual input', async () => {
    let seed = 3832026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const alphabet = 'abcz';
    for (let trial = 0; trial < 72; trial++) {
      const make = (length: number) => Array.from({ length }, () => alphabet[random() % alphabet.length]).join('');
      const input = { ransomNote: make(1 + random() % 8), magazine: make(1 + random() % 8) };
      const trace = await buildReferenceTrace(input, `varied-${trial}`);
      expect(trace.finalOutput).toEqual(expectedOutput('383', input));
      checkIntermediate(trace, input);
    }
    const answers = async (input: RansomNoteInput) => {
      const trace = await buildReferenceTrace(input, 'predict');
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ ransomNote: 'aa', magazine: 'aab' })).toEqual([{ kind: 'int', value: 2 }, { kind: 'choice', optionId: 'yes' }]);
    expect(await answers({ ransomNote: 'aa', magazine: 'ab' })).toEqual([{ kind: 'int', value: 1 }, { kind: 'choice', optionId: 'no' }]);
    expect(await answers({ ransomNote: 'b', magazine: 'a' })).toEqual([{ kind: 'int', value: 0 }, { kind: 'choice', optionId: 'no' }]);
  });

  it('binds trace to input and source hashes and freezes all nested state for reversible playback', async () => {
    const input = { ransomNote: 'aa', magazine: 'aab' };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.magazine = 'bbb';
    expect(trace.initialState.variables.find(item => item.name === 'magazine（显示文本）')?.value).toEqual({ kind: 'string', value: 'aab' });
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(assertFrozen); }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'rewritten')).toBe(false);
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });
});
