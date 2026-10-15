import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ValidAnagramInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson242 } from './content.js';
import {
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_DISTINCT_LETTERS_SOURCE,
  WRONG_LENGTH_ONLY_SOURCE,
  WRONG_SAME_POSITION_SOURCE,
} from './reference.js';

describe('242 complete curriculum contract', () => {
  it('validates all eight stages, 12 real-runner cases, input bounds and trusted expected values', () => {
    expect(LessonSchema.parse(lesson242)).toEqual(lesson242);
    expect(new Set(lesson242.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction',
      'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson242.testSuite.cases).toHaveLength(12);
    const ids = new Set<string>();
    for (const item of lesson242.testSuite.cases) {
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      expect(ValidAnagramInputSchema.parse(item.input), item.id).toEqual(item.input);
      expect(item.expected, item.id).toEqual(expectedOutput('242', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    for (const demo of demoInputs) expect(ValidAnagramInputSchema.parse(demo.input), demo.id).toEqual(demo.input);
    expect(ValidAnagramInputSchema.safeParse({ s: 'A', t: 'a' }).success).toBe(false);
    expect(ValidAnagramInputSchema.safeParse({ s: '', t: 'a' }).success).toBe(false);
    expect(ValidAnagramInputSchema.safeParse({ s: 'a'.repeat(10001), t: 'a' }).success).toBe(false);
  });

  it('binds the exact source hash and maps every trace step to the matching Java statement', () => {
    expect(lesson242.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'check-length': 'if (s.length() != t.length()) {',
      'return-length-false': 'return false;',
      'init-count': 'int[] count = new int[26];',
      'loop-index': 'for (int i = 0; i < s.length(); i++) {',
      'increase-s': "count[s.charAt(i) - 'a']++;",
      'decrease-t': "count[t.charAt(i) - 'a']--;",
      'loop-letter': 'for (int letter = 0; letter < count.length; letter++) {',
      'check-count': 'if (count[letter] != 0) {',
      'return-mismatch': 'return false;',
      'return-true': 'return true;',
    };
    const lines = REFERENCE_SOURCE.split('\n');
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine, step.stepId).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('provides three predictions, three guided stages, three hint levels and an unfilled independent skeleton', () => {
    expect(lesson242.prerequisites).toEqual(['J1', 'J2', 'J3', 'J4', 'J8']);
    expect(lesson242.predictionChecks.map(check => check.checkpointId)).toEqual(['242-length', '242-first-net', '242-result']);
    expect(lesson242.guided.stages).toHaveLength(3);
    expect(lesson242.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson242.guided.finalCheck).toBe('real-java-submit');
    expect(lesson242.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('new int[26]');
    expect(lesson242.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson242.commonErrors).toHaveLength(4);
  });

  it('ties three compiling Java mistakes and all common errors to published counterexamples', () => {
    const ids = new Set(lesson242.testSuite.cases.map(item => item.id));
    expect(lesson242.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_LENGTH_ONLY_SOURCE, WRONG_DISTINCT_LETTERS_SOURCE, WRONG_SAME_POSITION_SOURCE,
    ]);
    for (const fixture of lesson242.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(ids.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson242.commonErrors) expect(ids.has(error.counterexampleInputId), error.id).toBe(true);
  });
});
