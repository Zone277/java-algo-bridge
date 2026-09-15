import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MergeListsInputSchema, judgeProblemOutput } from '@jab/contracts';
import { demoInputs, lesson21 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('21 complete curriculum content', () => {
  it('validates ten identity-aware cases and their canonical reference graphs', () => {
    expect(LessonSchema.parse(lesson21)).toEqual(lesson21);
    expect(lesson21.testSuite.cases).toHaveLength(10);
    for (const item of lesson21.testSuite.cases) {
      expect(MergeListsInputSchema.safeParse(item.input).success).toBe(true);
      expect(judgeProblemOutput('21', item.input, item.expected).passed).toBe(true);
      expect(item.expected.nodes).toHaveLength(item.input.list1.length + item.input.list2.length);
    }
  });

  it('binds the exact reference source hash and stable code steps', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson21.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'create-dummy': 'ListNode dummy = new ListNode(0);', 'init-tail': 'ListNode tail = dummy;',
      'check-loop': 'while (list1 != null && list2 != null) {', 'choose-source': 'if (list1.val <= list2.val) {',
      'attach-list1': 'tail.next = list1;', 'move-list1': 'list1 = list1.next;',
      'attach-list2': 'tail.next = list2;', 'move-list2': 'list2 = list2.next;',
      'move-tail': 'tail = tail.next;', 'attach-remainder': 'tail.next = list1 != null ? list1 : list2;',
      'return-head': 'return dummy.next;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
  });

  it('keeps independent work at a method skeleton and final guided validation real', () => {
    expect(lesson21.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('new ListNode(0)');
    expect(STARTER_SOURCE).not.toContain('while (');
    expect(lesson21.guided.stages).toHaveLength(3);
    expect(lesson21.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson21.guided.finalCheck).toBe('real-java-submit');
  });

  it('provides dynamic prediction links, valid demos, counterexamples and three wrong Java fixtures', () => {
    expect(lesson21.predictionChecks.map(check => check.checkpointId)).toEqual(['first-link', 'first-tail']);
    expect(demoInputs.map(demo => demo.id)).toEqual(lesson21.visualization.inputIds);
    expect(lesson21.testSuite.wrongFixtures).toHaveLength(3);
    const caseIds = new Set(lesson21.testSuite.cases.map(item => item.id));
    for (const fixture of lesson21.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.source).toContain('class Solution');
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson21.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });

  it('documents and accepts a different legal order for equal values across input chains', () => {
    const input = { list1: [5, 5], list2: [5, 5] };
    const alternative = {
      kind: 'list-graph' as const,
      headId: 'b0',
      nodes: [
        { id: 'a0', value: 5, nextId: 'b1' }, { id: 'a1', value: 5, nextId: null },
        { id: 'b0', value: 5, nextId: 'a0' }, { id: 'b1', value: 5, nextId: 'a1' },
      ],
    };
    expect(judgeProblemOutput('21', input, alternative)).toMatchObject({ passed: true });
  });
});
