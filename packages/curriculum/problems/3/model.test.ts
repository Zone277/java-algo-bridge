import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace, type Structure } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type WindowState = Extract<Structure, { kind: 'window' }>;
type MapState = Extract<Structure, { kind: 'map' }>;

function windowOf(state: ReferenceTrace['initialState'] | Snapshot): WindowState {
  const window = state.structures.find((structure): structure is WindowState => structure.kind === 'window');
  if (!window) throw new Error(`Missing window in ${state.snapshotId}`);
  return window;
}

function mapOf(state: Snapshot): MapState {
  const map = state.structures.find((structure): structure is MapState => structure.kind === 'map');
  if (!map) throw new Error(`Missing map in ${state.snapshotId}`);
  return map;
}

function integer(snapshot: Snapshot, name: string) {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`Missing ${name} in ${snapshot.snapshotId}`);
  return value.value;
}

function brute(text: string) {
  let best = 0;
  for (let start = 0; start < text.length; start++) {
    const seen = new Set<string>();
    for (let end = start; end < text.length && !seen.has(text[end]!); end++) { seen.add(text[end]!); best = Math.max(best, end - start + 1); }
  }
  return best;
}

function mapEntries(map: MapState) {
  return new Map(map.entries.map(entry => {
    if (entry.key.kind !== 'char' || entry.value.kind !== 'int') throw new Error('Unexpected map entry');
    return [entry.key.value, entry.value.value] as const;
  }));
}

function verifyTrace(trace: ReferenceTrace, text: string) {
  expect(trace.finalOutput).toEqual({ kind: 'int', value: brute(text) });
  let previous: Snapshot | undefined;
  let previousLeft = 0;
  for (const snapshot of trace.snapshots) {
    const step = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId)!;
    expect(snapshot.codeRange).toEqual({ startLine: step.startLine, endLine: step.endLine });
    expect(snapshot.structures.map(structure => structure.kind)).toEqual(['window', 'map']);
    const window = windowOf(snapshot);
    const map = mapOf(snapshot);
    expect(window.text).toBe(text);
    const content = text.slice(window.left, window.rightExclusive);
    expect(window.members).toEqual([...content].map(char => ({ kind: 'char', value: char })));
    expect(new Set(content).size).toBe(content.length);
    expect(window.left).toBeGreaterThanOrEqual(previousLeft);
    previousLeft = window.left;
    const entries = mapEntries(map);
    const processed = text.slice(0, window.rightExclusive);
    for (const char of new Set(processed)) expect(entries.get(char)).toBe(processed.lastIndexOf(char));
    for (const [char, index] of entries) { expect(index).toBeLessThan(window.rightExclusive); expect(text[index]).toBe(char); }

    if (snapshot.stepId === 'move-left') {
      const before = previous!;
      const current = snapshot.variables.find(variable => variable.name === 'current')?.value;
      if (current?.kind !== 'char') throw new Error('Missing current');
      const oldIndex = mapEntries(mapOf(before)).get(current.value)!;
      expect(integer(snapshot, 'left')).toBe(Math.max(integer(before, 'left'), oldIndex + 1));
      expect(map.entries).toEqual(mapOf(before).entries);
    }
    if (snapshot.stepId === 'put-last') {
      const before = previous!;
      const current = snapshot.variables.find(variable => variable.name === 'current')?.value;
      if (current?.kind !== 'char') throw new Error('Missing current');
      expect(window.rightExclusive).toBe(integer(snapshot, 'right') + 1);
      expect(mapEntries(map).get(current.value)).toBe(integer(snapshot, 'right'));
      expect(window.left).toBe(windowOf(before).left);
    }
    if (snapshot.stepId === 'update-best') {
      expect(window).toEqual(windowOf(previous!));
      expect(map.entries).toEqual(mapOf(previous!).entries);
      expect(integer(snapshot, 'best')).toBe(brute(text.slice(0, window.rightExclusive)));
    }
    if (snapshot.stepId === 'move-right') {
      expect(window).toEqual(windowOf(previous!));
      expect(map.entries).toEqual(mapOf(previous!).entries);
      expect(integer(snapshot, 'right')).toBe(integer(previous!, 'right') + 1);
      expect(integer(snapshot, 'best')).toBe(brute(text.slice(0, window.rightExclusive)));
      expect(snapshot.variables.some(variable => variable.name === 'current')).toBe(false);
    }
    previous = snapshot;
  }
}

describe('3 immutable sliding-window reference model', () => {
  it('validates hashes and shows window plus map in every executed snapshot', async () => {
    const input = { s: 'abba' };
    const trace = await buildReferenceTrace(input, 'abba');
    expect(ReferenceTraceSchema.safeParse(trace).success).toBe(true);
    expect(trace.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.structures.map(structure => structure.kind)).toEqual(['window']);
    expect(trace.snapshots.every(snapshot => snapshot.structures.map(structure => structure.kind).join(',') === 'window,map')).toBe(true);
    verifyTrace(trace, input.s);
  });

  it('checks empty, spaces, subsequence traps, rollback traps and retained suffixes', async () => {
    for (const text of ['', ' ', '   ', 'abcde', 'bbbbb', 'pwwkew', 'abba', 'dvdf', 'a b a', 'A!a A']) verifyTrace(await buildReferenceTrace({ s: text }, 'invariants'), text);
  });

  it('keeps left monotonic for abba and does not clear the valid v suffix in dvdf', async () => {
    const abba = await buildReferenceTrace({ s: 'abba' }, 'rollback');
    const moves = abba.snapshots.filter(snapshot => snapshot.stepId === 'move-left');
    expect(moves.map(snapshot => integer(snapshot, 'left'))).toEqual([2, 2]);
    const dvdf = await buildReferenceTrace({ s: 'dvdf' }, 'retain');
    const after = dvdf.snapshots.find(snapshot => snapshot.stepId === 'update-best' && windowOf(snapshot).rightExclusive === 4)!;
    expect('dvdf'.slice(windowOf(after).left, windowOf(after).rightExclusive)).toBe('vdf');
    expect(integer(after, 'best')).toBe(3);
  });

  it('derives two input-specific predictions including no-duplicate and empty inputs', async () => {
    const checks = [
      { text: 'abba', answers: [1, 2] },
      { text: 'pwwkew', answers: [1, 2] },
      { text: 'abc', answers: [1, 3] },
      { text: '', answers: [0, 0] },
    ];
    for (const { text, answers } of checks) {
      const trace = await buildReferenceTrace({ s: text }, 'prediction');
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(predictions.map(prediction => prediction.answer)).toEqual(answers.map(value => ({ kind: 'int', value })));
    }
  });

  it('is deterministic, deeply frozen and restores pre-update state', async () => {
    const input = { s: 'a b a' };
    const trace = await buildReferenceTrace(input, 'stable');
    expect(trace).toEqual(await buildReferenceTrace({ s: 'a b a' }, 'stable'));
    const before = trace.snapshots.find(snapshot => snapshot.stepId === 'read-char' && integer(snapshot, 'right') === 3)!;
    const after = trace.snapshots.find(snapshot => snapshot.stepId === 'put-last' && integer(snapshot, 'right') === 3)!;
    expect(windowOf(before).rightExclusive).toBe(3);
    expect(windowOf(after).rightExclusive).toBe(4);
    const frozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    expect(Reflect.set(windowOf(after), 'left', 0)).toBe(false);
    expect(windowOf(before).rightExclusive).toBe(3);
    const other = await buildReferenceTrace({ s: 'a  a' }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    const oldCheckpoints = new Set(trace.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []));
    expect(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []).some(id => oldCheckpoints.has(id))).toBe(false);
  });

  it('matches the common expected-output helper and refuses invalid or over-budget traces', async () => {
    for (const text of ['', 'abba', 'pwwkew', ' ']) expect((await buildReferenceTrace({ s: text }, 'expected')).finalOutput).toEqual(expectedOutput('3', { s: text }));
    await expect(buildReferenceTrace({ s: '\n' }, 'newline')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: '汉' }, 'unicode')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: 'a' }, '')).rejects.toThrow();
    const supported = await buildReferenceTrace({ s: 'a'.repeat(285) }, 'supported');
    expect(supported.snapshots.length).toBeLessThanOrEqual(2000);
    await expect(buildReferenceTrace({ s: 'a'.repeat(286) }, 'too-many')).rejects.toThrow('2000');
  });
});
