import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, PlusOneInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson66, WRONG_LAST_DIGIT_SOURCE, WRONG_NO_GROWTH_SOURCE } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('66 curriculum contract (static checks, not Java execution)', () => {
  it('validates full cases and independent expected outputs', () => {
    expect(LessonSchema.parse(lesson66)).toEqual(lesson66);
    expect(lesson66.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    for (const test of lesson66.testSuite.cases) {
      expect(PlusOneInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('66', test.input));
      expect(test.coverage.length).toBeGreaterThan(12);
    }
    for (const demo of demoInputs) expect(PlusOneInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(lesson66.testSuite.cases.find(test => test.id === '66-case-tail-nine')!.expected).toEqual({ kind: 'int-array', values: [1, 3, 0] });
    expect(lesson66.testSuite.cases.find(test => test.id === '66-case-all-nine-two')!.expected).toEqual({ kind: 'int-array', values: [1, 0, 0] });
    expect(lesson66.testSuite.cases.find(test => test.id === '66-case-site-upper')!.expected.values).toHaveLength(101);
  });

  it('keeps the reference source hash and every displayed Java line exact', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson66.reference.sourceHash);
    const statements: Record<string, string> = {
      'check-digit': 'for (int i = digits.length - 1; i >= 0; i--) {',
      'check-nine': 'if (digits[i] < 9) {',
      'increment-digit': 'digits[i]++;',
      'return-digits': 'return digits;',
      'reset-nine': 'digits[i] = 0;',
      'allocate-grown': 'int[] grown = new int[digits.length + 1];',
      'set-leading': 'grown[0] = 1;',
      'return-grown': 'return grown;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('contains the full learning flow, unsolved skeleton and separate real Java final check', () => {
    expect(new Set(lesson66.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson66.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson66.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson66.guided.stages).toHaveLength(3);
    expect(lesson66.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson66.guided.finalCheck).toBe('real-java-submit');
    expect(lesson66.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('digits[i]++');
    expect(lesson66.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson66.predictionChecks.map(check => check.checkpointId)).toEqual(['first-digit', 'result-length']);
  });

  it('links compilable wrong fixtures and error explanations to targeted cases', () => {
    const caseIds = new Set(lesson66.testSuite.cases.map(test => test.id));
    for (const error of lesson66.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    expect(lesson66.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([WRONG_LAST_DIGIT_SOURCE, WRONG_NO_GROWTH_SOURCE]);
    for (const fixture of lesson66.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    expect(lesson66.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
  });
});
