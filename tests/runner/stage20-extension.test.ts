import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, LinkedListCycleInputSchema, OutputSchema, RemoveDuplicatesInputSchema,
  RunRequestSchema, SameTreeInputSchema, expectedOutput, judgeProblemOutput,
  type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson26 } from '@jab/curriculum/26';
import { lesson100 } from '@jab/curriculum/100';
import { lesson141 } from '@jab/curriculum/141';
import { buildReferenceTrace as trace26 } from '@jab/curriculum/26/model';
import { buildReferenceTrace as trace100 } from '@jab/curriculum/100/model';
import { buildReferenceTrace as trace141 } from '@jab/curriculum/141/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '26' | '100' | '141';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '26', lesson: LessonSchema.parse(lesson26), trace: (input, id) => trace26(RemoveDuplicatesInputSchema.parse(input), id) },
  { id: '100', lesson: LessonSchema.parse(lesson100), trace: (input, id) => trace100(SameTreeInputSchema.parse(input), id) },
  { id: '141', lesson: LessonSchema.parse(lesson141), trace: (input, id) => trace141(LinkedListCycleInputSchema.parse(input), id) },
];

describe('26/100/141 real Java runner, oracle and reference trace', () => {
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
      const actual = OutputSchema.parse(actualCase!.actual);
      expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(true);
    }
  }, 180_000);

  it('compares actual javac/java output with independent oracles and small reference models', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '26': [{ nums: [1] }, { nums: [-2, -2, 0, 3, 3] }, { nums: Array(31).fill(9) }, { nums: Array(10000).fill(4) }],
      '100': [{ p: [], q: [] }, { p: [1, 2], q: [1, 2] }, { p: [1, 2], q: [1, null, 2] }, { p: [5, 5, 5], q: [5, 5, 5] }],
      '141': [{ head: [], pos: -1 }, { head: [7], pos: 0 }, { head: [5, 5, 5], pos: -1 }, { head: [3, 2, 0, -4], pos: 1 }],
    };
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.cleanup.status).toBe('done');
      const actual = OutputSchema.parse(result.cases[0]!.actual);
      expect(actual).toEqual(expectedOutput(course.id, input as never));
      const isLargeDemo = course.id === '26' && (input as { nums: number[] }).nums.length > 30;
      if (!isLargeDemo) expect((await course.trace(input, `sample-${course.id}-${index}`)).finalOutput).toEqual(actual);
    }
  }, 180_000);

  it('rejects an invalid returned k before host judging the 26 prefix', async () => {
    const source = 'class Solution { public int removeDuplicates(int[] nums) { return nums.length + 1; } }';
    const result = await runner.execute({ problemId: '26', lessonVersion: '26-v1', source, mode: 'run', input: { nums: [1, 1, 2] } });
    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.cases[0]!.message).toContain('返回长度');
    expect(result.cleanup.status).toBe('done');
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} on all named counterexamples`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(submitted.status).not.toBe('PASSED_LOCAL_TESTS');
      expect(submitted.cleanup.status).toBe('done');
      for (const caseId of fixture.targetedCaseIds) {
        const definition = course.lesson.testSuite.cases.find(item => item.id === caseId)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: definition.input });
        const result = await runner.execute(request);
        expect(['WRONG_ANSWER', 'RUNTIME_ERROR'], `${course.id}:${fixture.id}:${caseId}: ${result.reason ?? result.stderr}`).toContain(result.status);
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(['WRONG_ANSWER', 'RUNTIME_ERROR']).toContain(result.cases[0]!.status);
        if (result.cases[0]!.actual !== null) {
          const actual = OutputSchema.parse(result.cases[0]!.actual);
          expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(false);
        }
      }
    }, 240_000);
  }
});
