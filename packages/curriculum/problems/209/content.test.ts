import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MinimumSubarrayInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson209 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('209 curriculum contract and teaching checks (not Java execution)', () => {
  it('validates every published input and independently computed expected output', () => {
    expect(LessonSchema.parse(lesson209)).toEqual(lesson209);
    expect(lesson209.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson209.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const test of lesson209.testSuite.cases) {
      expect(MinimumSubarrayInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected).toEqual(expectedOutput('209', test.input));
      expect(test.coverage.length).toBeGreaterThan(10);
    }
    expect(lesson209.testSuite.cases.find(test => test.id === '209-maximum-length')!.input.nums).toHaveLength(10000);
    for (const demo of demoInputs) expect(MinimumSubarrayInputSchema.parse(demo.input)).toEqual(demo.input);
  });

  it('maps each model step to the exact statement in the hashed Java source', () => {
    const statements: Record<string, string> = {
      'init-left': 'int left = 0;',
      'init-sum': 'int sum = 0;',
      'init-best': 'int best = nums.length + 1;',
      'check-right': 'for (int right = 0; right < nums.length; right++) {',
      'include-right': 'sum += nums[right];',
      'check-target': 'while (sum >= target) {',
      'update-best': 'best = Math.min(best, right - left + 1);',
      'remove-left': 'sum -= nums[left];',
      'move-left': 'left++;',
      'move-right': 'for (int right = 0; right < nums.length; right++) {',
      'return-result': 'return best == nums.length + 1 ? 0 : best;',
    };
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson209.reference.sourceHash);
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(lines[mapping.startLine - 1]!.trim()).toBe(statements[mapping.stepId]);
      expect(mapping.endLine).toBe(mapping.startLine);
    }
  });

  it('keeps demonstrations, practice and real Java submission distinct', () => {
    expect(new Set(lesson209.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson209.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson209.steps.find(step => step.kind === 'reference-demo')!.body).toContain('不可变快照');
    expect(lesson209.guided.stages).toHaveLength(3);
    expect(lesson209.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson209.guided.finalCheck).toBe('real-java-submit');
    expect(lesson209.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson209.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int left = 0;');
    expect(lesson209.siteLimits.description).toContain('严格正数');
    expect(lesson209.taskSemantics).toContain('连续');
  });

  it('connects hints, counterexamples and wrong fixtures to valid teaching cases', () => {
    const caseIds = new Set(lesson209.testSuite.cases.map(test => test.id));
    expect(lesson209.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson209.commonErrors.length).toBeGreaterThanOrEqual(3);
    for (const error of lesson209.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    expect(lesson209.testSuite.wrongFixtures).toHaveLength(2);
    expect(new Set(lesson209.testSuite.wrongFixtures.map(fixture => fixture.source)).size).toBe(2);
    for (const fixture of lesson209.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    }
    expect(lesson209.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
  });

  it('matches default static predictions to the input-derived checkpoints', async () => {
    const trace = await buildReferenceTrace(demoInputs[0]!.input, demoInputs[0]!.id);
    const actual = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
    expect(actual.map(item => item.answer)).toEqual(lesson209.predictionChecks.map(item => item.answer));
    for (const [index, check] of lesson209.predictionChecks.entries()) {
      expect(actual[index]!.checkpointId.endsWith(`:${check.checkpointId}`)).toBe(true);
    }
  });
});
