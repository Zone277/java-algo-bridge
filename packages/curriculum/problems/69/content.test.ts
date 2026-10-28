import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SqrtInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson69 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_ROUND_NEAREST_SOURCE, WRONG_STRICT_SQUARE_SOURCE } from './reference.js';

describe('69 lesson contract (static checks, not Java execution)', () => {
  it('validates published cases and their integer-square-root boundary', () => {
    expect(LessonSchema.parse(lesson69)).toEqual(lesson69);
    expect(lesson69.testSuite.cases).toHaveLength(15);
    for (const testCase of lesson69.testSuite.cases) {
      expect(SqrtInputSchema.safeParse(testCase.input).success).toBe(true);
      expect(testCase.expected).toEqual(expectedOutput('69', testCase.input));
      const root = testCase.expected.value;
      const x = BigInt(testCase.input.x);
      expect(BigInt(root) * BigInt(root) <= x, testCase.id).toBe(true);
      expect(BigInt(root + 1) * BigInt(root + 1) > x, testCase.id).toBe(true);
      expect(testCase.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(SqrtInputSchema.safeParse(demo.input).success).toBe(true);
    expect(demoInputs.map(item => item.input.x)).toEqual([8, 16, 0, 1, 2147483647]);
    expect(SqrtInputSchema.safeParse({ x: -1 }).success).toBe(false);
    expect(SqrtInputSchema.safeParse({ x: 2147483648 }).success).toBe(false);
  });

  it('ties the exact reference hash and each trace step to the executed Java statement', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson69.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const anchors: Record<string, string> = {
      'check-small': 'if (x < 2) {', 'return-small': 'return x;',
      'init-left': 'int left = 1;', 'init-right': 'int right = x / 2;', 'init-answer': 'int answer = 1;',
      'check-loop': 'while (left <= right) {', 'compute-mid': 'int mid = left + (right - left) / 2;',
      'compare-square': 'if (mid <= x / mid) {', 'record-answer': 'answer = mid;',
      'move-left': 'left = mid + 1;', 'move-right': 'right = mid - 1;', 'return-answer': 'return answer;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(anchors).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]?.trim(), step.stepId).toBe(anchors[step.stepId]);
    }
  });

  it('has progressive scaffolds, three hints and a bare independent skeleton', () => {
    expect(lesson69.guided.stages).toHaveLength(3);
    expect(lesson69.guided.stages[0]?.scaffoldSource).toContain('false /* TODO');
    expect(lesson69.guided.stages[1]?.scaffoldSource).toContain('请完成二分搜索');
    expect(lesson69.guided.stages[2]?.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson69.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson69.guided.finalCheck).toBe('real-java-submit');
    expect(lesson69.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('int left = 1;');
    expect(lesson69.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
  });

  it('links demos, prediction checks, wrong fixtures and named counterexamples', () => {
    expect(lesson69.visualization.inputIds).toEqual(demoInputs.map(item => item.id));
    expect(lesson69.predictionChecks.map(check => check.checkpointId)).toEqual(['small-branch', 'first-mid', 'final-root']);
    const caseIds = new Set(lesson69.testSuite.cases.map(item => item.id));
    expect(lesson69.testSuite.wrongFixtures).toHaveLength(2);
    expect(lesson69.testSuite.wrongFixtures.map(item => item.source)).toEqual([WRONG_ROUND_NEAREST_SOURCE, WRONG_STRICT_SQUARE_SOURCE]);
    for (const fixture of lesson69.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    }
    for (const error of lesson69.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
