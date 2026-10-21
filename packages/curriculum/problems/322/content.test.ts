import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CoinChangeInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson322 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('322 complete course, static checks only', () => {
  it('validates all published cases and independent expected answers', () => {
    expect(LessonSchema.parse(lesson322)).toEqual(lesson322);
    expect(lesson322.testSuite.cases).toHaveLength(14);
    for (const test of lesson322.testSuite.cases) {
      expect(CoinChangeInputSchema.parse(test.input)).toEqual(test.input);
      expect(test.expected, test.id).toEqual(expectedOutput('322', test.input));
      expect(test.coverage.length).toBeGreaterThan(10);
    }
    for (const demo of demoInputs) expect(CoinChangeInputSchema.parse(demo.input)).toEqual(demo.input);
  });

  it('maps every microstep to the intended Java statement and LF source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson322.reference.sourceHash);
    const statements: Record<string, string> = {
      'init-sentinel': 'int unreachable = amount + 1;',
      'allocate-dp': 'int[] dp = new int[amount + 1];',
      'fill-dp': 'Arrays.fill(dp, unreachable);',
      'set-zero': 'dp[0] = 0;',
      'check-value': 'for (int value = 1; value <= amount; value++) {',
      'check-coin': 'for (int j = 0; j < coins.length; j++) {',
      'read-coin': 'int coin = coins[j];',
      'check-fit': 'if (coin <= value) {',
      'update-dp': 'dp[value] = Math.min(dp[value], dp[value - coin] + 1);',
      'return-count': 'return dp[amount] == unreachable ? -1 : dp[amount];',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(REFERENCE_SOURCE.split('\n')[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBe(step.startLine);
    }
  });

  it('provides all learning stages, separate hints, and independent skeleton', () => {
    expect(new Set(lesson322.steps.map(step => step.kind))).toEqual(new Set(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(lesson322.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson322.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Arrays.fill');
    expect(lesson322.guided.stages).toHaveLength(3);
    expect(lesson322.guided.stages[0]!.scaffoldSource).toContain('TODO');
    expect(lesson322.guided.stages[1]!.scaffoldSource).toContain('TODO');
    expect(lesson322.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson322.guided.finalCheck).toBe('real-java-submit');
    expect(lesson322.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson322.visualization.inputIds).toEqual(demoInputs.map(demo => demo.id));
    expect(lesson322.predictionChecks.map(check => check.checkpointId)).toEqual(['sentinel', 'final-count']);
  });

  it('documents counterexamples whose faulty strategies return wrong numbers', () => {
    const cases = new Map(lesson322.testSuite.cases.map(test => [test.id, test]));
    for (const error of lesson322.commonErrors) expect(cases.has(error.counterexampleInputId)).toBe(true);
    const greedy = (coins: number[], amount: number) => {
      let count = 0;
      for (const coin of [...coins].sort((a, b) => b - a)) { count += Math.floor(amount / coin); amount %= coin; }
      return amount === 0 ? count : -1;
    };
    const once = (coins: number[], amount: number) => {
      let best = Infinity;
      for (let mask = 0; mask < 2 ** coins.length; mask++) {
        let sum = 0; let count = 0;
        for (let j = 0; j < coins.length; j++) if ((mask & 2 ** j) !== 0) { sum += coins[j]!; count++; }
        if (sum === amount) best = Math.min(best, count);
      }
      return Number.isFinite(best) ? best : -1;
    };
    for (const [index, fixture] of lesson322.testSuite.wrongFixtures.entries()) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) {
        const test = cases.get(id)!;
        expect(test).toBeDefined();
        expect({ kind: 'int', value: (index === 0 ? greedy : once)(test.input.coins, test.input.amount) }, id).not.toEqual(test.expected);
      }
    }
  });
});
