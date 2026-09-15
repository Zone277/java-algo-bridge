import { afterAll, describe, expect, it } from 'vitest';
import {
  ClimbStairsInputSchema, LessonSchema, LongestSubstringInputSchema, OutputSchema,
  judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace,
} from '@jab/contracts';
import { lesson70 } from '@jab/curriculum/70';
import { lesson3 } from '@jab/curriculum/3';
import { buildReferenceTrace as trace70 } from '@jab/curriculum/70/model';
import { buildReferenceTrace as trace3 } from '@jab/curriculum/3/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());
type BatchCourse = { id: ProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: BatchCourse[] = [
  { id: '70', lesson: LessonSchema.parse(lesson70), trace: (input, id) => trace70(ClimbStairsInputSchema.parse(input), id) },
  { id: '3', lesson: LessonSchema.parse(lesson3), trace: (input, id) => trace3(LongestSubstringInputSchema.parse(input), id) },
];

describe('stage04 batch three real Java and reference-model differential gate', () => {
  it.each(courses)('$id reference Java passes every published case and exactly agrees with the model', async course => {
    const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' });
    expect(result.status, result.reason ?? '').toBe('PASSED_LOCAL_TESTS');
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      const actual = OutputSchema.parse(actualCase!.actual);
      expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(true);
      if (course.id === '70' && 'n' in definition.input && definition.input.n > 30) {
        await expect(course.trace(definition.input, `published-${definition.id}`)).rejects.toThrow('参考演示最多展开 30 级');
        continue;
      }
      const trace = await course.trace(definition.input, `published-${definition.id}`);
      const modelOutput = OutputSchema.parse(trace.finalOutput);
      expect(judgeProblemOutput(course.id, definition.input as never, modelOutput).passed).toBe(true);
      expect(modelOutput).toEqual(actual);
    }
  }, 120_000);
  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects wrong fixture ${fixture.id} on a declared targeted case`, async () => {
      const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(result.status).not.toBe('PASSED_LOCAL_TESTS');
      expect(result.cases.some(item => fixture.targetedCaseIds.includes(item.caseId) && item.status !== 'PASSED'), JSON.stringify(result.cases)).toBe(true);
    }, 120_000);
  }
});
