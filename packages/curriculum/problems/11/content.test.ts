import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ContainerWaterInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson11 } from './content.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function enumerateArea(height: readonly number[]): number {
  let largest = 0;
  for (let i = 0; i < height.length; i++) for (let j = i + 1; j < height.length; j++) largest = Math.max(largest, (j - i) * Math.min(height[i]!, height[j]!));
  return largest;
}

describe('11 complete course (static checks, not Java execution)', () => {
  it('publishes valid cases whose expected areas also match independent pair enumeration', () => {
    expect(LessonSchema.parse(lesson11)).toEqual(lesson11);
    expect(lesson11.testSuite.cases).toHaveLength(12);
    for (const item of lesson11.testSuite.cases) {
      expect(ContainerWaterInputSchema.parse(item.input)).toEqual(item.input);
      expect(item.expected).toEqual(expectedOutput('11', item.input));
      if (item.input.height.length <= 30) expect(item.expected).toEqual({ kind: 'int', value: enumerateArea(item.input.height) });
      expect(item.coverage.length).toBeGreaterThan(10);
    }
    expect(lesson11.testSuite.cases.find(item => item.id === '11-inner-best')!.expected).toEqual({ kind: 'int', value: 15 });
    expect(lesson11.testSuite.cases.find(item => item.id === '11-tall-ends')!.expected).toEqual({ kind: 'int', value: 20 });
    expect(lesson11.testSuite.cases.find(item => item.id === '11-length-limit')!.expected).toEqual({ kind: 'int', value: 99990000 });
    expect(ContainerWaterInputSchema.safeParse({ height: [1] }).success).toBe(false);
    expect(ContainerWaterInputSchema.safeParse({ height: [0, -1] }).success).toBe(false);
    expect(ContainerWaterInputSchema.safeParse({ height: [10001, 2] }).success).toBe(false);
    for (const demo of demoInputs) expect(ContainerWaterInputSchema.parse(demo.input)).toEqual(demo.input);
  });

  it('binds the reference hash and step mapping to the exact displayed Java statements', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson11.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(lesson11.reference.algorithmVersion).toBe(ALGORITHM_VERSION);
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;',
      'init-right': 'int right = height.length - 1;',
      'init-best': 'int best = 0;',
      'check-loop': 'while (left < right) {',
      'compute-width': 'int width = right - left;',
      'compute-shorter': 'int shorter = Math.min(height[left], height[right]);',
      'compute-area': 'int area = width * shorter;',
      'update-best': 'best = Math.max(best, area);',
      'choose-side': 'if (height[left] <= height[right]) {',
      'move-left': 'left++;',
      'move-right': 'right--;',
      'return-best': 'return best;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('includes the learning path, independent skeleton and three complete-source scaffolds', () => {
    expect(new Set(lesson11.steps.map(step => step.kind))).toEqual(new Set(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(lesson11.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson11.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson11.guided.stages).toHaveLength(3);
    expect(lesson11.guided.stages[0]!.scaffoldSource).toContain('int area = 0;');
    expect(lesson11.guided.stages[1]!.scaffoldSource).toContain('请补全指针移动');
    expect(lesson11.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson11.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson11.guided.finalCheck).toBe('real-java-submit');
    expect(lesson11.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Math.min');
    expect(lesson11.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson11.predictionChecks.map(check => check.checkpointId)).toEqual(['first-area', 'first-side']);
    expect(lesson11.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
  });

  it('links concrete counterexamples and distinct wrong Java fixtures for real runner checks', () => {
    const cases = new Set(lesson11.testSuite.cases.map(item => item.id));
    expect(lesson11.commonErrors.length).toBeGreaterThanOrEqual(3);
    for (const error of lesson11.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    expect(lesson11.testSuite.wrongFixtures).toHaveLength(3);
    expect(new Set(lesson11.testSuite.wrongFixtures.map(fixture => fixture.source)).size).toBe(3);
    for (const fixture of lesson11.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('public int maxArea(int[] height)');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(cases.has(caseId)).toBe(true);
    }
    expect(lesson11.testSuite.wrongFixtures[0]!.targetedCaseIds[0]).toBe('11-inner-best');
  });
});
