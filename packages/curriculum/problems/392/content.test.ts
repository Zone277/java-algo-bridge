import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { IsSubsequenceInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson392 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('392 complete subsequence curriculum', () => {
  it('validates all teaching stages and 14 covered cases', () => {
    expect(LessonSchema.parse(lesson392)).toEqual(lesson392);
    expect(lesson392.testSuite.cases).toHaveLength(14);
    for (const item of lesson392.testSuite.cases) {
      expect(IsSubsequenceInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('392', item.input));
      expect(item.coverage.length).toBeGreaterThan(8);
    }
    for (const demo of demoInputs) expect(IsSubsequenceInputSchema.safeParse(demo.input).success).toBe(true);
    expect(lesson392.steps.map(step => step.kind)).toEqual(expect.arrayContaining(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(lesson392.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('i++');
    expect(lesson392.guided.stages).toHaveLength(3);
    expect(lesson392.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson392.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson392.guided.finalCheck).toBe('real-java-submit');
    expect(lesson392.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson392.predictionChecks).toHaveLength(2);
  });

  it('maps each model action to the exact Java statement with a stable source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson392.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = { 'init-i': 'int i = 0;', 'init-j': 'int j = 0;', 'check-loop': 'while (i < s.length() && j < t.length()) {', compare: 'if (s.charAt(i) == t.charAt(j)) {', match: 'i++;', 'advance-j': 'j++;', 'return-result': 'return i == s.length();' };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
    }
  });

  it('attaches wrong algorithms to actual semantic counterexamples, including their first target', () => {
    const cases = new Map(lesson392.testSuite.cases.map(item => [item.id, item]));
    for (const [index, fixture] of lesson392.testSuite.wrongFixtures.entries()) {
      for (const id of fixture.targetedCaseIds) {
        const item = cases.get(id)!;
        expect(item).toBeDefined();
        const wrong = index === 0 ? item.input.t.includes(item.input.s) : [...item.input.s].every(char => item.input.t.includes(char));
        expect(wrong, `${fixture.id}:${id}`).not.toBe(item.expected.value);
      }
    }
    for (const error of lesson392.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
  });
});
