import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HappyNumberInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson202 } from './content.js';
import {
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_CYCLE_AS_SUCCESS_SOURCE,
  WRONG_ONE_ROUND_SOURCE,
} from './reference.js';

describe('202 complete curriculum contract', () => {
  it('validates eight lesson steps, all published cases, and the three demonstration inputs', () => {
    expect(LessonSchema.parse(lesson202)).toEqual(lesson202);
    expect(lesson202.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson202.testSuite.cases).toHaveLength(14);
    for (const item of lesson202.testSuite.cases) {
      expect(HappyNumberInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected, item.id).toEqual(expectedOutput('202', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    for (const demo of demoInputs) expect(HappyNumberInputSchema.safeParse(demo.input).success, demo.id).toBe(true);
  });

  it('binds the exact source hash and each step to the actual Java statement', () => {
    expect(lesson202.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-set': 'Set<Integer> seen = new HashSet<>();',
      'check-outer': 'while (n != 1 && !seen.contains(n)) {',
      'record-current': 'seen.add(n);',
      'init-sum': 'int sum = 0;',
      'check-digit-loop': 'while (n > 0) {',
      'read-digit': 'int digit = n % 10;',
      'add-square': 'sum += digit * digit;',
      'drop-digit': 'n /= 10;',
      'set-next': 'n = sum;',
      'return-result': 'return n == 1;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('provides Java prerequisites, two dynamic checks, three scaffolds and a clean independent skeleton', () => {
    expect(lesson202.prerequisites).toEqual(['J1', 'J2', 'J3', 'J5', 'J8']);
    expect(lesson202.predictionChecks.map(check => check.checkpointId)).toEqual(['first-loop-decision', 'final-result']);
    expect(lesson202.guided.stages).toHaveLength(3);
    expect(lesson202.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson202.guided.finalCheck).toBe('real-java-submit');
    expect(lesson202.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson202.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Set<Integer> seen = new HashSet<>();');
    expect(lesson202.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson202.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('points two terminating, compilable-shaped wrong fixtures at explicit counterexamples', () => {
    const caseIds = new Set(lesson202.testSuite.cases.map(item => item.id));
    expect(lesson202.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([
      WRONG_ONE_ROUND_SOURCE, WRONG_CYCLE_AS_SUCCESS_SOURCE,
    ]);
    for (const fixture of lesson202.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public boolean isHappy(int n)');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}: ${id}`).toBe(true);
    }
    for (const error of lesson202.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
  });
});
