import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MaxProfitInputSchema, expectedOutput } from '@jab/contracts';
import {
  WRONG_IGNORES_ORDER_SOURCE,
  WRONG_SUM_RISES_SOURCE,
  WRONG_ZERO_MINIMUM_SOURCE,
  demoInputs,
  lesson121,
} from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('121 complete curriculum contract (static content checks, not Java execution)', () => {
  it('validates the lesson, 8-16 meaningful cases and every expected result', () => {
    expect(LessonSchema.parse(lesson121)).toEqual(lesson121);
    expect(lesson121.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson121.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson121.testSuite.cases) {
      expect(MaxProfitInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('121', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(MaxProfitInputSchema.safeParse(demo.input).success).toBe(true);
    expect(lesson121.testSuite.cases.find(item => item.id === 'strictly-decreasing')?.expected).toEqual({ kind: 'int', value: 0 });
    expect(lesson121.testSuite.cases.find(item => item.id === 'multiple-rises')?.expected).toEqual({ kind: 'int', value: 4 });
  });

  it('binds the exact LF source hash and every model step to a Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson121.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-min': 'int minPrice = prices[0];',
      'init-best': 'int best = 0;',
      'check-day': 'for (int day = 1; day < prices.length; day++) {',
      'read-today': 'int today = prices[day];',
      'compute-profit': 'int profit = today - minPrice;',
      'update-best': 'best = Math.max(best, profit);',
      'update-min': 'minPrice = Math.min(minPrice, today);',
      'return-best': 'return best;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('covers all eight teaching step kinds and keeps reference animation separate from execution', () => {
    expect(new Set(lesson121.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    const referenceStep = lesson121.steps.find(step => step.kind === 'reference-demo')!;
    expect(referenceStep.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(referenceStep.body).toContain('不可变快照');
    expect(lesson121.steps.find(step => step.kind === 'guided-code')?.body).toContain('真实 runner');
  });

  it('provides three guided stages, an empty independent skeleton and a real final check', () => {
    expect(lesson121.guided.stages).toHaveLength(3);
    expect(lesson121.guided.stages[0]!.scaffoldSource).toContain('int today = prices[day];');
    expect(lesson121.guided.stages[1]!.scaffoldSource).toContain('int profit = today - minPrice;');
    expect(lesson121.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson121.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson121.guided.finalCheck).toBe('real-java-submit');
    expect(lesson121.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int minPrice = prices[0];');
  });

  it('links two predictions, three hints, counterexamples and distinct wrong Java fixtures', () => {
    const caseIds = new Set<string>(lesson121.testSuite.cases.map(item => item.id));
    expect(demoInputs.map(item => item.id)).toEqual(lesson121.visualization.inputIds);
    expect(lesson121.predictionChecks.map(item => item.checkpointId)).toEqual(['initial-minimum', 'final-result']);
    expect(lesson121.predictionChecks.map(item => item.answer)).toEqual([
      { kind: 'int', value: 7 },
      { kind: 'int', value: 5 },
    ]);
    expect(lesson121.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson121.commonErrors.length).toBeGreaterThanOrEqual(3);
    for (const error of lesson121.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);

    const wrongSources = [WRONG_SUM_RISES_SOURCE, WRONG_ZERO_MINIMUM_SOURCE, WRONG_IGNORES_ORDER_SOURCE];
    expect(new Set(wrongSources).size).toBe(wrongSources.length);
    for (const fixture of lesson121.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
  });
});
