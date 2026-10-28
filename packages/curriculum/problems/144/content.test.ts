import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TreeInputSchema, expectedOutput } from '@jab/contracts';
import { INORDER_SOURCE, RIGHT_FIRST_SOURCE, demoInputs, lesson144 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('144 lesson content', () => {
  it('validates a complete original lesson, stable source hash and progressive practice', () => {
    expect(LessonSchema.safeParse(lesson144)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson144.reference.sourceHash);
    expect(lesson144.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson144.predictionChecks).toHaveLength(2);
    expect(lesson144.guided.stages).toHaveLength(3);
    expect(lesson144.guided.finalCheck).toBe('real-java-submit');
    expect(lesson144.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson144.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('result.add(node.val)');
    expect(lesson144.commonErrors).toHaveLength(5);
    expect(REFERENCE_STEP_MAP.map(step => step.stepId)).toContain('visit-node');
  });

  it('defines eleven valid judged inputs with distinct boundary and order cases', () => {
    expect(lesson144.testSuite.cases).toHaveLength(11);
    for (const testCase of lesson144.testSuite.cases) {
      expect(TreeInputSchema.safeParse(testCase.input).success).toBe(true);
      expect(testCase.expected).toEqual(expectedOutput('144', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(8);
    }
    expect(lesson144.testSuite.cases.find(testCase => testCase.id === 'empty-case')?.expected).toEqual({ kind: 'int-array', values: [] });
    expect(lesson144.testSuite.cases.find(testCase => testCase.id === 'balanced-case')?.expected).toEqual({ kind: 'int-array', values: [8, 4, 2, 6, 12, 10, 14] });
    expect(lesson144.testSuite.cases.find(testCase => testCase.id === 'repeated-values-case')?.expected).toEqual({ kind: 'int-array', values: [5, 5, 5, 5, 5] });
    expect(lesson144.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')?.expected).toEqual({ kind: 'int-array', values: Array(128).fill(1) });
    expect(demoInputs.map(input => input.id)).toEqual(['balanced-tree', 'compact-null', 'repeated-values', 'empty-tree']);
  });

  it('provides two compilable-shape wrong algorithms with named counterexamples', () => {
    expect(lesson144.testSuite.wrongFixtures).toHaveLength(2);
    expect(INORDER_SOURCE).toContain('visit(node.left, result);\n        result.add(node.val);');
    expect(RIGHT_FIRST_SOURCE).toContain('visit(node.right, result);\n        visit(node.left, result);');
    expect(lesson144.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('balanced-case');
    expect(lesson144.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('asymmetric-case');
    const balanced = lesson144.testSuite.cases.find(testCase => testCase.id === 'balanced-case')!;
    expect(balanced.expected).not.toEqual({ kind: 'int-array', values: [2, 4, 6, 8, 10, 12, 14] });
    expect(balanced.expected).not.toEqual({ kind: 'int-array', values: [8, 12, 14, 10, 4, 6, 2] });
  });

  it('keeps compact queue input semantics and rejects orphan tokens', () => {
    expect(TreeInputSchema.safeParse({ root: [1, null, 2, 3] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [null] }).success).toBe(false);
  });
});
