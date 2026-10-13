import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SearchInsertInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson35 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function lowerBound(nums: readonly number[], target: number): number {
  let index = 0;
  while (index < nums.length && nums[index]! < target) index++;
  return index;
}

describe('35 complete curriculum contract (static content checks, not Java execution)', () => {
  it('validates 8-16 cases and independently derives every insert position', () => {
    expect(LessonSchema.parse(lesson35)).toEqual(lesson35);
    expect(lesson35.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson35.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson35.testSuite.cases) {
      expect(SearchInsertInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual({ kind: 'int', value: lowerBound(item.input.nums, item.input.target) });
      expect(item.expected).toEqual(expectedOutput('35', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(SearchInsertInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the LF source hash and every model step to the exact Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson35.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;',
      'init-right': 'int right = nums.length;',
      'check-loop': 'while (left < right) {',
      'compute-mid': 'int mid = left + (right - left) / 2;',
      'check-less': 'if (nums[mid] < target) {',
      'move-left': 'left = mid + 1;',
      'move-right': 'right = mid;',
      'return-left': 'return left;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
    }
  });

  it('keeps the independent source blank, uses three progressively reduced stages, and requires real submit', () => {
    expect(lesson35.guided.stages).toHaveLength(3);
    expect(lesson35.guided.stages[0]!.scaffoldSource).toContain('false /* TODO');
    expect(lesson35.guided.stages[1]!.scaffoldSource).toContain('请补全边界更新');
    expect(lesson35.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson35.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson35.guided.finalCheck).toBe('real-java-submit');
    expect(lesson35.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int left = 0;');
  });

  it('links dynamic predictions, demonstrations, errors and at least two targeted wrong Java fixtures', () => {
    const caseIds = new Set<string>(lesson35.testSuite.cases.map(item => item.id));
    expect(demoInputs.map(item => item.id)).toEqual(lesson35.visualization.inputIds);
    expect(lesson35.predictionChecks.map(item => item.checkpointId)).toEqual(['first-mid', 'first-boundary']);
    expect(lesson35.testSuite.wrongFixtures.length).toBeGreaterThanOrEqual(2);
    for (const fixture of lesson35.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.source).toContain('class Solution');
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson35.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    expect(lesson35.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
  });
});
