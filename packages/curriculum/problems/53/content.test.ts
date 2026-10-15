import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MaximumSubarrayInputSchema, expectedOutput } from '@jab/contracts';
import {
  WRONG_EMPTY_ALLOWED_SOURCE,
  WRONG_MAX_ELEMENT_SOURCE,
  WRONG_NONCONTIGUOUS_SOURCE,
  demoInputs,
  lesson53,
} from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('53 maximum subarray curriculum (static content, not Java execution)', () => {
  it('conforms to the shared contract with meaningful cases and coverage notes', () => {
    expect(LessonSchema.parse(lesson53)).toEqual(lesson53);
    expect(lesson53.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson53.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson53.testSuite.cases) {
      expect(MaximumSubarrayInputSchema.parse(item.input)).toEqual(item.input);
      expect(item.expected).toEqual(expectedOutput('53', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(MaximumSubarrayInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(lesson53.testSuite.cases.find(item => item.id === 'all-negative-case')?.expected).toEqual({ kind: 'int', value: -2 });
    expect(lesson53.testSuite.cases.find(item => item.id === 'cross-small-valley')?.expected).toEqual({ kind: 'int', value: 7 });
  });

  it('matches LF source hash and every model step to its exact Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson53.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-current': 'int current = nums[0];',
      'init-best': 'int best = nums[0];',
      'check-index': 'for (int i = 1; i < nums.length; i++) {',
      'read-value': 'int value = nums[i];',
      'update-current': 'current = Math.max(value, current + value);',
      'update-best': 'best = Math.max(best, current);',
      'return-best': 'return best;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides all teaching steps, three scaffolds and independent skeleton', () => {
    expect(new Set(lesson53.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson53.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson53.steps.find(step => step.kind === 'reference-demo')!.body).toContain('不可变快照');
    expect(lesson53.guided.stages).toHaveLength(3);
    expect(lesson53.guided.stages[0]!.scaffoldSource).toContain('int value = nums[i];');
    expect(lesson53.guided.stages[1]!.scaffoldSource).toContain('current = Math.max(value, current + value);');
    expect(lesson53.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson53.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson53.guided.finalCheck).toBe('real-java-submit');
    expect(lesson53.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int current = nums[0];');
  });

  it('links dynamic checkpoints, hints, counterexamples and wrong fixtures', () => {
    const caseIds = new Set(lesson53.testSuite.cases.map(item => item.id));
    expect(lesson53.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson53.visualization.inputIds).toEqual(demoInputs.map(item => item.id));
    expect(lesson53.predictionChecks.map(item => item.checkpointId)).toEqual(['initial-current', 'final-result']);
    expect(lesson53.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson53.commonErrors.length).toBeGreaterThanOrEqual(3);
    for (const error of lesson53.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    const wrongSources = [WRONG_EMPTY_ALLOWED_SOURCE, WRONG_MAX_ELEMENT_SOURCE, WRONG_NONCONTIGUOUS_SOURCE];
    expect(new Set(wrongSources).size).toBe(wrongSources.length);
    for (const fixture of lesson53.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
  });
});
