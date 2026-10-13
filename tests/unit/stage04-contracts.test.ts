import { describe, expect, it } from 'vitest';
import {
  PROBLEM_ORDER, RunRequestSchema, TreeInputSchema, TwoSumInputSchema,
  expectedOutput, judgeProblemOutput, type MergeListsInput, type Output,
} from '@jab/contracts';

describe('shared problem contracts', () => {
  it('keeps the registered problem order and accepts every request shape', () => {
    expect(PROBLEM_ORDER).toEqual(['704', '283', '977', '1', '20', '206', '21', '104', '70', '3', '35', '121', '217']);
    const requests = [
      ['704', '704-v1', { nums: [1], target: 1 }], ['283', '283-v1', { nums: [0] }],
      ['977', '977-v1', { nums: [-1, 2] }], ['1', '1-v1', { nums: [2, 7], target: 9 }],
      ['20', '20-v1', { s: '()' }], ['206', '206-v1', { head: [] }],
      ['21', '21-v1', { list1: [], list2: [] }], ['104', '104-v1', { root: [] }],
      ['70', '70-v1', { n: 1 }], ['3', '3-v1', { s: '' }],
      ['35', '35-v1', { nums: [1, 3, 5], target: 4 }],
      ['121', '121-v1', { prices: [7, 1, 5, 3, 6, 4] }],
      ['217', '217-v1', { nums: [1, 2, 1] }],
    ] as const;
    for (const [problemId, lessonVersion, input] of requests) expect(RunRequestSchema.safeParse({ problemId, lessonVersion, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
  });

  it('requires exactly one two-sum pair and judges either legal index order', () => {
    expect(TwoSumInputSchema.safeParse({ nums: [1, 2, 3], target: 100 }).success).toBe(false);
    expect(TwoSumInputSchema.safeParse({ nums: [1, 2, 3, 4], target: 5 }).success).toBe(false);
    const input = TwoSumInputSchema.parse({ nums: [2, 7, 11, 15], target: 9 });
    expect(judgeProblemOutput('1', input, { kind: 'int-array', values: [1, 0] }).passed).toBe(true);
    expect(judgeProblemOutput('1', input, { kind: 'int-array', values: [0, 0] }).passed).toBe(false);
  });

  it('uses compact queue tree parsing rather than heap indexes', () => {
    const compact = TreeInputSchema.parse({ root: [1, null, 2, 3] });
    expect(expectedOutput('104', compact)).toEqual({ kind: 'int', value: 3 });
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [1, null, 2, null, null] }).success).toBe(true);
  });

  it('judges merge-list identity, ordering and cycles while allowing equal-value cross-list order', () => {
    const input: MergeListsInput = { list1: [1, 1], list2: [1] };
    const legalOtherTieOrder: Output = { kind: 'list-graph', headId: 'b0', nodes: [
      { id: 'a0', value: 1, nextId: 'a1' }, { id: 'a1', value: 1, nextId: null }, { id: 'b0', value: 1, nextId: 'a0' },
    ] };
    expect(judgeProblemOutput('21', input, legalOtherTieOrder).passed).toBe(true);
    expect(judgeProblemOutput('21', input, { ...legalOtherTieOrder, nodes: legalOtherTieOrder.kind === 'list-graph' ? legalOtherTieOrder.nodes.map(node => node.id === 'a1' ? { ...node, nextId: 'a0' } : node) : [] }).passed).toBe(false);
    expect(judgeProblemOutput('21', input, { kind: 'list-graph', headId: 'x0', nodes: [{ id: 'x0', value: 1, nextId: null }] }).passed).toBe(false);
  });

  it('distinguishes in-place and continuous-substring semantics in trusted expected values', () => {
    expect(expectedOutput('283', { nums: [0, 2, 0, 1] })).toEqual({ kind: 'int-array', values: [2, 1, 0, 0] });
    expect(expectedOutput('3', { s: 'pwwkew' })).toEqual({ kind: 'int', value: 3 });
    expect(expectedOutput('3', { s: 'abba' })).toEqual({ kind: 'int', value: 2 });
  });

  it('derives the three extension results from their input semantics', () => {
    expect(expectedOutput('35', { nums: [1, 3, 5, 6], target: 2 })).toEqual({ kind: 'int', value: 1 });
    expect(expectedOutput('35', { nums: [1, 3, 5, 6], target: 7 })).toEqual({ kind: 'int', value: 4 });
    expect(expectedOutput('121', { prices: [7, 1, 5, 3, 6, 4] })).toEqual({ kind: 'int', value: 5 });
    expect(expectedOutput('121', { prices: [7, 6, 4, 3, 1] })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('217', { nums: [1, 2, 3, 1] })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('217', { nums: [1, 2, 3, 4] })).toEqual({ kind: 'boolean', value: false });
  });
});
