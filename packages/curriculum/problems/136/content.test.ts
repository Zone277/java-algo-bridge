import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SingleNumberInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson136 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('136 complete XOR curriculum', () => {
  it('validates the full lesson and all 12 frequency-constrained cases', () => {
    expect(LessonSchema.parse(lesson136)).toEqual(lesson136);
    expect(lesson136.testSuite.cases).toHaveLength(12);
    expect(lesson136.steps.map(step => step.kind)).toEqual(expect.arrayContaining(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    for (const item of lesson136.testSuite.cases) {
      expect(SingleNumberInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected).toEqual(expectedOutput('136', item.input));
      expect(item.coverage.length).toBeGreaterThan(5);
    }
    for (const demo of demoInputs) expect(SingleNumberInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds every highlighted step to the actual Java statement and exact source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson136.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-result': 'int result = 0;', 'init-index': 'int i = 0;', 'check-index': 'while (i < nums.length) {',
      'xor-value': 'result ^= nums[i];', 'advance-index': 'i++;', 'return-result': 'return result;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(mapping.startLine).toBe(mapping.endLine);
      expect(REFERENCE_SOURCE.split('\n')[mapping.startLine - 1]!.trim()).toBe(statements[mapping.stepId]);
    }
  });

  it('keeps independent mode unfilled, three diminishing scaffolds, and separate learning checks', () => {
    expect(lesson136.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('result ^=');
    expect(lesson136.guided.stages).toHaveLength(3);
    expect(lesson136.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson136.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson136.guided.finalCheck).toBe('real-java-submit');
    expect(lesson136.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson136.predictionChecks).toHaveLength(2);
    expect(lesson136.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('links wrong fixtures to counterexamples with genuinely wrong computed results', () => {
    const cases = new Map(lesson136.testSuite.cases.map(item => [item.id, item]));
    expect(lesson136.testSuite.wrongFixtures).toHaveLength(2);
    for (const [fixtureIndex, fixture] of lesson136.testSuite.wrongFixtures.entries()) {
      for (const caseId of fixture.targetedCaseIds) {
        const item = cases.get(caseId)!;
        expect(item).toBeDefined();
        const actual = fixtureIndex === 0 ? item.input.nums[0] : item.input.nums.reduce((a, b) => a | b, 0);
        expect(actual, `${fixture.id}:${caseId}`).not.toBe(item.expected.value);
      }
    }
    for (const error of lesson136.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
  });
});
