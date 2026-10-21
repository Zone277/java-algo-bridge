import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RotatedSearchInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson33 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('33 complete course contract (static checks, not Java execution)', () => {
  it('validates all sixteen cases, coverage and maximum-size input', () => {
    expect(LessonSchema.parse(lesson33)).toEqual(lesson33);
    expect(lesson33.testSuite.cases).toHaveLength(16);
    for (const test of lesson33.testSuite.cases) {
      expect(RotatedSearchInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('33', test.input));
      expect(test.coverage.length).toBeGreaterThan(15);
    }
    for (const demo of demoInputs) expect(RotatedSearchInputSchema.parse(demo.input)).toEqual(demo.input);
    const maximum = lesson33.testSuite.cases.find(test => test.id === '33-length-limit')!;
    expect(maximum.input.nums).toHaveLength(5000);
    expect(maximum.expected).toEqual({ kind: 'int', value: 2500 });
  });

  it('maps every statement, including both distinct left/right assignments, to exact lines', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson33.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;', 'init-right': 'int right = nums.length - 1;',
      'check-loop': 'while (left <= right) {', 'compute-mid': 'int mid = left + (right - left) / 2;',
      'check-equal': 'if (nums[mid] == target) {', found: 'return mid;',
      'check-left-sorted': 'if (nums[left] <= nums[mid]) {',
      'check-left-range': 'if (nums[left] <= target && target < nums[mid]) {',
      'keep-left': 'right = mid - 1;', 'discard-left': 'left = mid + 1;',
      'check-right-range': 'if (nums[mid] < target && target <= nums[right]) {',
      'keep-right': 'left = mid + 1;', 'discard-right': 'right = mid - 1;',
      'not-found': 'return -1;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.startLine)).size).toBe(REFERENCE_STEP_MAP.length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides full teaching route, three stages, independent skeleton and three-level hints', () => {
    expect(new Set(lesson33.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson33.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson33.steps.find(step => step.kind === 'reference-demo')!.body).toContain('不可变快照');
    expect(lesson33.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson33.guided.stages).toHaveLength(3);
    expect(lesson33.guided.stages[0]!.scaffoldSource).toContain('/* TODO');
    expect(lesson33.guided.stages[1]!.scaffoldSource).toContain('TODO：目标是否在有序左半');
    expect(lesson33.guided.stages[1]!.scaffoldSource).toContain('TODO：目标是否在有序右半');
    expect(lesson33.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson33.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('while (');
    expect(lesson33.guided.finalCheck).toBe('real-java-submit');
    expect(lesson33.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
  });

  it('connects all common errors and two wrong Java fixtures to named counterexamples', () => {
    expect(lesson33.predictionChecks.map(check => check.checkpointId)).toEqual(['first-mid', 'final-result']);
    const cases = new Set(lesson33.testSuite.cases.map(test => test.id));
    for (const error of lesson33.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    expect(lesson33.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson33.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(cases.has(id)).toBe(true);
    }
    expect(lesson33.testSuite.wrongFixtures[0]!.targetedCaseIds[0]).toBe('33-left-segment');
  });
});
