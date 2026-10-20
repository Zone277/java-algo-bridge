import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RotatedMinimumInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson153 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('153 curriculum completeness (static checks, not Java execution)', () => {
  it('validates every case and explicit coverage against the input contract', () => {
    expect(LessonSchema.parse(lesson153)).toEqual(lesson153);
    expect(lesson153.testSuite.cases).toHaveLength(13);
    for (const test of lesson153.testSuite.cases) {
      expect(RotatedMinimumInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('153', test.input));
      expect(test.coverage.length).toBeGreaterThan(15);
    }
    for (const demo of demoInputs) expect(RotatedMinimumInputSchema.parse(demo.input)).toEqual(demo.input);
    const maximum = lesson153.testSuite.cases.find(test => test.id === '153-length-limit')!;
    expect(maximum.input.nums).toHaveLength(5000);
    expect(maximum.expected).toEqual({ kind: 'int', value: -2500 });
  });

  it('maps each microstep to its exact reference statement and LF source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson153.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;', 'init-right': 'int right = nums.length - 1;',
      'check-loop': 'while (left < right) {', 'compute-mid': 'int mid = left + (right - left) / 2;',
      'compare-right': 'if (nums[mid] > nums[right]) {', 'move-left': 'left = mid + 1;',
      'keep-mid': 'right = mid;', 'return-min': 'return nums[left];',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides a complete learning route with separate real execution and skeletons', () => {
    expect(new Set(lesson153.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson153.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson153.steps.find(step => step.kind === 'reference-demo')!.body).toContain('不可变快照');
    expect(lesson153.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson153.guided.stages).toHaveLength(3);
    expect(lesson153.guided.stages[0]!.scaffoldSource).toContain('/* TODO');
    expect(lesson153.guided.stages[1]!.scaffoldSource).toContain('请补全两个分支');
    expect(lesson153.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson153.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('while (');
    expect(lesson153.guided.finalCheck).toBe('real-java-submit');
    expect(lesson153.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
  });

  it('links specific counterexamples and exactly two checkpoint contracts', () => {
    expect(lesson153.predictionChecks.map(check => check.checkpointId)).toEqual(['first-candidate', 'final-result']);
    const cases = new Set(lesson153.testSuite.cases.map(test => test.id));
    for (const error of lesson153.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    expect(lesson153.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson153.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(cases.has(id)).toBe(true);
    }
    expect(lesson153.testSuite.wrongFixtures[0]!.targetedCaseIds[0]).toBe('153-mid-minimum');
  });
});
