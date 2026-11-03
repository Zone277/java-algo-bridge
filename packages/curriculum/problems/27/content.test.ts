import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RemoveElementInputSchema, expectedOutput, judgeProblemOutput } from '@jab/contracts';
import { demoInputs, lesson27 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function independentStableFilter(nums: readonly number[], val: number) {
  return nums.filter(value => value !== val);
}

describe('27 complete curriculum contract (static checks; no Java execution)', () => {
  it('validates every case and derives the canonical stable prefix independently', () => {
    expect(LessonSchema.parse(lesson27)).toEqual(lesson27);
    expect(lesson27.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson27.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson27.testSuite.cases) {
      expect(RemoveElementInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual({ kind: 'int-array', values: independentStableFilter(item.input.nums, item.input.val) });
      expect(item.expected).toEqual(expectedOutput('27', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(RemoveElementInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('documents and verifies order-insensitive multiset judging', () => {
    const input = { nums: [1, 2, 3, 2, 4], val: 2 };
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [4, 1, 3] }).passed).toBe(true);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [1, 3, 3] }).passed).toBe(false);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [1, 2, 3, 4] }).passed).toBe(false);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [1, 3] }).passed).toBe(false);
  });

  it('binds the exact LF source hash and every highlighted step to a Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson27.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-write': 'int write = 0;',
      'check-read': 'for (int read = 0; read < nums.length; read++) {',
      'check-keep': 'if (nums[read] != val) {',
      'copy-keep': 'nums[write] = nums[read];',
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
    expect(lesson27.guided.stages).toHaveLength(3);
    expect(lesson27.guided.stages[0]!.scaffoldSource).toContain('若当前值应保留');
    expect(lesson27.guided.stages[1]!.scaffoldSource).toContain('请完成读写指针');
    expect(lesson27.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson27.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson27.guided.finalCheck).toBe('real-java-submit');
    expect(lesson27.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int write = 0;');
  });

  it('connects demos, predictions, counterexamples and two compilable wrong fixtures', () => {
    expect(lesson27.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson27.predictionChecks.map(check => check.checkpointId)).toEqual(['first-decision', 'final-count']);
    const caseIds = new Set(lesson27.testSuite.cases.map(item => item.id));
    expect(lesson27.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson27.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson27.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
