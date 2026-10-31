import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, OutputSchema, RunRequestSchema, PalindromeNumberInputSchema, PathSumInputSchema, TreeInputSchema,
  judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson9 } from '@jab/curriculum/9';
import { lesson101 } from '@jab/curriculum/101';
import { lesson112 } from '@jab/curriculum/112';
import { buildReferenceTrace as trace9 } from '@jab/curriculum/9/model';
import { buildReferenceTrace as trace101 } from '@jab/curriculum/101/model';
import { buildReferenceTrace as trace112 } from '@jab/curriculum/112/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '9' | '101' | '112';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '9', lesson: LessonSchema.parse(lesson9), trace: (input, id) => trace9(PalindromeNumberInputSchema.parse(input), id) },
  { id: '101', lesson: LessonSchema.parse(lesson101), trace: (input, id) => trace101(TreeInputSchema.parse(input), id) },
  { id: '112', lesson: LessonSchema.parse(lesson112), trace: (input, id) => trace112(PathSumInputSchema.parse(input), id) },
];

describe('9/101/112 real Java runner, oracle and reference trace', () => {
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

  it('compares actual javac/java output with models on extra inputs', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '9': [{ x: -2147483648 }, { x: 0 }, { x: 10 }, { x: 2147447412 }, { x: 2147483647 }],
      '101': [{ root: [] }, { root: [1] }, { root: [1, 2, 2, 3, 4, 4, 3] }, { root: [1, 2, 2, null, 3, null, 3] }],
      '112': [{ root: [], targetSum: 0 }, { root: [1], targetSum: 1 }, { root: [1, 2], targetSum: 1 }, { root: [1, -2, -3], targetSum: -1 }],
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
  }, 180_000);

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
    }, 180_000);
  }
});
