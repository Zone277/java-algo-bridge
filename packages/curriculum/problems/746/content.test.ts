import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MinCostStairsInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson746, WRONG_FIXED_PARITY_SOURCE, WRONG_FIXED_START_SOURCE } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('746 complete course (static checks, not Java execution)', () => {
  it('validates all published coverage and independently expected outputs', () => {
    expect(LessonSchema.parse(lesson746)).toEqual(lesson746);
    expect(lesson746.testSuite.cases).toHaveLength(13);
    for (const test of lesson746.testSuite.cases) {
      expect(MinCostStairsInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected, test.id).toEqual(expectedOutput('746', test.input));
      expect(test.coverage.length).toBeGreaterThan(10);
    }
    for (const demo of demoInputs) expect(MinCostStairsInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(lesson746.testSuite.cases.at(-1)!.input.cost).toHaveLength(1000);
    expect(lesson746.testSuite.cases.at(-1)!.expected).toEqual({ kind: 'int', value: 499500 });
  });

  it('maps each reference microstep to the exact statement and LF source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson746.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-two-back': 'int twoBack = 0;',
      'init-one-back': 'int oneBack = 0;',
      'check-destination': 'for (int i = 2; i <= cost.length; i++) {',
      'compute-from-one': 'int fromOne = oneBack + cost[i - 1];',
      'compute-from-two': 'int fromTwo = twoBack + cost[i - 2];',
      'compute-next': 'int next = Math.min(fromOne, fromTwo);',
      'shift-two-back': 'twoBack = oneBack;',
      'shift-one-back': 'oneBack = next;',
      'return-cost': 'return oneBack;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('supplies all learning stages and keeps independent mode a skeleton', () => {
    expect(new Set(lesson746.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson746.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    const body = lesson746.steps.find(step => step.kind === 'reference-demo')!.body;
    expect(body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(body).toContain('同一不可变快照');
    expect(body).toContain('D(k+2)');
    expect(lesson746.guided.stages).toHaveLength(3);
    expect(lesson746.guided.stages[0]!.scaffoldSource).toContain('int fromOne = /* TODO');
    expect(lesson746.guided.stages[1]!.scaffoldSource).toContain('int next = Math.min(fromOne, fromTwo);');
    expect(lesson746.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson746.guided.finalCheck).toBe('real-java-submit');
    expect(lesson746.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int twoBack = 0;');
  });

  it('links predictions, hints, errors and both wrong fixture targets to published cases', () => {
    expect(lesson746.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson746.predictionChecks.map(check => check.checkpointId)).toEqual(['first-arrival', 'final-cost']);
    expect(lesson746.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    const cases = new Map(lesson746.testSuite.cases.map(test => [test.id, test]));
    for (const error of lesson746.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    expect(lesson746.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([WRONG_FIXED_PARITY_SOURCE, WRONG_FIXED_START_SOURCE]);
    for (const fixture of lesson746.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(cases.has(id)).toBe(true);
    }
    expect(lesson746.testSuite.wrongFixtures[0]!.targetedCaseIds[0]).toBe('mixed-parity');
    // Independent arithmetic checks of the published counterexamples; actual Java is tested by the runner suite.
    const parity = (cost: number[]) => Math.min(
      cost.reduce((sum, value, i) => sum + (i % 2 === 0 ? value : 0), 0),
      cost.reduce((sum, value, i) => sum + (i % 2 === 1 ? value : 0), 0),
    );
    for (const id of lesson746.testSuite.wrongFixtures[0]!.targetedCaseIds) {
      const test = cases.get(id)!;
      expect({ kind: 'int', value: parity(test.input.cost) }).not.toEqual(test.expected);
    }
  });
});
