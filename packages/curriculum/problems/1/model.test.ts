import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, TwoSumInputSchema, judgeProblemOutput, stableJson, type ReferenceTrace, type TwoSumInput } from '@jab/contracts';
import { lesson1 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';
import { bridgePrerequisites } from '../../bridge/content.js';

type Snapshot = ReferenceTrace['snapshots'][number];
function intVariable(snapshot: Snapshot, name: string): number {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`Missing int variable ${name}`);
  return value.value;
}
function mapEntries(snapshot: Snapshot): [number, number][] {
  const map = snapshot.structures.find(structure => structure.id === 'seen');
  if (map?.kind !== 'map') throw new Error('Missing seen map');
  return map.entries.map(entry => {
    if (entry.key.kind !== 'int' || entry.value.kind !== 'int') throw new Error('Map entry must be int -> int');
    return [entry.key.value, entry.value.value];
  });
}

function verifyInvariants(trace: ReferenceTrace, input: TwoSumInput) {
  const lines = REFERENCE_SOURCE.split('\n');
  for (const snapshot of trace.snapshots) {
    const mapping = REFERENCE_STEP_MAP.find(item => item.stepId === snapshot.stepId);
    expect(mapping, snapshot.stepId).toBeDefined();
    expect(snapshot.codeRange).toEqual({ startLine: mapping!.startLine, endLine: mapping!.endLine });
    expect(lines[mapping!.startLine - 1]!.trim().length).toBeGreaterThan(0);
    const array = snapshot.structures.find(structure => structure.id === 'nums');
    expect(array?.kind).toBe('array');
    if (array?.kind === 'array') expect(array.values).toEqual(input.nums);
    const entries = mapEntries(snapshot);
    for (const [key, oldIndex] of entries) expect(input.nums[oldIndex]).toBe(key);
    const current = snapshot.variables.find(variable => variable.name === 'i')?.value;
    if (current?.kind === 'int') {
      const priorOnly = ['loop-index', 'compute-complement', 'check-complement', 'return-pair'].includes(snapshot.stepId);
      for (const [, old] of entries) expect(old).toBeLessThanOrEqual(priorOnly ? current.value - 1 : current.value);
      if (snapshot.stepId === 'check-complement') {
        const complement = intVariable(snapshot, 'complement');
        const hit = snapshot.variables.find(variable => variable.name === '补数已出现')?.value;
        expect(hit).toEqual({ kind: 'boolean', value: entries.some(([key]) => key === complement) });
      }
      if (snapshot.stepId === 'store-current') expect(entries).toContainEqual([input.nums[current.value], current.value]);
      if (snapshot.stepId === 'return-pair') {
        const old = intVariable(snapshot, '旧下标');
        expect(old).toBeLessThan(current.value);
        expect(input.nums[old]! + input.nums[current.value]!).toBe(input.target);
      }
    }
  }
}

describe('problem 1 immutable complement-map model', () => {
  it('matches every published case and checks the map invariant at intermediate steps', async () => {
    for (const item of lesson1.testSuite.cases) {
      const trace = await buildReferenceTrace(item.input, item.id);
      expect(ReferenceTraceSchema.safeParse(trace).success, item.id).toBe(true);
      expect(trace.finalOutput).toEqual(item.expected);
      if (trace.finalOutput.kind !== 'int-array') throw new Error('Problem 1 trace must return int-array');
      expect(judgeProblemOutput('1', item.input, { kind: 'int-array', values: [...trace.finalOutput.values] }).passed, item.id).toBe(true);
      verifyInvariants(trace, item.input);
    }
  });

  it('creates seen only at the mapped Java initialization and keeps bridge prerequisites consistent', async () => {
    const trace = await buildReferenceTrace({ nums: [2, 7], target: 9 }, 'lifecycle');
    expect(trace.initialState.structures.some(structure => structure.id === 'seen')).toBe(false);
    const initialized = trace.snapshots.find(snapshot => snapshot.stepId === 'init-map')!;
    expect(mapEntries(initialized)).toEqual([]);
    expect(initialized.variables).toContainEqual({ name: 'seen', value: { kind: 'reference', objectId: 'seen' } });
    expect(lesson1.prerequisites).toEqual(bridgePrerequisites['1']);
  });

  it('derives both predictions from the selected input', async () => {
    const basic = await buildReferenceTrace({ nums: [2, 7, 11, 15], target: 9 }, 'basic');
    const duplicate = await buildReferenceTrace({ nums: [3, 3], target: 6 }, 'duplicate');
    const answers = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(prediction => prediction.answer);
    expect(answers(basic)).toEqual([{ kind: 'int', value: 7 }, { kind: 'int', value: 0 }]);
    expect(answers(duplicate)).toEqual([{ kind: 'int', value: 3 }, { kind: 'int', value: 0 }]);
    expect(predictionAt(basic, -1)).toBeNull();
    expect(predictionAt(basic, basic.snapshots.length)).toBeNull();
    expect(basic.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
  });

  it('uses canonical hashes and produces deterministic, deeply frozen, input-isolated traces', async () => {
    const input = { nums: [10, -2, 4, 8], target: 6 };
    const trace = await buildReferenceTrace(input, 'isolation');
    expect(trace).toEqual(await buildReferenceTrace(input, 'isolation'));
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    input.nums[0] = 99;
    expect(trace.initialState.structures.find(structure => structure.id === 'nums')).toMatchObject({ kind: 'array', values: [10, -2, 4, 8] });
    const frozen = (value: unknown): void => { if (value && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    expect(Reflect.set(trace.snapshots[0]!, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ nums: [5, -1], target: 4 }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(new Set(other.snapshots.flatMap(snapshot => snapshot.checkpointId ?? [])).size).toBe(2);
    expect(other.snapshots.some(snapshot => trace.snapshots.some(old => old.checkpointId && old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('keeps the semantic judge order-independent while the reference output stays canonical', async () => {
    const input = { nums: [2, 7, 11, 15], target: 9 };
    const trace = await buildReferenceTrace(input, 'order');
    expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [0, 1] });
    expect(judgeProblemOutput('1', input, { kind: 'int-array', values: [1, 0] }).passed).toBe(true);
    expect(judgeProblemOutput('1', input, { kind: 'int-array', values: [0, 0] }).passed).toBe(false);
  });

  it('rejects invalid contracts and fails explicitly rather than truncating over 2000 snapshots', async () => {
    expect(TwoSumInputSchema.safeParse({ nums: [1, 2, 3, 4], target: 5 }).success).toBe(false);
    await expect(buildReferenceTrace({ nums: [1, 2], target: 10 }, 'no-pair')).rejects.toThrow();
    await expect(buildReferenceTrace({ nums: [2, 7], target: 9 }, '')).rejects.toThrow('标识');
    const longInput = { nums: Array.from({ length: 600 }, (_, index) => index), target: 1197 };
    expect(TwoSumInputSchema.safeParse(longInput).success).toBe(true);
    await expect(buildReferenceTrace(longInput, 'over-budget')).rejects.toThrow('2000');
  });
});
