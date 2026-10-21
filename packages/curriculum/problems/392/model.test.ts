import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { IsSubsequenceInputSchema, ReferenceTraceSchema, expectedOutput, stableJson, type IsSubsequenceInput, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson392 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string) {
  const value = state.variables.find(item => item.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

/** Enumerate deletions for an independent small-prefix oracle. */
function longestPrefix(s: string, t: string): number {
  const reachable = new Set(['']);
  for (const char of t) for (const prefix of [...reachable]) reachable.add(prefix + char);
  let best = 0;
  for (let length = 0; length <= s.length; length++) if (reachable.has(s.slice(0, length))) best = length;
  return best;
}

function verifyStates(trace: ReferenceTrace, input: IsSubsequenceInput) {
  expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
  expect(intAt(trace.initialState, 'i')).toBeUndefined();
  expect(intAt(trace.initialState, 'j')).toBeUndefined();
  let oldI = 0;
  let oldJ = 0;
  for (const snapshot of trace.snapshots) {
    const i = intAt(snapshot, 'i')!;
    const j = intAt(snapshot, 'j');
    expect(i).toBe(oldI + (snapshot.stepId === 'match' ? 1 : 0));
    if (j !== undefined) expect(j).toBe(oldJ + (snapshot.stepId === 'advance-j' ? 1 : 0));
    oldI = i; oldJ = j ?? 0;
    const map = snapshot.structures[2]!;
    expect(map.kind).toBe('map');
    if (map.kind !== 'map') throw new Error('missing position table');
    expect(map.entries).toHaveLength(i);
    let previous = -1;
    for (const [index, entry] of map.entries.entries()) {
      expect(entry.key).toEqual({ kind: 'int', value: index });
      if (entry.value.kind !== 'int') throw new Error('invalid index');
      const position = entry.value.value;
      expect(position).toBeGreaterThan(previous);
      expect(position).toBe(input.t.indexOf(input.s[index]!, previous + 1));
      expect(input.t[position]).toBe(input.s[index]);
      previous = position;
    }
    const scanned = intAt(snapshot, '已比较 t 字符数（教学）')!;
    if (j !== undefined) expect(scanned).toBe(j + (['compare', 'match'].includes(snapshot.stepId) ? 1 : 0));
    expect(snapshot.structures[0]).toMatchObject({ kind: 'window', text: input.s, left: 0, rightExclusive: i });
    expect(snapshot.structures[1]).toMatchObject({ kind: 'window', text: input.t, left: 0, rightExclusive: scanned });
    if (j !== undefined && input.t.length <= 8 && ['check-loop', 'advance-j', 'return-result'].includes(snapshot.stepId)) expect(i).toBe(longestPrefix(input.s, input.t.slice(0, j)));
    const mapping = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: mapping.startLine, endLine: mapping.endLine });
    if (snapshot.stepId === 'compare') {
      expect(i).toBeLessThan(input.s.length);
      expect(j).toBeLessThan(input.t.length);
      expect(snapshot.variables.find(item => item.name === '本次比较是否相等（教学记录）')?.value).toEqual({ kind: 'boolean', value: input.s[i] === input.t[j!] });
    }
  }
}

describe('392 greedy immutable prefix model', () => {
  it('checks every displayable course case against the independent oracle and intermediate invariants', async () => {
    for (const item of lesson392.testSuite.cases.filter(item => item.input.s.length <= 30 && item.input.t.length <= 30)) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(trace.finalOutput).toEqual(item.expected);
      verifyStates(trace, item.input);
    }
  });

  it('keeps two input-specific checkpoints even on empty strings and short-circuit exits', async () => {
    const checkpointIds = new Set<string>();
    for (const input of [...demoInputs.map(item => item.input), { s: '', t: '' }, { s: 'a', t: '' }]) {
      const trace = await buildReferenceTrace(input, 'prediction');
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(predictions[0]!.answer).toEqual({ kind: 'text', value: String(input.s.length > 0 && input.t.length > 0) });
      const expected = expectedOutput('392', input);
      if (expected.kind !== 'boolean') throw new Error('392 expects a boolean');
      expect(predictions[1]!.answer).toEqual({ kind: 'text', value: String(expected.value) });
      for (const prediction of predictions) {
        expect(checkpointIds.has(prediction.checkpointId)).toBe(false);
        checkpointIds.add(prediction.checkpointId);
      }
      if (!input.s.length || !input.t.length) expect(trace.snapshots.some(snapshot => snapshot.stepId === 'compare')).toBe(false);
      expect(predictionAt(trace, -1)).toBeNull();
      expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
    }
  });

  it('tests repeated characters and order through independent deletion enumeration', async () => {
    let seed = 392;
    const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let n = 0; n < 70; n++) {
      const word = (length: number) => Array.from({ length }, () => next() < 0.5 ? 'a' : 'b').join('');
      const input = { s: word(n % 5), t: word(n % 8) };
      const trace = await buildReferenceTrace(input, `seed-${n}`);
      expect(trace.finalOutput).toEqual({ kind: 'boolean', value: longestPrefix(input.s, input.t) === input.s.length });
      verifyStates(trace, input);
    }
  });

  it('freezes the complete trace and restores exact prior reference positions in reverse order', async () => {
    const input = { s: 'aaa', t: 'abaca' };
    const trace = await buildReferenceTrace(input, 'restore');
    const saved = trace.snapshots.map(snapshot => JSON.stringify(snapshot));
    expect(trace).toEqual(await buildReferenceTrace(input, 'restore'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    input.t = 'changed';
    for (let index = trace.snapshots.length - 1; index >= 0; index--) expect(JSON.stringify(trace.snapshots[index])).toBe(saved[index]);
    const frozen = (value: unknown): void => {
      if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); }
    };
    frozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'mutated')).toBe(false);
    const matches = trace.snapshots.filter(snapshot => snapshot.stepId === 'match');
    expect(matches.map(snapshot => snapshot.structures[2])).toMatchObject([
      { entries: [{ key: { value: 0 }, value: { value: 0 } }] },
      { entries: [{ key: { value: 0 }, value: { value: 0 } }, { key: { value: 1 }, value: { value: 2 } }] },
      { entries: [{ key: { value: 0 }, value: { value: 0 } }, { key: { value: 1 }, value: { value: 2 } }, { key: { value: 2 }, value: { value: 4 } }] },
    ]);
  });

  it('accepts full 30-character displays but refuses oversize demonstrations without truncation', async () => {
    const full = await buildReferenceTrace({ s: 'a'.repeat(30), t: 'a'.repeat(30) }, 'max');
    expect(full.finalOutput).toEqual({ kind: 'boolean', value: true });
    expect(full.snapshots.length).toBeLessThan(2000);
    for (const input of [{ s: 'a'.repeat(31), t: 'a' }, { s: '', t: 'a'.repeat(31) }]) {
      expect(IsSubsequenceInputSchema.safeParse(input).success).toBe(true);
      await expect(buildReferenceTrace(input, 'large')).rejects.toThrow(/30/);
    }
    for (const input of [{ s: 'A', t: 'a' }, { s: '', t: ' ' }, { s: 'a'.repeat(101), t: '' }]) await expect(buildReferenceTrace(input, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: '', t: '' }, '')).rejects.toThrow(/标识/);
  });
});
