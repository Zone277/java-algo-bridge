import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RemoveLinkedListElementsInputSchema, expectedOutput } from '@jab/contracts';
import {
  WRONG_ADVANCE_AFTER_DELETE_SOURCE,
  WRONG_ONLY_FIRST_SOURCE,
  demoInputs,
  lesson203,
} from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('203 remove-linked-list-elements lesson content', () => {
  it('validates the complete learning flow, fixed metadata and real-submit boundary', () => {
    expect(LessonSchema.parse(lesson203)).toEqual(lesson203);
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson203.reference.sourceHash);
    expect(lesson203.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson203.lessonVersion).toBe('203-v1');
    expect(lesson203.testSuite.version).toBe('203-tests-v1');
    expect(lesson203.guided.stages).toHaveLength(3);
    expect(lesson203.guided.finalCheck).toBe('real-java-submit');
    expect(lesson203.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson203.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson203.predictionChecks).toHaveLength(2);
    expect(lesson203.independent.initialSource).toBe(lesson203.starter.source);
    expect(lesson203.independent.initialSource).not.toContain('dummy.next = head');
    expect(lesson203.taskSemantics).toContain('不要求学生必须采用与参考解法相同的原节点复用策略');
  });

  it('publishes fourteen independently judged cases with boundary and consecutive-match coverage', () => {
    expect(lesson203.testSuite.cases).toHaveLength(14);
    expect(new Set(lesson203.testSuite.cases.map(testCase => testCase.id)).size).toBe(14);
    for (const testCase of lesson203.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('203', testCase.input));
      expect(testCase.expected.kind).toBe('int-array');
      expect(testCase.coverage.length).toBeGreaterThan(12);
    }
    const byId = new Map(lesson203.testSuite.cases.map(testCase => [testCase.id, testCase]));
    expect(byId.get('203-case-empty')?.expected).toEqual({ kind: 'int-array', values: [] });
    expect(byId.get('203-case-consecutive-middle')?.expected).toEqual({ kind: 'int-array', values: [1, 3] });
    expect(byId.get('203-case-all-remove')?.expected).toEqual({ kind: 'int-array', values: [] });
    expect(byId.get('203-case-repeated-kept')?.expected).toEqual({ kind: 'int-array', values: [5, 5, 5] });
    expect(byId.get('203-case-length-boundary')?.input.head).toHaveLength(10000);
    expect(byId.get('203-case-length-boundary')?.expected.kind === 'int-array'
      ? byId.get('203-case-length-boundary')!.expected.values
      : []).toHaveLength(9800);
    expect(demoInputs.map(demo => demo.id)).toEqual([
      '203-demo-mixed', '203-demo-consecutive', '203-demo-repeated-kept', '203-demo-empty',
    ]);
  });

  it('ships two compile-shaped wrong Java solutions aimed at concrete counterexamples', () => {
    expect(lesson203.testSuite.wrongFixtures).toHaveLength(2);
    expect(WRONG_ONLY_FIRST_SOURCE).toContain('if (curr.next != null');
    expect(WRONG_ONLY_FIRST_SOURCE).not.toContain('while (');
    expect(WRONG_ADVANCE_AFTER_DELETE_SOURCE).toContain('curr = curr.next;');
    expect(WRONG_ADVANCE_AFTER_DELETE_SOURCE).toContain('while (curr.next != null)');
    for (const fixture of lesson203.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('public ListNode removeElements(ListNode head, int val)');
      expect(fixture.source).not.toContain('TODO');
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const caseId of fixture.targetedCaseIds) expect(lesson203.testSuite.cases.some(testCase => testCase.id === caseId)).toBe(true);
    }
    expect(lesson203.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('203-case-one-late-match');
    expect(lesson203.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('203-case-consecutive-middle');
  });

  it('enforces the public input limits without changing valid val-zero semantics', () => {
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [], val: 0 }).success).toBe(true);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [1, 50], val: 50 }).success).toBe(true);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: Array(10000).fill(1), val: 1 }).success).toBe(true);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [0], val: 0 }).success).toBe(false);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [51], val: 1 }).success).toBe(false);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: Array(10001).fill(1), val: 1 }).success).toBe(false);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [1], val: 51 }).success).toBe(false);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [1], val: 1, extra: true }).success).toBe(false);
  });
});
