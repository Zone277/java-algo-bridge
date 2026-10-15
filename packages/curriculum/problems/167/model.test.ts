import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, stableJson, type ReferenceTrace } from '@jab/contracts';
import { demoInputs, lesson167 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
function intAt(state: State, name: string): number | undefined {
  const value = state.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}
function arrayAt(state: State, id: string): readonly number[] | undefined {
  const value = state.structures.find(item => item.kind === 'array' && item.id === id);
  return value?.kind === 'array' ? value.values : undefined;
}
function uniquePair(numbers: readonly number[], target: number): [number, number] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < numbers.length; i++) for (let j = i + 1; j < numbers.length; j++) if (numbers[i]! + numbers[j]! === target) pairs.push([i, j]);
  expect(pairs).toHaveLength(1);
  return pairs[0]!;
}

describe('167 immutable opposing-pointer model', () => {
  it('keeps the unique pair inside every candidate interval and maps each snapshot to reference code', async () => {
    const inputs = [
      ...demoInputs.map(item => item.input),
      ...lesson167.testSuite.cases.filter(item => item.input.numbers.length <= 30).map(item => item.input),
    ];
    for (const [index, input] of inputs.entries()) {
      const trace = await buildReferenceTrace(input, `invariant-${index}`);
      const [solutionLeft, solutionRight] = uniquePair(input.numbers, input.target);
      expect(trace.finalOutput).toEqual({ kind: 'int-array', values: [solutionLeft + 1, solutionRight + 1] });
      expect(arrayAt(trace.initialState, 'numbers')).toEqual(input.numbers);
      let previous: State | undefined;
      for (const snapshot of trace.snapshots) {
        const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
        expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
        expect(arrayAt(snapshot, 'numbers')).toEqual(input.numbers);
        const left = intAt(snapshot, 'left');
        const right = intAt(snapshot, 'right');
        if (left !== undefined && right !== undefined) {
          expect(left).toBeLessThanOrEqual(solutionLeft);
          expect(right).toBeGreaterThanOrEqual(solutionRight);
          expect(left).toBeLessThan(right);
        }
        if (snapshot.stepId === 'compute-sum') expect(intAt(snapshot, 'sum')).toBe(input.numbers[left!]! + input.numbers[right!]!);
        if (snapshot.stepId === 'move-left') {
          expect(previous && intAt(previous, 'sum')).toBeLessThan(input.target);
          expect(left).toBe(intAt(previous!, 'left')! + 1);
          expect(right).toBe(intAt(previous!, 'right'));
        }
        if (snapshot.stepId === 'move-right') {
          expect(previous && intAt(previous, 'sum')).toBeGreaterThan(input.target);
          expect(right).toBe(intAt(previous!, 'right')! - 1);
          expect(left).toBe(intAt(previous!, 'left'));
        }
        if (snapshot.stepId === 'return-pair') expect(arrayAt(snapshot, 'result')).toEqual([left! + 1, right! + 1]);
        previous = snapshot;
      }
      expect(trace.snapshots.length).toBeLessThanOrEqual(2000);
    }
  });

  it('provides two input-specific prediction checkpoints and restores earlier pointers', async () => {
    const first = await buildReferenceTrace(demoInputs[0]!.input, 'middle');
    const second = await buildReferenceTrace(demoInputs[1]!.input, 'basic');
    const answers = (trace: ReferenceTrace) => trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []).map(item => item.answer);
    expect(answers(first)).toEqual([{ kind: 'int', value: 16 }, { kind: 'int', value: 3 }]);
    expect(answers(second)).toEqual([{ kind: 'int', value: 17 }, { kind: 'int', value: 2 }]);
    expect(answers(await buildReferenceTrace(demoInputs[2]!.input, 'duplicates'))).toEqual([{ kind: 'int', value: 6 }, { kind: 'int', value: 1 }]);
    expect(first.snapshots.filter(snapshot => snapshot.checkpointId)).toHaveLength(2);
    expect(first.snapshots.find(snapshot => snapshot.stepId === 'init-right')).toBeDefined();
    const prior = first.snapshots.find(snapshot => snapshot.stepId === 'init-right')!;
    expect([intAt(prior, 'left'), intAt(prior, 'right')]).toEqual([0, 4]);
    expect(first.snapshots.find(snapshot => snapshot.stepId === 'move-left')).toBeDefined();
    expect([intAt(prior, 'left'), intAt(prior, 'right')]).toEqual([0, 4]);
    expect(predictionAt(first, -1)).toBeNull();
  });

  it('validates and freezes the full trace without truncating oversize demos', async () => {
    const input = { numbers: [2, 3, 4, 9, 14], target: 7 };
    const trace = await buildReferenceTrace(input, 'hashes');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace).toEqual(await buildReferenceTrace(input, 'hashes'));
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.snapshots[0]!.structures[0])).toBe(true);
    input.numbers[0] = -1;
    expect(arrayAt(trace.initialState, 'numbers')).toEqual([2, 3, 4, 9, 14]);
    await expect(buildReferenceTrace({ numbers: [], target: 1 }, 'invalid')).rejects.toThrow();
    await expect(buildReferenceTrace({ numbers: [2, 1], target: 3 }, 'unordered')).rejects.toThrow();
    await expect(buildReferenceTrace({ numbers: [...Array<number>(29).fill(-1000), -999, 1000], target: 1 }, 'oversize')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace({ numbers: [2, 7], target: 9 }, '')).rejects.toThrow();
  });
});
