import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, RunRequestSchema, MergeListsInputSchema, OutputSchema, TreeInputSchema, ValidParenthesesInputSchema,
  judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace,
} from '@jab/contracts';
import { lesson20 } from '@jab/curriculum/20';
import { lesson21 } from '@jab/curriculum/21';
import { lesson104 } from '@jab/curriculum/104';
import { buildReferenceTrace as trace20 } from '@jab/curriculum/20/model';
import { buildReferenceTrace as trace21 } from '@jab/curriculum/21/model';
import { buildReferenceTrace as trace104 } from '@jab/curriculum/104/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());
type BatchCourse = { id: ProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: BatchCourse[] = [
  { id: '20', lesson: LessonSchema.parse(lesson20), trace: (input, id) => trace20(ValidParenthesesInputSchema.parse(input), id) },
  { id: '21', lesson: LessonSchema.parse(lesson21), trace: (input, id) => trace21(MergeListsInputSchema.parse(input), id) },
  { id: '104', lesson: LessonSchema.parse(lesson104), trace: (input, id) => trace104(TreeInputSchema.parse(input), id) },
];

describe('stage04 batch two real Java and reference-model differential gate', () => {
  it.each(courses)('$id reference Java passes every published case and agrees with the model', async course => {
    const result = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' }));
    expect(result.status, result.reason ?? '').toBe('PASSED_LOCAL_TESTS');
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      expect(judgeProblemOutput(course.id, definition.input as never, OutputSchema.parse(actualCase!.actual)).passed).toBe(true);
      const trace = await course.trace(definition.input, `published-${definition.id}`);
      const modelOutput = OutputSchema.parse(trace.finalOutput);
      expect(judgeProblemOutput(course.id, definition.input as never, modelOutput).passed).toBe(true);
      expect(modelOutput).toEqual(OutputSchema.parse(actualCase!.actual));
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
