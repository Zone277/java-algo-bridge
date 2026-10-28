import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, OutputSchema, RunRequestSchema, SqrtInputSchema, StockProfitIIInputSchema, TreeInputSchema,
  judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson69 } from '@jab/curriculum/69';
import { lesson122 } from '@jab/curriculum/122';
import { lesson144 } from '@jab/curriculum/144';
import { buildReferenceTrace as trace69 } from '@jab/curriculum/69/model';
import { buildReferenceTrace as trace122 } from '@jab/curriculum/122/model';
import { buildReferenceTrace as trace144 } from '@jab/curriculum/144/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '69' | '122' | '144';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '69', lesson: LessonSchema.parse(lesson69), trace: (input, id) => trace69(SqrtInputSchema.parse(input), id) },
  { id: '122', lesson: LessonSchema.parse(lesson122), trace: (input, id) => trace122(StockProfitIIInputSchema.parse(input), id) },
  { id: '144', lesson: LessonSchema.parse(lesson144), trace: (input, id) => trace144(TreeInputSchema.parse(input), id) },
];

describe('69/122/144 real Java runner, independent oracle and reference trace', () => {
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
  }, 120_000);

  it('compares actual javac/java output with models on small independent inputs', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '69': [{ x: 0 }, { x: 1 }, { x: 8 }, { x: 2147483647 }],
      '122': [{ prices: [1] }, { prices: [5, 3, 7, 2] }, { prices: [0, 0, 10000, 10000] }, { prices: [7, 4, 1] }],
      '144': [{ root: [] }, { root: [1] }, { root: [1, null, 2, 3] }, { root: [5, 5, 5, null, 5] }],
    };
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.origin).toBe('student-java');
      expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
      expect(result.cleanup.status).toBe('done');
      expect(result.cases).toHaveLength(1);
      const trace = await course.trace(input, `sample-${course.id}-${index}`);
      expect(trace.finalOutput).toEqual(OutputSchema.parse(result.cases[0]!.actual));
    }
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} on all named counterexamples`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(submitted.status, submitted.reason ?? submitted.stderr).toBe('WRONG_ANSWER');
      expect(submitted.cleanup.status).toBe('done');
      for (const caseId of fixture.targetedCaseIds) {
        const definition = course.lesson.testSuite.cases.find(item => item.id === caseId)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: definition.input });
        const result = await runner.execute(request);
        expect(result.status, `${course.id}:${fixture.id}:${caseId}: ${result.reason ?? result.stderr}`).toBe('WRONG_ANSWER');
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0]!.status).toBe('WRONG_ANSWER');
        if (result.cases[0]!.actual !== null) {
          const actual = OutputSchema.parse(result.cases[0]!.actual);
          expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(false);
        }
      }
    }, 120_000);
  }
});
