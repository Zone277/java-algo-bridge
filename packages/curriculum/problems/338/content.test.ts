import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CountingBitsInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson338, WRONG_PARITY_ONLY_SOURCE, WRONG_PREVIOUS_PLUS_PARITY_SOURCE } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('338 curriculum contract (static checks, not Java execution)', () => {
  it('validates every input, independent expected output and case coverage', () => {
    expect(LessonSchema.parse(lesson338)).toEqual(lesson338);
    expect(lesson338.testSuite.cases).toHaveLength(13);
    for (const test of lesson338.testSuite.cases) {
      expect(CountingBitsInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('338', test.input));
      expect(test.expected.values).toHaveLength(test.input.n + 1);
      expect(test.coverage.length).toBeGreaterThan(12);
    }
    for (const demo of demoInputs) expect(CountingBitsInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(lesson338.testSuite.cases.find(test => test.id === 'case-zero')!.expected).toEqual({ kind: 'int-array', values: [0] });
    expect(lesson338.testSuite.cases.find(test => test.id === 'case-five')!.expected).toEqual({ kind: 'int-array', values: [0, 1, 1, 2, 1, 2] });
    expect(lesson338.testSuite.cases.find(test => test.id === 'case-site-upper')!.expected.values).toHaveLength(10000);
  });

  it('maps every displayed microstep to its exact Java statement and hashes LF source', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson338.reference.sourceHash);
    const statements: Record<string, string> = {
      'allocate-bits': 'int[] bits = new int[n + 1];',
      'check-index': 'for (int i = 1; i <= n; i++) {',
      'assign-count': 'bits[i] = bits[i >> 1] + (i & 1);',
      'return-bits': 'return bits;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('supplies the full learning flow and a non-solved independent skeleton', () => {
    expect(new Set(lesson338.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson338.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    const demo = lesson338.steps.find(step => step.kind === 'reference-demo')!;
    expect(demo.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(demo.body).toContain('不可变快照');
    expect(demo.body).toContain('默认值');
    expect(lesson338.guided.stages).toHaveLength(3);
    expect(lesson338.guided.stages[0]!.scaffoldSource).toContain('TODO');
    expect(lesson338.guided.stages[1]!.scaffoldSource).toContain('TODO');
    expect(lesson338.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson338.guided.finalCheck).toBe('real-java-submit');
    expect(lesson338.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('bits[i] =');
  });

  it('links input-specific predictions, hints, errors and compilable wrong fixtures to cases', () => {
    expect(lesson338.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson338.predictionChecks.map(check => check.checkpointId)).toEqual(['middle-count', 'final-count']);
    expect(lesson338.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    const caseIds = new Set(lesson338.testSuite.cases.map(test => test.id));
    for (const error of lesson338.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    expect(lesson338.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([WRONG_PARITY_ONLY_SOURCE, WRONG_PREVIOUS_PLUS_PARITY_SOURCE]);
    for (const fixture of lesson338.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    expect(lesson338.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('case-three');
    expect(lesson338.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('case-four');
  });
});
