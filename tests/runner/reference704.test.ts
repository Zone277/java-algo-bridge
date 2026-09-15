import { afterAll, beforeAll, expect, it } from 'vitest';
import { JavaRunner } from '../../apps/api/src/runner.js';
import { LESSON_VERSION, type BinarySearchInput } from '@jab/contracts';
import { lesson704, REFERENCE_SOURCE } from '@jab/curriculum/704';
import { buildReferenceTrace } from '@jab/curriculum/704/model';

const runner = new JavaRunner();
beforeAll(async () => {
  const availability = await runner.getAvailability();
  if (!availability.available) throw new Error(`BLOCKED reference differential: ${availability.reason}`);
});
afterAll(async () => { await runner.close(); });

async function compare(input: BinarySearchInput, id: string) {
  const before = structuredClone(input);
  const trace = await buildReferenceTrace(input, id);
  const result = await runner.execute({ problemId: '704', lessonVersion: LESSON_VERSION, mode: 'run', source: REFERENCE_SOURCE, input });
  expect(result.status, `${id}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
  expect(result.origin).toBe('student-java');
  expect(trace.mode).toBe('reference-model');
  expect(trace.referenceSourceHash).toBe(result.sourceHash);
  expect(trace.inputHash).toBe(result.cases[0]!.inputHash);
  expect(trace.finalOutput).toEqual(result.cases[0]!.actual);
  expect(input).toEqual(before);
  expect(result.cleanup.status).toBe('done');
}

it('every published valid case matches the real Java reference, not just a prerecorded animation', async () => {
  for (const item of lesson704.testSuite.cases) await compare(item.input, item.id);
});

it('fixed seed 7042026 valid small inputs compare model output with javac/java', async () => {
  let state = 7042026;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  for (let i = 0; i < 16; i++) {
    const length = 1 + random() % 30;
    const offset = -200 + random() % 100;
    const nums = Array.from({ length }, (_, j) => offset + j * 3);
    const target = i % 2 ? nums[random() % length]! : offset + 1 + (random() % length) * 3;
    await compare({ nums, target }, `seed7042026-${i}`);
  }
});

it('both incorrect Java course fixtures are discovered by published tests', async () => {
  for (const fixture of lesson704.testSuite.wrongFixtures) {
    let detected = false;
    for (const caseId of fixture.targetedCaseIds) {
      const item = lesson704.testSuite.cases.find(c => c.id === caseId)!;
      const result = await runner.execute({ problemId: '704', lessonVersion: LESSON_VERSION, mode: 'run', source: fixture.source, input: item.input });
      expect(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'TIME_LIMIT']).toContain(result.status);
      expect(result.cleanup.status).toBe('done');
      detected ||= result.status === 'WRONG_ANSWER' || result.status === 'TIME_LIMIT';
    }
    expect(detected, fixture.id).toBe(true);
  }
});
