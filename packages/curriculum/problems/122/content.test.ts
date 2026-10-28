import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, StockProfitIIInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson122 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('122 complete lesson contract (static content, not Java execution)', () => {
  it('validates meaningful cases and independent trusted expectations', () => {
    expect(LessonSchema.parse(lesson122)).toEqual(lesson122);
    expect(lesson122.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson122.testSuite.cases.length).toBeLessThanOrEqual(16);
    for (const item of lesson122.testSuite.cases) {
      expect(StockProfitIIInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('122', item.input));
      expect(item.coverage.trim().length).toBeGreaterThan(0);
    }
    for (const demo of demoInputs) expect(StockProfitIIInputSchema.safeParse(demo.input).success).toBe(true);
    expect(lesson122.testSuite.cases.find(item => item.id === 'several-waves')?.expected).toEqual({ kind: 'int', value: 7 });
    expect(lesson122.testSuite.cases.find(item => item.id === 'strict-fall')?.expected).toEqual({ kind: 'int', value: 0 });
  });

  it('binds exact Java source hash and all stable steps to intended statements', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson122.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-profit': 'int profit = 0;',
      'check-day': 'for (int day = 1; day < prices.length; day++) {',
      'compute-gain': 'int gain = prices[day] - prices[day - 1];',
      'check-positive': 'if (gain > 0) {',
      'add-gain': 'profit += gain;',
      'return-profit': 'return profit;',
    };
    const lines = REFERENCE_SOURCE.split('\n');
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('teaches all stages and keeps reference demonstration distinct from real student execution', () => {
    expect(new Set(lesson122.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson122.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson122.steps.find(step => step.kind === 'guided-code')!.body).toContain('真实 Docker runner');
    expect(lesson122.steps.find(step => step.kind === 'understanding')!.body).toContain('121');
    expect(lesson122.guided.stages).toHaveLength(3);
    expect(lesson122.guided.finalCheck).toBe('real-java-submit');
    expect(lesson122.independent.initialSource).toBe(STARTER_SOURCE);
    expect(lesson122.independent.initialSource).not.toContain('profit += gain;');
    expect(lesson122.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson122.predictionChecks).toHaveLength(3);
  });

  it('includes three Java wrong-answer fixtures and named counterexamples', () => {
    const cases = new Set(lesson122.testSuite.cases.map(item => item.id));
    expect(lesson122.testSuite.wrongFixtures).toHaveLength(3);
    for (const fixture of lesson122.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('public int maxProfit(int[] prices)');
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      expect(fixture.targetedCaseIds.every(id => cases.has(id))).toBe(true);
    }
    expect(lesson122.commonErrors.length).toBeGreaterThanOrEqual(3);
    expect(lesson122.commonErrors.every(item => cases.has(item.counterexampleInputId))).toBe(true);
  });
});
