import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ContainsDuplicateInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson217 } from './content.js';
import {
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_ADD_BEFORE_CHECK_SOURCE,
  WRONG_ADJACENT_ONLY_SOURCE,
} from './reference.js';

describe('217 complete curriculum contract', () => {
  it('validates the full eight-stage lesson and every published test oracle', () => {
    expect(LessonSchema.parse(lesson217)).toEqual(lesson217);
    expect(lesson217.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction',
      'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson217.testSuite.cases).toHaveLength(12);
    for (const item of lesson217.testSuite.cases) {
      expect(ContainsDuplicateInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected, item.id).toEqual(expectedOutput('217', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    for (const demo of demoInputs) expect(ContainsDuplicateInputSchema.safeParse(demo.input).success, demo.id).toBe(true);
  });

  it('binds the exact reference source hash and every state step to a Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson217.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-set': 'Set<Integer> seen = new HashSet<>();',
      'loop-index': 'for (int i = 0; i < nums.length; i++) {',
      'check-seen': 'if (seen.contains(nums[i])) {',
      'return-true': 'return true;',
      'add-current': 'seen.add(nums[i]);',
      'return-false': 'return false;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(mapping.startLine).toBe(mapping.endLine);
      expect(lines[mapping.startLine - 1]!.trim()).toBe(statements[mapping.stepId]);
    }
  });

  it('provides HashSet prerequisites, two predictions, three guided stages and a blank independent skeleton', () => {
    expect(lesson217.prerequisites).toEqual(['J1', 'J2', 'J3', 'J5', 'J8']);
    expect(lesson217.predictionChecks).toHaveLength(2);
    expect(lesson217.predictionChecks.map(item => item.checkpointId)).toEqual(['first-membership', 'final-result']);
    expect(lesson217.guided.stages).toHaveLength(3);
    expect(lesson217.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson217.guided.finalCheck).toBe('real-java-submit');
    expect(lesson217.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson217.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Set<Integer> seen = new HashSet<>();');
    expect(lesson217.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson217.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('ships compiling-shaped deliberate mistakes aimed at named counterexamples', () => {
    const caseIds = new Set(lesson217.testSuite.cases.map(item => item.id));
    expect(lesson217.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_ADJACENT_ONLY_SOURCE,
      WRONG_ADD_BEFORE_CHECK_SOURCE,
    ]);
    expect(lesson217.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson217.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.source).toContain('class Solution');
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson217.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
  });

  it('keeps the collection operation order explicit in the reference solution', () => {
    const containsAt = REFERENCE_SOURCE.indexOf('seen.contains(nums[i])');
    const addAt = REFERENCE_SOURCE.indexOf('seen.add(nums[i])');
    expect(containsAt).toBeGreaterThan(0);
    expect(addAt).toBeGreaterThan(containsAt);
    expect(REFERENCE_SOURCE.indexOf('return false;')).toBeGreaterThan(addAt);
  });
});

