import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TreeInputSchema, expectedOutput } from '@jab/contracts';
import { ROOT_FIRST_SOURCE, RIGHT_FIRST_SOURCE, demoInputs, lesson94 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('94 inorder lesson', () => {
  it('provides complete validated learning content and a real-run final check', () => {
    expect(LessonSchema.safeParse(lesson94)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson94.reference.sourceHash);
    expect(lesson94.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson94.prerequisites).toEqual(expect.arrayContaining(['J1', 'J3', 'J5', 'J7', 'J8']));
    expect(lesson94.predictionChecks).toHaveLength(2);
    expect(lesson94.guided.stages).toHaveLength(3);
    expect(lesson94.guided.finalCheck).toBe('real-java-submit');
    expect(lesson94.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson94.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('result.add(node.val)');
    expect(lesson94.commonErrors.length).toBeGreaterThanOrEqual(3);
    expect(REFERENCE_STEP_MAP.map(step => step.stepId)).toContain('visit-node');
  });

  it('has eleven valid cases and correct, independently calculated outputs', () => {
    expect(lesson94.testSuite.cases).toHaveLength(11);
    for (const testCase of lesson94.testSuite.cases) {
      expect(TreeInputSchema.safeParse(testCase.input).success).toBe(true);
      expect(testCase.expected).toEqual(expectedOutput('94', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(8);
    }
    const byId = new Map(lesson94.testSuite.cases.map(testCase => [testCase.id, testCase]));
    expect(byId.get('empty-case')?.expected).toEqual({ kind: 'int-array', values: [] });
    expect(byId.get('compact-null-case')?.expected).toEqual({ kind: 'int-array', values: [1, 3, 2] });
    expect(byId.get('left-skew-case')?.expected).toEqual({ kind: 'int-array', values: [4, 3, 2, 1] });
    expect(byId.get('depth-limit-case')?.expected).toEqual({ kind: 'int-array', values: Array(128).fill(1) });
    expect(demoInputs.map(input => input.id)).toEqual(['balanced-tree', 'compact-null', 'repeated-values', 'empty-tree']);
  });

  it('includes two compilable wrong traversals and named detecting cases', () => {
    expect(lesson94.testSuite.wrongFixtures).toHaveLength(2);
    expect(ROOT_FIRST_SOURCE).toContain('result.add(node.val);\n        visit(node.left, result);');
    expect(RIGHT_FIRST_SOURCE).toContain('visit(node.right, result);\n        result.add(node.val);');
    expect(lesson94.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('compact-null-case');
    expect(lesson94.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('asymmetric-case');
    expect(expectedOutput('94', { root: [1, null, 2, 3] })).not.toEqual({ kind: 'int-array', values: [1, 2, 3] });
  });

  it('uses compact queue semantics and rejects invalid orphan tokens', () => {
    expect(TreeInputSchema.safeParse({ root: [1, null, 2, 3] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [null] }).success).toBe(false);
  });
});
