import { afterAll, describe, expect, it } from 'vitest';
import {
  ContainsDuplicateInputSchema, LessonSchema, RunRequestSchema, MaxProfitInputSchema, OutputSchema, SearchInsertInputSchema,
  judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace,
} from '@jab/contracts';
import { lesson35 } from '@jab/curriculum/35';
import { lesson121 } from '@jab/curriculum/121';
import { lesson217 } from '@jab/curriculum/217';
import { buildReferenceTrace as trace35 } from '@jab/curriculum/35/model';
import { buildReferenceTrace as trace121 } from '@jab/curriculum/121/model';
import { buildReferenceTrace as trace217 } from '@jab/curriculum/217/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type ExtensionCourse = {
  id: ProblemId;
  lesson: Lesson;
  trace: (input: unknown, inputId: string) => Promise<ReferenceTrace>;
};

const courses: ExtensionCourse[] = [
  { id: '35', lesson: LessonSchema.parse(lesson35), trace: (input, id) => trace35(SearchInsertInputSchema.parse(input), id) },
  { id: '121', lesson: LessonSchema.parse(lesson121), trace: (input, id) => trace121(MaxProfitInputSchema.parse(input), id) },
  { id: '217', lesson: LessonSchema.parse(lesson217), trace: (input, id) => trace217(ContainsDuplicateInputSchema.parse(input), id) },
];

describe('three-problem extension real Java and reference-model differential gate', () => {
  it.each(courses)('$id reference Java passes every published case and exactly agrees with the model', async course => {
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
      const listInput = definition.input as { nums?: readonly number[]; prices?: readonly number[] };
      const itemCount = listInput.nums?.length ?? listInput.prices?.length ?? 0;
      if (itemCount > 30) {
        await expect(course.trace(definition.input, `published-${definition.id}`)).rejects.toThrow(/30/);
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
      const result = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' }));
      expect(result.status).not.toBe('PASSED_LOCAL_TESTS');
      expect(result.cases.some(item => fixture.targetedCaseIds.includes(item.caseId) && item.status !== 'PASSED'), JSON.stringify(result.cases)).toBe(true);
    }, 120_000);
  }
});
