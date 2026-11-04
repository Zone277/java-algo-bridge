import { afterAll, describe, expect, it } from 'vitest';
import {
  ArrayIntersectionInputSchema, LessonSchema, OutputSchema, RemoveLinkedListElementsInputSchema,
  RomanToIntegerInputSchema, RunRequestSchema, expectedOutput, judgeProblemOutput,
  type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson13 } from '@jab/curriculum/13';
import { lesson203 } from '@jab/curriculum/203';
import { lesson349 } from '@jab/curriculum/349';
import { buildReferenceTrace as trace13 } from '@jab/curriculum/13/model';
import { buildReferenceTrace as trace203 } from '@jab/curriculum/203/model';
import { buildReferenceTrace as trace349 } from '@jab/curriculum/349/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '13' | '203' | '349';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '13', lesson: LessonSchema.parse(lesson13), trace: (input, id) => trace13(RomanToIntegerInputSchema.parse(input), id) },
  { id: '203', lesson: LessonSchema.parse(lesson203), trace: (input, id) => trace203(RemoveLinkedListElementsInputSchema.parse(input), id) },
  { id: '349', lesson: LessonSchema.parse(lesson349), trace: (input, id) => trace349(ArrayIntersectionInputSchema.parse(input), id) },
];

describe('13/203/349 real Java runner, independent oracle and reference trace', () => {
  it.each(courses)('$id reference Java passes every published case', async course => {
    const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' });
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.origin).toBe('student-java');
    expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
    expect(result.cleanup.status).toBe('done');
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      expect(judgeProblemOutput(course.id, definition.input as never, OutputSchema.parse(actualCase!.actual)).passed).toBe(true);
    }
  }, 180_000);

  it('compares actual javac/java output with independent oracles and reference models', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '13': [{ s: 'I' }, { s: 'III' }, { s: 'MCMXCIV' }, { s: 'MMMCMXCIX' }],
      '203': [{ head: [], val: 1 }, { head: [1], val: 1 }, { head: [1, 2, 6, 3, 4, 5, 6], val: 6 }, { head: [7, 7, 7], val: 7 }],
      '349': [{ nums1: [1], nums2: [2] }, { nums1: [1, 2, 2, 1], nums2: [2, 2] }, { nums1: [4, 9, 5], nums2: [9, 4, 9, 8, 4] }, { nums1: [0, 1000], nums2: [1000, 0] }],
    };
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.cleanup.status).toBe('done');
      const actual = OutputSchema.parse(result.cases[0]!.actual);
      expect(judgeProblemOutput(course.id, input as never, actual).passed).toBe(true);
      expect((await course.trace(input, `sample-${course.id}-${index}`)).finalOutput).toEqual(expectedOutput(course.id, input as never));
    }
  }, 180_000);

  it('accepts a semantically correct 203 solution that allocates new nodes', async () => {
    const source = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (head != null) {
            if (head.val != val) { tail.next = new ListNode(head.val); tail = tail.next; }
            head = head.next;
        }
        return dummy.next;
    }
}`;
    const result = await runner.execute({ problemId: '203', lessonVersion: '203-v1', source, mode: 'run', input: { head: [1, 2, 6, 3, 6], val: 6 } });
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.cases[0]!.actual).toEqual({ kind: 'int-array', values: [1, 2, 3] });
    expect(result.cleanup.status).toBe('done');
  }, 120_000);

  it('rejects a cyclic 203 result safely and still cleans up', async () => {
    const source = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        if (head != null && head.next != null) head.next.next = head;
        return head;
    }
}`;
    const result = await runner.execute({ problemId: '203', lessonVersion: '203-v1', source, mode: 'run', input: { head: [1, 2], val: 9 } });
    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.cases[0]!.message).toContain('环');
    expect(result.cleanup.status).toBe('done');
  }, 120_000);

  it('accepts either valid result order for 349 through the real adapter', async () => {
    const source = `class Solution {
    public int[] intersection(int[] nums1, int[] nums2) { return new int[] {9, 4}; }
}`;
    const input = { nums1: [4, 9, 5, 4], nums2: [9, 4, 9, 8, 4] };
    const result = await runner.execute({ problemId: '349', lessonVersion: '349-v1', source, mode: 'run', input });
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.cases[0]!.actual).not.toEqual(expectedOutput('349', input));
    expect(judgeProblemOutput('349', input, OutputSchema.parse(result.cases[0]!.actual)).passed).toBe(true);
    expect(result.cleanup.status).toBe('done');
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} on every named counterexample`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(['WRONG_ANSWER', 'RUNTIME_ERROR'], submitted.reason ?? submitted.stderr).toContain(submitted.status);
      expect(submitted.diagnostics).toHaveLength(0);
      expect(submitted.cleanup.status).toBe('done');
      for (const caseId of fixture.targetedCaseIds) {
        const definition = course.lesson.testSuite.cases.find(item => item.id === caseId)!;
        const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: definition.input as never });
        expect(['WRONG_ANSWER', 'RUNTIME_ERROR'], `${course.id}:${fixture.id}:${caseId}: ${result.reason ?? result.stderr}`).toContain(result.status);
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(['WRONG_ANSWER', 'RUNTIME_ERROR']).toContain(result.cases[0]!.status);
        if (result.cases[0]!.actual !== null) {
          expect(judgeProblemOutput(course.id, definition.input as never, OutputSchema.parse(result.cases[0]!.actual)).passed).toBe(false);
        }
      }
    }, 240_000);
  }
});
