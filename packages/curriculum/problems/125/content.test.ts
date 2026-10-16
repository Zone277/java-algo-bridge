import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ValidPalindromeInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson125 } from './content.js';
import {
  REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_LETTERS_ONLY_SOURCE, WRONG_RAW_COMPARE_SOURCE, WRONG_REMOVE_ONLY_SOURCE,
} from './reference.js';

describe('125 complete curriculum contract', () => {
  it('contains the eight learning stages and 12 valid cases with independent trusted outputs', () => {
    expect(LessonSchema.parse(lesson125)).toEqual(lesson125);
    expect(new Set(lesson125.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction',
      'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson125.testSuite.cases).toHaveLength(12);
    const ids = new Set<string>();
    for (const item of lesson125.testSuite.cases) {
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      expect(ValidPalindromeInputSchema.parse(item.input)).toEqual(item.input);
      expect(item.expected, item.id).toEqual(expectedOutput('125', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(ValidPalindromeInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(ValidPalindromeInputSchema.safeParse({ s: '' }).success).toBe(false);
    expect(ValidPalindromeInputSchema.safeParse({ s: '你' }).success).toBe(false);
    expect(ValidPalindromeInputSchema.safeParse({ s: 'a'.repeat(10001) }).success).toBe(false);
    expect(ValidPalindromeInputSchema.safeParse({ s: 'a'.repeat(10000) }).success).toBe(true);
  });

  it('binds the exact source hash and maps each model step to its Java statement', () => {
    expect(lesson125.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;', 'init-right': 'int right = s.length() - 1;',
      'outer-loop': 'while (left < right) {',
      'skip-left-check': 'while (left < right && !Character.isLetterOrDigit(s.charAt(left))) {',
      'skip-left': 'left++;',
      'skip-right-check': 'while (left < right && !Character.isLetterOrDigit(s.charAt(right))) {',
      'skip-right': 'right--;', 'cross-check': 'if (left >= right) {', 'break': 'break;',
      'compare': 'if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {',
      'return-false': 'return false;', 'advance-left': 'left++;', 'advance-right': 'right--;',
      'return-true': 'return true;',
    };
    const lines = REFERENCE_SOURCE.split('\n');
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine, step.stepId).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('provides predictions, staged guidance, unfilled independent code and three hint levels', () => {
    expect(lesson125.prerequisites).toEqual(['J1', 'J2', 'J4', 'J8']);
    expect(lesson125.predictionChecks.map(check => check.checkpointId)).toEqual(['125-start-right', '125-first-pair', '125-result']);
    expect(lesson125.guided.finalCheck).toBe('real-java-submit');
    expect(lesson125.guided.stages).toHaveLength(3);
    expect(lesson125.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson125.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Character.isLetterOrDigit');
    expect(lesson125.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
  });

  it('ties compiling wrong Java fixtures and common errors to distinct counterexamples', () => {
    const ids = new Set(lesson125.testSuite.cases.map(item => item.id));
    expect(lesson125.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_RAW_COMPARE_SOURCE, WRONG_LETTERS_ONLY_SOURCE, WRONG_REMOVE_ONLY_SOURCE,
    ]);
    for (const fixture of lesson125.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(ids.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson125.commonErrors) expect(ids.has(error.counterexampleInputId), error.id).toBe(true);
    expect(lesson125.testSuite.cases.find(item => item.id === 'digits-matter')?.expected).toEqual({ kind: 'boolean', value: false });
    expect(lesson125.testSuite.cases.find(item => item.id === 'only-symbols')?.expected).toEqual({ kind: 'boolean', value: true });
  });
});
