import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClimbStairsInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson70 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('70 complete curriculum contract (static content checks, not Java execution)', () => {
  it('validates the lesson and all expected counts including 1, 2, 3 and 45', () => {
    expect(LessonSchema.parse(lesson70)).toEqual(lesson70);
    expect(lesson70.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson70.testSuite.cases.map(item => item.input.n)).toEqual(expect.arrayContaining([1, 2, 3, 45]));
    for (const item of lesson70.testSuite.cases) {
      expect(ClimbStairsInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('70', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(ClimbStairsInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the exact LF source hash and each model step to the reference Java line', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson70.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'check-base': 'if (n == 1) return 1;',
      'return-base': 'if (n == 1) return 1;',
      'init-previous': 'int previous = 1;',
      'init-current': 'int current = 2;',
      'check-loop': 'for (int step = 3; step <= n; step++) {',
      'compute-next': 'int next = previous + current;',
      'move-previous': 'previous = current;',
      'move-current': 'current = next;',
      'return-current': 'return current;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides three guided stages, a blank independent skeleton and a real final check', () => {
    expect(lesson70.guided.stages).toHaveLength(3);
    expect(lesson70.guided.stages[0]!.scaffoldSource).toContain('int[] ways = new int[n + 1];');
    expect(lesson70.guided.stages[1]!.scaffoldSource).toContain('int next = previous + current;');
    expect(lesson70.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson70.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson70.guided.finalCheck).toBe('real-java-submit');
    expect(lesson70.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int previous = 1;');
  });

  it('links two dynamic prediction anchors and targeted counterexamples for each wrong source', () => {
    const caseIds = new Set<string>(lesson70.testSuite.cases.map(item => item.id));
    expect(demoInputs.map(item => item.id)).toEqual(lesson70.visualization.inputIds);
    expect(lesson70.predictionChecks.map(item => item.checkpointId)).toEqual(['base-decision', 'final-result']);
    const basePrediction = lesson70.predictionChecks[0]!;
    expect(basePrediction.answer).toEqual({ kind: 'choice', optionId: 'continue' });
    expect(basePrediction.options?.map(option => option.id)).toEqual(['return-base', 'continue']);
    expect(lesson70.testSuite.wrongFixtures.map(item => item.id)).toEqual([
      'wrong-both-bases-one',
      'wrong-loop-stops-early',
      'wrong-overwrite-before-sum',
    ]);
    for (const fixture of lesson70.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson70.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
