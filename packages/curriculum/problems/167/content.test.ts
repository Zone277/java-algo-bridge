import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TwoSumSortedInputSchema, judgeProblemOutput } from '@jab/contracts';
import { lesson167 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function pairCount(numbers: readonly number[], target: number): number {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) for (let j = i + 1; j < numbers.length; j++) if (numbers[i]! + numbers[j]! === target) count++;
  return count;
}

describe('167 complete course', () => {
  it('satisfies the strict course schema, includes every learning step and keeps source hashes/mapping valid', () => {
    expect(LessonSchema.parse(lesson167).id).toBe('167');
    expect(new Set(lesson167.steps.map(step => step.kind))).toEqual(new Set(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(lesson167.predictionChecks).toHaveLength(2);
    expect(lesson167.guided.stages).toHaveLength(3);
    expect(lesson167.guided.finalCheck).toBe('real-java-submit');
    expect(lesson167.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson167.commonErrors.length).toBeGreaterThanOrEqual(3);
    expect(lesson167.independent.initialSource).toBe(STARTER_SOURCE);
    expect(lesson167.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    for (const map of REFERENCE_STEP_MAP) {
      expect(map.startLine).toBeGreaterThan(0);
      expect(map.endLine).toBeLessThanOrEqual(lines.length);
    }
    expect(lines[REFERENCE_STEP_MAP.find(step => step.stepId === 'return-pair')!.startLine - 1]).toContain('left + 1, right + 1');
  });

  it('publishes 12 valid unique-pair cases with exact 1-based outputs and documented coverage', () => {
    expect(lesson167.testSuite.cases).toHaveLength(12);
    for (const testCase of lesson167.testSuite.cases) {
      expect(TwoSumSortedInputSchema.parse(testCase.input)).toEqual(testCase.input);
      expect(pairCount(testCase.input.numbers, testCase.input.target), testCase.id).toBe(1);
      expect(judgeProblemOutput('167', testCase.input, testCase.expected).passed, testCase.id).toBe(true);
      expect(testCase.coverage.length, testCase.id).toBeGreaterThan(10);
    }
    expect(judgeProblemOutput('167', { numbers: [2, 7], target: 9 }, { kind: 'int-array', values: [0, 1] }).passed).toBe(false);
    expect(judgeProblemOutput('167', { numbers: [2, 7], target: 9 }, { kind: 'int-array', values: [2, 1] }).passed).toBe(false);
    expect(judgeProblemOutput('167', { numbers: [-1, 0, 1, 3], target: 2 }, { kind: 'int-array', values: [3, 3] }).passed).toBe(false);
  });

  it('supplies three compilable wrong-solution fixtures with distinct counterexamples', () => {
    expect(lesson167.testSuite.wrongFixtures).toHaveLength(3);
    for (const fixture of lesson167.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public int[] twoSum(int[] numbers, int target)');
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const id of fixture.targetedCaseIds) expect(lesson167.testSuite.cases.some(item => item.id === id)).toBe(true);
    }
  });
});
