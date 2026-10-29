import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MissingNumberInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson268 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('268 complete missing-number curriculum (static content, not Java execution)', () => {
  it('validates all teaching stages and independent trusted expectations', () => {
    expect(LessonSchema.parse(lesson268)).toEqual(lesson268);
    expect(lesson268.testSuite.cases).toHaveLength(13);
    expect(new Set(lesson268.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    for (const item of lesson268.testSuite.cases) {
      expect(MissingNumberInputSchema.safeParse(item.input).success, item.id).toBe(true);
      expect(item.expected).toEqual(expectedOutput('268', item.input));
      expect(item.coverage.length).toBeGreaterThan(10);
    }
    for (const demo of demoInputs) expect(MissingNumberInputSchema.safeParse(demo.input).success).toBe(true);
    expect(lesson268.testSuite.cases.find(item => item.id === '268-case-missing-n-3')?.expected).toEqual({ kind: 'int', value: 3 });
    expect(lesson268.testSuite.cases.find(item => item.id === '268-case-missing-zero-3')?.expected).toEqual({ kind: 'int', value: 0 });
  });

  it('binds every mapped step to the exact Java statement and source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson268.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-missing': 'int missing = nums.length;',
      'init-index': 'int i = 0;',
      'check-index': 'while (i < nums.length) {',
      'xor-index': 'missing ^= i;',
      'xor-value': 'missing ^= nums[i];',
      'advance-index': 'i++;',
      'return-missing': 'return missing;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
    }
  });

  it('keeps independent starter unfilled and guided final check on real Java', () => {
    expect(lesson268.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('missing ^=');
    expect(lesson268.guided.stages).toHaveLength(3);
    expect(lesson268.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson268.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson268.guided.finalCheck).toBe('real-java-submit');
    expect(lesson268.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson268.predictionChecks).toHaveLength(3);
    expect(lesson268.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson268.steps.find(step => step.kind === 'guided-code')!.body).toContain('真实 Docker runner');
  });

  it('uses two compilable wrong fixtures whose named counterexamples truly differ', () => {
    const cases = new Map(lesson268.testSuite.cases.map(item => [item.id, item]));
    expect(lesson268.testSuite.wrongFixtures).toHaveLength(2);
    for (const [fixtureIndex, fixture] of lesson268.testSuite.wrongFixtures.entries()) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public int missingNumber(int[] nums)');
      for (const caseId of fixture.targetedCaseIds) {
        const item = cases.get(caseId)!;
        expect(item).toBeDefined();
        const actual = fixtureIndex === 0
          ? item.input.nums.reduce((value, observed, index) => value ^ index ^ observed, 0)
          : item.input.nums.reduce((value, observed) => value ^ observed, item.input.nums.length);
        expect(actual, `${fixture.id}:${caseId}`).not.toBe(item.expected.value);
      }
    }
    expect(lesson268.commonErrors.length).toBeGreaterThanOrEqual(3);
    for (const error of lesson268.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
  });
});
