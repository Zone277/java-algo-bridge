import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, PalindromeNumberInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson9 } from './content.js';
import {
  REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_EVEN_ONLY_SOURCE, WRONG_IGNORE_SIGN_SOURCE,
} from './reference.js';

describe('9 full lesson contract', () => {
  it('validates all teaching stages, demos and sixteen signed-int cases', () => {
    expect(LessonSchema.parse(lesson9)).toEqual(lesson9);
    expect(lesson9.steps.map(step => step.kind)).toEqual([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]);
    expect(lesson9.testSuite.cases).toHaveLength(16);
    for (const item of lesson9.testSuite.cases) {
      expect(PalindromeNumberInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected, item.id).toEqual(expectedOutput('9', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    expect(demoInputs).toHaveLength(6);
    for (const demo of demoInputs) expect(PalindromeNumberInputSchema.safeParse(demo.input).success, demo.id).toBe(true);
  });

  it('maps every reference step to the corresponding Java line and source hash', () => {
    expect(lesson9.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'check-negative': 'if (x < 0) {',
      'return-negative': 'return false;',
      'check-trailing-zero': 'if (x != 0 && x % 10 == 0) {',
      'return-trailing-zero': 'return false;',
      'init-reversed': 'int reversed = 0;',
      'check-half': 'while (x > reversed) {',
      'read-digit': 'int digit = x % 10;',
      'append-digit': 'reversed = reversed * 10 + digit;',
      'drop-digit': 'x /= 10;',
      'return-result': 'return x == reversed || x == reversed / 10;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('keeps two predictions, three guided stages and an unfilled independent skeleton', () => {
    expect(lesson9.prerequisites).toEqual(['J1', 'J2', 'J8']);
    expect(lesson9.predictionChecks.map(check => check.checkpointId)).toEqual(['negative-guard', 'final-result']);
    expect(lesson9.guided.stages).toHaveLength(3);
    expect(lesson9.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson9.guided.finalCheck).toBe('real-java-submit');
    expect(lesson9.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson9.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int reversed = 0;');
    expect(lesson9.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson9.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('has distinct compilable-shaped wrong fixtures with actual targeted counterexamples', () => {
    const caseIds = new Set(lesson9.testSuite.cases.map(item => item.id));
    expect(lesson9.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_IGNORE_SIGN_SOURCE, WRONG_EVEN_ONLY_SOURCE,
    ]);
    expect(expectedOutput('9', { x: -121 })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('9', { x: 121 })).toEqual({ kind: 'boolean', value: true });
    for (const fixture of lesson9.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public boolean isPalindrome(int x)');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}: ${id}`).toBe(true);
    }
    for (const error of lesson9.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
  });
});
