import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RemoveDuplicatesInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson26 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function independentUnique(nums: readonly number[]) {
  return nums.filter((value, index) => index === 0 || nums[index - 1] !== value);
}

describe('26 complete curriculum contract (static checks; no Java execution)', () => {
  it('validates every case and derives the effective prefix independently', () => {
    expect(LessonSchema.parse(lesson26)).toEqual(lesson26);
    expect(lesson26.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson26.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson26.testSuite.cases) {
      expect(RemoveDuplicatesInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual({ kind: 'int-array', values: independentUnique(item.input.nums) });
      expect(item.expected).toEqual(expectedOutput('26', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(RemoveDuplicatesInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the exact LF source hash and every highlighted step to a Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson26.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-write': 'int write = 1;',
      'check-read': 'for (int read = 1; read < nums.length; read++) {',
      'check-unique': 'if (nums[read] != nums[write - 1]) {',
      'copy-unique': 'nums[write] = nums[read];',
      'advance-write': 'write++;',
      'return-length': 'return write;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]?.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('keeps guided work progressive and independent work at the method skeleton', () => {
    expect(lesson26.guided.stages).toHaveLength(3);
    expect(lesson26.guided.stages[0]!.scaffoldSource).toContain('nums[0..write)');
    expect(lesson26.guided.stages[1]!.scaffoldSource).toContain('请完成读写指针');
    expect(lesson26.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson26.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson26.guided.finalCheck).toBe('real-java-submit');
    expect(lesson26.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int write = 1;');
  });

  it('connects demos, predictions, counterexamples and two compilable wrong fixtures', () => {
    expect(lesson26.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson26.predictionChecks.map(check => check.checkpointId)).toEqual(['first-decision', 'final-count']);
    const caseIds = new Set(lesson26.testSuite.cases.map(item => item.id));
    expect(lesson26.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson26.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson26.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
