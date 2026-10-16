import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MajorityElementInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson169 } from './content.js';
import {
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_FIRST_VALUE_SOURCE,
  WRONG_MIDDLE_INDEX_SOURCE,
} from './reference.js';

describe('169 complete majority-element curriculum', () => {
  it('validates the full lesson, 12 cases and trusted oracle values', () => {
    expect(LessonSchema.parse(lesson169)).toEqual(lesson169);
    expect(lesson169.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction',
      'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson169.testSuite.cases).toHaveLength(12);
    for (const item of lesson169.testSuite.cases) {
      expect(MajorityElementInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected, item.id).toEqual(expectedOutput('169', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    for (const demo of demoInputs) expect(MajorityElementInputSchema.safeParse(demo.input).success, demo.id).toBe(true);
  });

  it('binds the exact reference hash and every highlighted step to its Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson169.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-candidate': 'int candidate = nums[0];',
      'init-votes': 'int votes = 0;',
      'loop-index': 'for (int i = 0; i < nums.length; i++) {',
      'check-empty': 'if (votes == 0) {',
      'choose-candidate': 'candidate = nums[i];',
      'compare-value': 'if (nums[i] == candidate) {',
      'add-vote': 'votes++;',
      'remove-vote': 'votes--;',
      'return-candidate': 'return candidate;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(mapping.startLine).toBe(mapping.endLine);
      expect(lines[mapping.startLine - 1]!.trim()).toBe(statements[mapping.stepId]);
    }
  });

  it('includes two state predictions, three coding stages and unfilled independent skeleton', () => {
    expect(lesson169.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson169.predictionChecks.map(check => check.checkpointId)).toEqual(['first-candidate', 'final-candidate']);
    expect(lesson169.guided.stages).toHaveLength(3);
    expect(lesson169.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson169.guided.finalCheck).toBe('real-java-submit');
    expect(lesson169.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson169.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int votes = 0;');
    expect(lesson169.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson169.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('links deliberately wrong but complete Java methods to valid counterexamples', () => {
    const caseIds = new Set(lesson169.testSuite.cases.map(item => item.id));
    expect(lesson169.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([
      WRONG_FIRST_VALUE_SOURCE, WRONG_MIDDLE_INDEX_SOURCE,
    ]);
    for (const fixture of lesson169.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson169.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
    const wrongFirstCase = lesson169.testSuite.cases.find(item => item.id === lesson169.testSuite.wrongFixtures[0]!.targetedCaseIds[0])!;
    expect(wrongFirstCase.input.nums[0]).not.toBe(wrongFirstCase.expected.value);
    const wrongMiddleCase = lesson169.testSuite.cases.find(item => item.id === lesson169.testSuite.wrongFixtures[1]!.targetedCaseIds[0])!;
    expect(wrongMiddleCase.input.nums[Math.floor(wrongMiddleCase.input.nums.length / 2)]).not.toBe(wrongMiddleCase.expected.value);
  });
});
