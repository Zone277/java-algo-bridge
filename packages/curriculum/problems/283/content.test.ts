import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MoveZeroesInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson283 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('283 complete curriculum contract (static content checks, not Java execution)', () => {
  it('validates the lesson and independently derives every expected modified array', () => {
    expect(LessonSchema.parse(lesson283)).toEqual(lesson283);
    expect(lesson283.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    for (const item of lesson283.testSuite.cases) {
      expect(MoveZeroesInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('283', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(MoveZeroesInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the exact LF reference source hash and every code step to a real statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson283.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-write': 'int write = 0;',
      'check-read': 'for (int read = 0; read < nums.length; read++) {',
      'check-nonzero': 'if (nums[read] != 0) {',
      'copy-nonzero': 'nums[write] = nums[read];',
      'advance-write': 'write++;',
      'check-fill': 'while (write < nums.length) {',
      'fill-zero': 'nums[write] = 0;',
      'advance-fill': 'write++;',
      finish: 'return;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
    }
  });

  it('keeps independent work at a method skeleton and requires a real final submission', () => {
    expect(lesson283.independent.initialSource).toBe(STARTER_SOURCE);
    expect(lesson283.independent.initialSource).not.toContain('int write = 0;');
    expect(lesson283.guided.stages).toHaveLength(3);
    expect(lesson283.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson283.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson283.guided.finalCheck).toBe('real-java-submit');
  });

  it('resolves demo, prediction, common-error and wrong-fixture references', () => {
    const cases = new Set<string>(lesson283.testSuite.cases.map(item => item.id));
    expect(demoInputs.map(input => input.id)).toEqual(lesson283.visualization.inputIds);
    expect(lesson283.predictionChecks.map(check => check.checkpointId)).toEqual(['first-decision', 'first-write']);
    expect(lesson283.testSuite.wrongFixtures.map(fixture => fixture.id)).toEqual([
      'wrong-rebind-array', 'wrong-unstable-swap', 'wrong-missing-tail-fill',
    ]);
    for (const error of lesson283.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    for (const fixture of lesson283.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const caseId of fixture.targetedCaseIds) expect(cases.has(caseId)).toBe(true);
    }
  });
});
