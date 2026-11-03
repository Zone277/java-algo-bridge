import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type IsomorphicStringsInput,
  type ReferenceTrace,
} from '@jab/contracts';
import { lesson205 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

const intAt = (state: State, name: string) => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
};
const boolAt = (state: State, name: string) => {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
};
const sparseArrayAt = (state: State, id: string) => {
  const structure = state.structures.find(item => item.id === id);
  if (structure === undefined) return undefined;
  if (structure.kind !== 'map' || structure.presentation !== 'sparse-array') throw new Error(`205 ${id} must be a sparse int-array view`);
  const values = Array<number>(128).fill(0);
  for (const entry of structure.entries) {
    if (entry.key.kind !== 'char' || entry.value.kind !== 'int') throw new Error(`205 invalid sparse entry in ${id}`);
    values[entry.key.value.charCodeAt(0)] = entry.value.value;
  }
  return values;
};
const lastSeen = (text: string, length: number) => {
  const result = Array<number>(128).fill(0);
  for (let i = 0; i < length; i++) result[text.charCodeAt(i)] = i + 1;
  return result;
};

function checkIntermediate(trace: ReferenceTrace, input: IsomorphicStringsInput): void {
  const seenSId = 'seenS 非零槽（int[128] 稀疏视图）';
  const seenTId = 'seenT 非零槽（int[128] 稀疏视图）';
  expect(sparseArrayAt(trace.initialState, seenSId)).toBeUndefined();
  expect(sparseArrayAt(trace.initialState, seenTId)).toBeUndefined();
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapping, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapping!.startLine, endLine: mapping!.endLine });
    for (const structure of snapshot.structures) {
      if (structure.kind !== 'map' || structure.presentation !== 'sparse-array') throw new Error('205 display structures must be sparse int-array views');
      expect(structure.entries.length).toBeLessThanOrEqual(30);
    }
    const processed = intAt(snapshot, '已确认前缀长度（教学）')!;
    expect(processed).toBeGreaterThanOrEqual(0);
    expect(processed).toBeLessThanOrEqual(input.s.length);

    const left = sparseArrayAt(snapshot, seenSId);
    const right = sparseArrayAt(snapshot, seenTId);
    if (snapshot.stepId === 'init-seen-s') {
      expect(left).toEqual(lastSeen(input.s, 0));
      expect(right).toBeUndefined();
    } else {
      expect(left).toHaveLength(128);
      expect(right).toHaveLength(128);
      const leftLength = snapshot.stepId === 'record-s' ? processed + 1 : processed;
      expect(left).toEqual(lastSeen(input.s, leftLength));
      expect(right).toEqual(lastSeen(input.t, processed));
    }

    if (snapshot.stepId === 'check-pattern' || snapshot.stepId === 'return-false') {
      const i = intAt(snapshot, 'i')!;
      const expectedLeft = lastSeen(input.s, i)[input.s.charCodeAt(i)]!;
      const expectedRight = lastSeen(input.t, i)[input.t.charCodeAt(i)]!;
      expect(processed).toBe(i);
      expect(intAt(snapshot, 'seenS[a]（更新前）')).toBe(expectedLeft);
      expect(intAt(snapshot, 'seenT[b]（更新前）')).toBe(expectedRight);
      expect(boolAt(snapshot, '最近位置相同')).toBe(expectedLeft === expectedRight);
    }
    if (snapshot.stepId === 'record-t') expect(processed).toBe(intAt(snapshot, 'i')! + 1);
    if (snapshot.stepId === 'return-false') expect(boolAt(snapshot, '返回值')).toBe(false);
    if (snapshot.stepId === 'return-true') expect(boolAt(snapshot, '返回值')).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  }
}

describe('205 immutable last-seen model', () => {
  it('matches every published display-size case and checks the intermediate mapping invariant', async () => {
    for (const item of lesson205.testSuite.cases) {
      if (item.input.s.length > 30) {
        await expect(buildReferenceTrace(item.input, item.id)).rejects.toThrow('30');
        continue;
      }
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput).toEqual(expectedOutput('205', item.input));
      checkIntermediate(trace, item.input);
    }
  });

  it('differential-checks varied printable inputs and makes both predictions input-bound', async () => {
    let seed = 2052026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const alphabet = 'abAB 1!?';
    for (let trial = 0; trial < 96; trial++) {
      const length = 1 + random() % 10;
      const make = () => Array.from({ length }, () => alphabet[random() % alphabet.length]).join('');
      const input = { s: make(), t: make() };
      const trace = await buildReferenceTrace(input, `varied-${trial}`);
      expect(trace.finalOutput).toEqual(expectedOutput('205', input));
      checkIntermediate(trace, input);
    }

    const answers = async (input: IsomorphicStringsInput) => {
      const trace = await buildReferenceTrace(input, 'prediction');
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    };
    expect(await answers({ s: 'egg', t: 'add' })).toEqual([
      { kind: 'choice', optionId: 'same' }, { kind: 'choice', optionId: 'yes' },
    ]);
    expect(await answers({ s: 'ab', t: 'aa' })).toEqual([
      { kind: 'choice', optionId: 'different' }, { kind: 'choice', optionId: 'no' },
    ]);
    expect(await answers({ s: 'a', t: 'z' })).toEqual([
      { kind: 'choice', optionId: 'same' }, { kind: 'choice', optionId: 'yes' },
    ]);
  });

  it('binds hashes and deeply freezes all snapshots for reversible playback', async () => {
    const input = { s: 'egg', t: 'add' };
    const trace = await buildReferenceTrace(input, 'frozen');
    expect(trace).toEqual(await buildReferenceTrace(input, 'frozen'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    input.t = 'bar';
    expect(trace.initialState.variables.find(item => item.name === 't（显示文本）')?.value).toEqual({ kind: 'string', value: 'add' });
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
