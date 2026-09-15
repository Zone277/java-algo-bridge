import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SortedSquaresInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson977 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('977 complete curriculum content', () => {
  it('validates the lesson and independently derives every expected array', () => {
    expect(LessonSchema.parse(lesson977)).toEqual(lesson977);
    expect(lesson977.testSuite.cases).toHaveLength(10);
    for (const item of lesson977.testSuite.cases) {
      expect(SortedSquaresInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('977', item.input));
      expect(item.coverage.length).toBeGreaterThan(8);
    }
    for (const demo of demoInputs) expect(SortedSquaresInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the exact LF source hash and every stable step to its Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson977.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'create-result': 'int[] result = new int[nums.length];', 'init-left': 'int left = 0;',
      'init-right': 'int right = nums.length - 1;', 'init-write': 'int write = nums.length - 1;',
      'check-loop': 'while (left <= right) {', 'square-left': 'int leftSquare = nums[left] * nums[left];',
      'square-right': 'int rightSquare = nums[right] * nums[right];', 'choose-side': 'if (leftSquare > rightSquare) {',
      'write-left': 'result[write] = leftSquare;', 'move-left': 'left++;',
      'write-right': 'result[write] = rightSquare;', 'move-right': 'right--;',
      'move-write': 'write--;', 'return-result': 'return result;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
    }
  });

  it('keeps independent mode at a method skeleton and requires a real final submit', () => {
    expect(lesson977.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('new int[nums.length]');
    expect(STARTER_SOURCE).not.toContain('while (');
    expect(lesson977.guided.stages).toHaveLength(3);
    expect(lesson977.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson977.guided.finalCheck).toBe('real-java-submit');
  });

  it('provides two dynamic prediction links and two distinct wrong Java fixtures with real counterexamples', () => {
    expect(lesson977.predictionChecks.map(check => check.checkpointId)).toEqual(['first-write-value', 'first-write-index']);
    expect(demoInputs.map(demo => demo.id)).toEqual(lesson977.visualization.inputIds);
    expect(lesson977.testSuite.wrongFixtures).toHaveLength(2);
    const caseIds = new Set(lesson977.testSuite.cases.map(item => item.id));
    for (const fixture of lesson977.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.source).toContain('class Solution');
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson977.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
