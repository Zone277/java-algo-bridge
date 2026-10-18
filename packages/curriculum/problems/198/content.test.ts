import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HouseRobberInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson198, WRONG_FIXED_PARITY_SOURCE, WRONG_OVERWRITE_SOURCE } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('198 curriculum contract (static checks, not Java execution)', () => {
  it('validates every case, source and stated coverage', () => {
    expect(LessonSchema.parse(lesson198)).toEqual(lesson198);
    expect(lesson198.testSuite.cases).toHaveLength(13);
    for (const test of lesson198.testSuite.cases) {
      expect(HouseRobberInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('198', test.input));
      expect(test.coverage.length).toBeGreaterThan(10);
    }
    for (const demo of demoInputs) expect(HouseRobberInputSchema.parse(demo.input)).toEqual(demo.input);
    const upper = lesson198.testSuite.cases.find(test => test.id === 'maximum-houses')!;
    expect(upper.input.nums).toHaveLength(100);
    expect(upper.expected).toEqual({ kind: 'int', value: 20000 });
    expect(lesson198.testSuite.cases.find(test => test.id === 'zero-gap')!.expected).toEqual({ kind: 'int', value: 16 });
  });

  it('ties each microstep and LF hash to the exact reference statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson198.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-two-back': 'int twoBack = 0;',
      'init-one-back': 'int oneBack = 0;',
      'check-index': 'for (int i = 0; i < nums.length; i++) {',
      'compute-take': 'int take = twoBack + nums[i];',
      'compute-skip': 'int skip = oneBack;',
      'compute-next': 'int next = Math.max(skip, take);',
      'shift-two-back': 'twoBack = oneBack;',
      'shift-one-back': 'oneBack = next;',
      'return-best': 'return oneBack;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides the full learning flow without filling the independent solution', () => {
    expect(new Set(lesson198.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson198.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    const reference = lesson198.steps.find(step => step.kind === 'reference-demo')!;
    expect(reference.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(reference.body).toContain('不可变快照');
    expect(reference.body).toContain('教学账本');
    expect(lesson198.guided.stages).toHaveLength(3);
    expect(lesson198.guided.stages[0]!.scaffoldSource).toContain('int take = /* TODO');
    expect(lesson198.guided.stages[1]!.scaffoldSource).toContain('int next = Math.max(skip, take);');
    expect(lesson198.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson198.guided.finalCheck).toBe('real-java-submit');
    expect(lesson198.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int twoBack = 0;');
  });

  it('links predictions, graded hints and independent wrong fixtures to real cases', () => {
    expect(lesson198.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson198.predictionChecks.map(check => check.checkpointId)).toEqual(['first-prefix', 'final-result']);
    expect(lesson198.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    const caseIds = new Set(lesson198.testSuite.cases.map(test => test.id));
    for (const error of lesson198.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    expect(lesson198.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([WRONG_FIXED_PARITY_SOURCE, WRONG_OVERWRITE_SOURCE]);
    for (const fixture of lesson198.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    }
    expect(lesson198.testSuite.wrongFixtures[0]!.targetedCaseIds[0]).toBe('mixed-parity');
  });
});
