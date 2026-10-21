import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, RunRequestSchema, MoveZeroesInputSchema, OutputSchema, SortedSquaresInputSchema, TwoSumInputSchema,
  judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace,
} from '@jab/contracts';
import { lesson283 } from '@jab/curriculum/283';
import { lesson977 } from '@jab/curriculum/977';
import { lesson1 } from '@jab/curriculum/1';
import { buildReferenceTrace as trace283 } from '@jab/curriculum/283/model';
import { buildReferenceTrace as trace977 } from '@jab/curriculum/977/model';
import { buildReferenceTrace as trace1 } from '@jab/curriculum/1/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type BatchCourse = {
  id: ProblemId;
  lesson: Lesson;
  trace: (input: unknown, inputId: string) => Promise<ReferenceTrace>;
};
const courses: BatchCourse[] = [
  { id: '283', lesson: LessonSchema.parse(lesson283), trace: (input, id) => trace283(MoveZeroesInputSchema.parse(input), id) },
  { id: '977', lesson: LessonSchema.parse(lesson977), trace: (input, id) => trace977(SortedSquaresInputSchema.parse(input), id) },
  { id: '1', lesson: LessonSchema.parse(lesson1), trace: (input, id) => trace1(TwoSumInputSchema.parse(input), id) },
];

describe('stage04 batch one real Java and reference-model differential gate', () => {
  it.each(courses)('$id reference Java passes every published case and agrees with the model', async course => {
    const result = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' }));
    expect(result.status, result.reason ?? '').toBe('PASSED_LOCAL_TESTS');
    expect(result.testSuiteVersion).toBe(course.lesson.testSuite.version);
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      const actual = OutputSchema.parse(actualCase!.actual);
      expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(true);
      const trace = await course.trace(definition.input, `published-${definition.id}`);
      const modelOutput = OutputSchema.parse(trace.finalOutput);
      expect(judgeProblemOutput(course.id, definition.input as never, modelOutput).passed).toBe(true);
      expect(modelOutput).toEqual(actual);
    }
  }, 120_000);

  for (const course of courses) {
    for (const fixture of course.lesson.testSuite.wrongFixtures) {
      it(`${course.id} rejects wrong fixture ${fixture.id} on a declared targeted case`, async () => {
        const result = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' }));
        expect(result.status).not.toBe('PASSED_LOCAL_TESTS');
        expect(result.cases.some(item => fixture.targetedCaseIds.includes(item.caseId) && item.status !== 'PASSED'), JSON.stringify(result.cases)).toBe(true);
      }, 120_000);
    }
  }
});
