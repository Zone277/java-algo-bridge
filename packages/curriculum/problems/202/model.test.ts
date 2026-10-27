import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  HappyNumberInputSchema,
  ReferenceTraceSchema,
  expectedOutput,
  stableJson,
  type HappyNumberInput,
  type ReferenceTrace,
} from '@jab/contracts';
import { lesson202 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function booleanAt(state: State, name: string): boolean | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}
function seenValues(state: State): number[] | null {
  const structure = state.structures.find(item => item.id === 'seen');
  if (!structure) return null;
  if (structure.kind !== 'map') throw new Error('seen must be displayed as a membership map');
  return structure.entries.map(entry => {
    if (entry.key.kind !== 'int' || entry.value.kind !== 'boolean' || entry.value.value !== true) {
      throw new Error('seen entries must be int -> true membership markers');
    }
    return entry.key.value;
  });
}
function digitsAt(state: State): number[] | null {
  const structure = state.structures.find(item => item.id === 'digits-read');
  if (!structure) return null;
  if (structure.kind !== 'array') throw new Error('digits-read must be a teaching array');
  return [...structure.values];
}
function digitSquareSum(value: number): number {
  let sum = 0;
  while (value > 0) { const digit = value % 10; sum += digit * digit; value = Math.floor(value / 10); }
  return sum;
}

function verifyIntermediateInvariants(trace: ReferenceTrace, input: HappyNumberInput): void {
  const codeLines = REFERENCE_SOURCE.split('\n');
  expect(trace.initialState.variables).toEqual([{ name: 'n', value: { kind: 'int', value: input.n } }]);
  expect(trace.initialState.structures).toEqual([]);
  expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
  const expectedSeen = new Set<number>();
  let previous: State = trace.initialState;
  let thisRoundStart: number | undefined;
  let thisRoundDigitCount = 0;

  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(mapped, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapped!.startLine, endLine: mapped!.endLine });
    expect(codeLines[mapped!.startLine - 1]!.trim()).not.toBe('');
    expect(snapshot.structures.every(structure => {
      switch (structure.kind) {
        case 'map': return structure.entries.length <= 30;
        case 'array': return structure.values.length <= 30;
        case 'stack': return structure.items.length <= 30;
        case 'list': return structure.nodes.length <= 30;
        case 'tree': return structure.nodes.length <= 30 && structure.frames.length <= 30;
        case 'dp': return structure.values.length <= 30;
        case 'window': return structure.members.length <= 30;
      }
    }), snapshot.snapshotId).toBe(true);

    const seen = seenValues(snapshot);
    expect(seen, snapshot.stepId).toEqual([...expectedSeen].concat(snapshot.stepId === 'record-current' ? [intAt(snapshot, 'n')!] : []));
    if (snapshot.stepId === 'init-set') expect(seen).toEqual([]);
    if (snapshot.stepId === 'check-outer') {
      const n = intAt(snapshot, 'n')!;
      expect(booleanAt(snapshot, '外层条件成立（表达式）')).toBe(n !== 1 && !expectedSeen.has(n));
      expect(booleanAt(snapshot, '当前数字已见（表达式）')).toBe(n === 1 ? undefined : expectedSeen.has(n));
      expect(intAt(snapshot, 'sum')).toBeUndefined();
      expect(digitsAt(snapshot)).toBeNull();
    }
    if (snapshot.stepId === 'record-current') {
      thisRoundStart = intAt(snapshot, 'n')!;
      thisRoundDigitCount = 0;
      expect(expectedSeen.has(thisRoundStart)).toBe(false);
      expectedSeen.add(thisRoundStart);
      expect(seen).toEqual([...expectedSeen]);
    }
    if (snapshot.stepId === 'init-sum') {
      expect(intAt(snapshot, 'sum')).toBe(0);
      expect(digitsAt(snapshot)).toEqual([]);
    }
    if (snapshot.stepId === 'read-digit') {
      thisRoundDigitCount++;
      expect(intAt(snapshot, 'digit')).toBe(intAt(snapshot, 'n')! % 10);
      expect(digitsAt(snapshot)?.at(-1)).toBe(intAt(snapshot, 'digit'));
      expect(digitsAt(snapshot)).toHaveLength(thisRoundDigitCount);
      expect(intAt(snapshot, 'sum')).toBe(intAt(previous, 'sum'));
    }
    if (snapshot.stepId === 'add-square') {
      const digit = intAt(snapshot, 'digit')!;
      expect(intAt(snapshot, 'sum')).toBe(intAt(previous, 'sum')! + digit * digit);
      expect(intAt(snapshot, 'n')).toBe(intAt(previous, 'n'));
    }
    if (snapshot.stepId === 'drop-digit') {
      expect(intAt(snapshot, 'n')).toBe(Math.floor(intAt(previous, 'n')! / 10));
      expect(intAt(snapshot, 'sum')).toBe(intAt(previous, 'sum'));
    }
    if (snapshot.stepId === 'set-next') {
      expect(intAt(snapshot, 'n')).toBe(digitSquareSum(thisRoundStart!));
      expect(intAt(snapshot, 'sum')).toBe(intAt(snapshot, 'n'));
      expect(digitsAt(snapshot)).toHaveLength(String(thisRoundStart).length);
      expect(intAt(snapshot, '本轮起点（教学辅助）')).toBe(thisRoundStart);
    }
    if (snapshot.stepId === 'return-result') {
      expect(booleanAt(snapshot, '返回值')).toBe(intAt(snapshot, 'n') === 1);
      if (intAt(snapshot, 'n') !== 1) expect(expectedSeen.has(intAt(snapshot, 'n')!)).toBe(true);
    }
    previous = snapshot;
  }
}

describe('202 immutable digit-square reference model', () => {
  it('matches the independent Floyd oracle and maintains the seen/digit/sum invariant across cases', async () => {
    const values = [...new Set([...lesson202.testSuite.cases.map(item => item.input.n), ...Array.from({ length: 30 }, (_, i) => i + 1)])];
    for (const n of values) {
      const input = { n };
      const trace = await buildReferenceTrace(input, `n-${n}`);
      expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
      expect(trace.finalOutput, `n=${n}`).toEqual(expectedOutput('202', input));
      verifyIntermediateInvariants(trace, input);
    }
  });

  it('shows the 19 chain, 2 cycle, and n=1 short-circuit without pretending an inner loop ran', async () => {
    const happy = await buildReferenceTrace({ n: 19 }, 'happy');
    expect(happy.snapshots.filter(snapshot => snapshot.stepId === 'record-current').map(snapshot => intAt(snapshot, 'n'))).toEqual([19, 82, 68, 100]);
    expect(happy.snapshots.at(-1)?.stepId).toBe('return-result');
    expect(happy.finalOutput).toEqual({ kind: 'boolean', value: true });

    const cycle = await buildReferenceTrace({ n: 2 }, 'cycle');
    expect(cycle.snapshots.filter(snapshot => snapshot.stepId === 'record-current').map(snapshot => intAt(snapshot, 'n'))).toEqual([2, 4, 16, 37, 58, 89, 145, 42, 20]);
    expect(intAt(cycle.snapshots.at(-2)!, 'n')).toBe(4);
    expect(cycle.finalOutput).toEqual({ kind: 'boolean', value: false });

    const one = await buildReferenceTrace({ n: 1 }, 'one');
    expect(one.snapshots.map(snapshot => snapshot.stepId)).toEqual(['init-set', 'check-outer', 'return-result']);
    expect(one.snapshots[1]?.variables.some(variable => variable.name === '当前数字已见（表达式）')).toBe(false);
    expect(one.snapshots.every(snapshot => digitsAt(snapshot) === null)).toBe(true);
    expect(one.finalOutput).toEqual({ kind: 'boolean', value: true });
  });

  it('derives two input-specific checkpoints for all three important control-flow paths', async () => {
    const answers = async (n: number) => {
      const trace = await buildReferenceTrace({ n }, `predict-${n}`);
      expect(trace.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer);
    };
    expect(await answers(1)).toEqual([{ kind: 'choice', optionId: 'skip' }, { kind: 'choice', optionId: 'happy' }]);
    expect(await answers(19)).toEqual([{ kind: 'choice', optionId: 'enter' }, { kind: 'choice', optionId: 'happy' }]);
    expect(await answers(2)).toEqual([{ kind: 'choice', optionId: 'enter' }, { kind: 'choice', optionId: 'cycle' }]);
    const trace = await buildReferenceTrace({ n: 1 }, 'bounds');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, trace.snapshots.length)).toBeNull();
  });

  it('keeps canonical hashes and deeply immutable, deterministic snapshots', async () => {
    const input = { n: 2147483647 };
    const trace = await buildReferenceTrace(input, 'max-int');
    expect(trace).toEqual(await buildReferenceTrace(input, 'max-int'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'altered')).toBe(false);
    const other = await buildReferenceTrace({ n: 2 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('rejects invalid input and an empty display input ID without affecting the runner range', async () => {
    for (const invalid of [{ n: 0 }, { n: -1 }, { n: 2147483648 }, { n: 1.5 }, { n: 1, extra: true }]) {
      expect(HappyNumberInputSchema.safeParse(invalid).success).toBe(false);
    }
    expect(HappyNumberInputSchema.safeParse({ n: 2147483647 }).success).toBe(true);
    await expect(buildReferenceTrace({ n: 0 }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ n: 1 }, '')).rejects.toThrow(/标识/);
  });
});
