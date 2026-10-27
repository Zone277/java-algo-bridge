import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SearchRangeInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson34 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function scan(nums: readonly number[], target: number): [number, number] {
  let first = -1;
  let last = -1;
  nums.forEach((value, index) => { if (value === target) { if (first === -1) first = index; last = index; } });
  return [first, last];
}

describe('34 lesson contract (static checks; no Java execution)', () => {
  it('validates every published case against an independent linear scan', () => {
    expect(LessonSchema.parse(lesson34)).toEqual(lesson34);
    expect(lesson34.testSuite.cases.length).toBe(16);
    for (const testCase of lesson34.testSuite.cases) {
      expect(SearchRangeInputSchema.safeParse(testCase.input).success).toBe(true);
      expect(testCase.expected).toEqual({ kind: 'int-array', values: scan(testCase.input.nums, testCase.input.target) });
      expect(testCase.expected).toEqual(expectedOutput('34', testCase.input));
      expect(testCase.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(SearchRangeInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('ties the exact reference source hash and every model step to a Java line', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson34.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const expected: Record<string, string> = {
      'lower-init-left': 'int left = 0;', 'lower-init-right': 'int right = nums.length;',
      'lower-check-loop': 'while (left < right) {', 'lower-compute-mid': 'int mid = left + (right - left) / 2;',
      'lower-check-less': 'if (nums[mid] < target) {', 'lower-move-left': 'left = mid + 1;',
      'lower-move-right': 'right = mid;', 'save-first': 'int first = left;',
      'check-absent': 'if (first == nums.length || nums[first] != target) {',
      'return-absent': 'return new int[] {-1, -1};', 'upper-init-left': 'left = first;',
      'upper-init-right': 'right = nums.length;', 'upper-check-loop': 'while (left < right) {',
      'upper-compute-mid': 'int mid = left + (right - left) / 2;',
      'upper-check-less-equal': 'if (nums[mid] <= target) {',
      'upper-move-left': 'left = mid + 1;', 'upper-move-right': 'right = mid;',
      'return-range': 'return new int[] {first, left - 1};',
    };
    expect(REFERENCE_STEP_MAP.length).toBe(Object.keys(expected).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]?.trim(), step.stepId).toBe(expected[step.stepId]);
    }
  });

  it('keeps guided scaffolds progressive and independent mode at a method skeleton', () => {
    expect(lesson34.guided.stages).toHaveLength(3);
    expect(lesson34.guided.stages[0]!.scaffoldSource).toContain('false /* TODO');
    expect(lesson34.guided.stages[1]!.scaffoldSource).toContain('请补全上界循环');
    expect(lesson34.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson34.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson34.guided.finalCheck).toBe('real-java-submit');
    expect(lesson34.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int left = 0;');
    expect(lesson34.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
  });

  it('connects demonstrations, predictions, counterexamples and two wrong Java fixtures', () => {
    expect(lesson34.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson34.predictionChecks.map(check => check.checkpointId)).toEqual(['first-bound', 'upper-first-mid', 'final-range']);
    const caseIds = new Set(lesson34.testSuite.cases.map(testCase => testCase.id));
    expect(lesson34.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson34.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    }
    for (const error of lesson34.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
