import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, PowerOfTwoInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson231 } from './content.js';
import {
  REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_EVENNESS_SOURCE, WRONG_NO_POSITIVE_GUARD_SOURCE,
} from './reference.js';

describe('231 full lesson contract', () => {
  it('validates eight teaching stages and sixteen signed-int cases', () => {
    expect(LessonSchema.parse(lesson231)).toEqual(lesson231);
    expect(lesson231.steps.map(step => step.kind)).toEqual([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]);
    expect(lesson231.testSuite.cases).toHaveLength(16);
    for (const item of lesson231.testSuite.cases) {
      expect(PowerOfTwoInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected, item.id).toEqual(expectedOutput('231', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    expect(demoInputs.length).toBeGreaterThanOrEqual(3);
    for (const demo of demoInputs) expect(PowerOfTwoInputSchema.safeParse(demo.input).success, demo.id).toBe(true);
  });

  it('binds each immutable trace step to the actual Java line and source hash', () => {
    expect(lesson231.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'check-positive': 'if (n <= 0) {',
      'return-nonpositive': 'return false;',
      'clear-lowest-one': 'int lowerBits = n & (n - 1);',
      'return-result': 'return lowerBits == 0;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('provides two predictions, three guided scaffolds and an independent skeleton', () => {
    expect(lesson231.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson231.predictionChecks.map(check => check.checkpointId)).toEqual(['positive-gate', 'final-result']);
    expect(lesson231.guided.stages).toHaveLength(3);
    expect(lesson231.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson231.guided.finalCheck).toBe('real-java-submit');
    expect(lesson231.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson231.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int lowerBits = n & (n - 1);');
    expect(lesson231.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson231.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('has two distinct compilable-shaped wrong algorithms and targeted counterexamples', () => {
    const caseIds = new Set(lesson231.testSuite.cases.map(item => item.id));
    expect(lesson231.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_NO_POSITIVE_GUARD_SOURCE, WRONG_EVENNESS_SOURCE,
    ]);
    for (const fixture of lesson231.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public boolean isPowerOfTwo(int n)');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}: ${id}`).toBe(true);
    }
    for (const error of lesson231.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
  });
});
