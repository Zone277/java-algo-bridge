import { afterAll, describe, expect, it } from 'vitest';
import {
  IsomorphicStringsInputSchema, LessonSchema, OutputSchema, RemoveElementInputSchema,
  RunRequestSchema, TreeInputSchema, expectedOutput, judgeProblemOutput,
  type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson27 } from '@jab/curriculum/27';
import { lesson111 } from '@jab/curriculum/111';
import { lesson205 } from '@jab/curriculum/205';
import { buildReferenceTrace as trace27 } from '@jab/curriculum/27/model';
import { buildReferenceTrace as trace111 } from '@jab/curriculum/111/model';
import { buildReferenceTrace as trace205 } from '@jab/curriculum/205/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '27' | '111' | '205';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '27', lesson: LessonSchema.parse(lesson27), trace: (input, id) => trace27(RemoveElementInputSchema.parse(input), id) },
  { id: '111', lesson: LessonSchema.parse(lesson111), trace: (input, id) => trace111(TreeInputSchema.parse(input), id) },
  { id: '205', lesson: LessonSchema.parse(lesson205), trace: (input, id) => trace205(IsomorphicStringsInputSchema.parse(input), id) },
];

describe('27/111/205 real Java runner, independent oracle and reference trace', () => {
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

  it('compares actual javac/java output with independent oracles and small reference models', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '27': [{ nums: [], val: 3 }, { nums: [3, 2, 2, 3], val: 3 }, { nums: [1, 1, 1], val: 2 }, { nums: [-1, 0, -1, 2], val: -1 }],
      '111': [{ root: [] }, { root: [1] }, { root: [1, null, 2, null, 3] }, { root: [3, 9, 20, null, null, 15, 7] }],
      '205': [{ s: 'egg', t: 'add' }, { s: 'foo', t: 'bar' }, { s: 'badc', t: 'baba' }, { s: ' ! ', t: ' # ' }],
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

  it('accepts an unordered but semantically correct in-place prefix for 27', async () => {
    const source = `class Solution {
    public int removeElement(int[] nums, int val) {
        int index = 0, end = nums.length - 1;
        while (index <= end) {
            if (nums[index] == val) nums[index] = nums[end--];
            else index++;
        }
        return end + 1;
    }
}`;
    const result = await runner.execute({ problemId: '27', lessonVersion: '27-v1', source, mode: 'run', input: { nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 } });
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.cases[0]!.actual).not.toEqual(expectedOutput('27', { nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 }));
    expect(judgeProblemOutput('27', { nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 }, OutputSchema.parse(result.cases[0]!.actual)).passed).toBe(true);
  }, 120_000);

  it.each([
    ['negative', '-1'],
    ['past the array', 'nums.length + 1'],
  ])('rejects an invalid %s k before judging the 27 prefix', async (_label, expression) => {
    const source = `class Solution { public int removeElement(int[] nums, int val) { return ${expression}; } }`;
    const result = await runner.execute({ problemId: '27', lessonVersion: '27-v1', source, mode: 'run', input: { nums: [1, 2], val: 1 } });
    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.cases[0]!.message).toContain('返回长度');
    expect(result.cleanup.status).toBe('done');
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} on every named counterexample`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(submitted.status).toBe('WRONG_ANSWER');
      expect(submitted.diagnostics).toHaveLength(0);
      expect(submitted.cleanup.status).toBe('done');
      for (const caseId of fixture.targetedCaseIds) {
        const definition = course.lesson.testSuite.cases.find(item => item.id === caseId)!;
        const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: definition.input as never });
        expect(result.status, `${course.id}:${fixture.id}:${caseId}: ${result.reason ?? result.stderr}`).toBe('WRONG_ANSWER');
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0]!.status).toBe('WRONG_ANSWER');
        expect(judgeProblemOutput(course.id, definition.input as never, OutputSchema.parse(result.cases[0]!.actual)).passed).toBe(false);
      }
    }, 240_000);
  }
});
