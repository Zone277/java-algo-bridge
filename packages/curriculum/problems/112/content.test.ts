import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, PathSumInputSchema, expectedOutput } from '@jab/contracts';
import { LEFT_ONLY_SOURCE, NONLEAF_MATCH_SOURCE, demoInputs, lesson112 } from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('112 lesson content', () => {
  it('validates metadata, independent skeleton, source hash and full learning flow', () => {
    expect(LessonSchema.safeParse(lesson112)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson112.reference.sourceHash);
    expect(lesson112.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson112.guided.stages).toHaveLength(3);
    expect(lesson112.guided.finalCheck).toBe('real-java-submit');
    expect(lesson112.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson112.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson112.independent.initialSource).not.toContain('return hasPathSum');
    expect(lesson112.independent.initialSource).not.toContain('remaining == 0');
  });

  it('covers empty, zero, nonleaf, both branches, negative values and depth boundary', () => {
    expect(lesson112.testSuite.cases).toHaveLength(13);
    for (const testCase of lesson112.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('112', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(10);
    }
    const byId = new Map(lesson112.testSuite.cases.map(testCase => [testCase.id, testCase]));
    for (const id of ['empty-case', 'nonleaf-match-case', 'all-miss-case', 'cross-branch-case']) {
      expect(byId.get(id)?.expected).toEqual({ kind: 'boolean', value: false });
    }
    for (const id of ['single-zero-case', 'left-found-case', 'right-found-case', 'negative-case', 'right-only-case', 'depth-limit-case']) {
      expect(byId.get(id)?.expected).toEqual({ kind: 'boolean', value: true });
    }
    expect(demoInputs.map(demo => demo.id)).toEqual(['target-found', 'nonleaf-match', 'negative-path', 'empty-tree']);
  });

  it('ships two compiling-shape wrong fixtures with actual counterexample cases', () => {
    expect(lesson112.testSuite.wrongFixtures).toHaveLength(2);
    expect(NONLEAF_MATCH_SOURCE).toContain('if (root.val == targetSum) return true;');
    expect(LEFT_ONLY_SOURCE).toContain('return hasPathSum(root.left, remaining);');
    expect(lesson112.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('nonleaf-match-case');
    expect(lesson112.testSuite.wrongFixtures[1]!.targetedCaseIds).toEqual(expect.arrayContaining(['right-only-case', 'right-found-case']));
    expect(expectedOutput('112', { root: [5, 4, 8], targetSum: 5 })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('112', { root: [1, 2, 3], targetSum: 4 })).toEqual({ kind: 'boolean', value: true });
  });

  it('validates compact tree and signed target boundaries', () => {
    expect(PathSumInputSchema.safeParse({ root: [], targetSum: 0 }).success).toBe(true);
    expect(PathSumInputSchema.safeParse({ root: [1, null, 2, 3], targetSum: -1000 }).success).toBe(true);
    expect(PathSumInputSchema.safeParse({ root: [1], targetSum: 1000 }).success).toBe(true);
    expect(PathSumInputSchema.safeParse({ root: [1, null, null, 2], targetSum: 0 }).success).toBe(false);
    expect(PathSumInputSchema.safeParse({ root: [1], targetSum: 1001 }).success).toBe(false);
    expect(PathSumInputSchema.safeParse({ root: [1], targetSum: 0, extra: true }).success).toBe(false);
  });
});
