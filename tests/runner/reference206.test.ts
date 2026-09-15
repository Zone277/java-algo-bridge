import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JavaRunner } from '../../apps/api/src/runner.js';
import { expectedReversedList, LINKED_LESSON_VERSION, LINKED_TEST_SUITE_VERSION, RunResultSchema, type LinkedListInput } from '@jab/contracts';
import { lesson206, REFERENCE_SOURCE } from '@jab/curriculum/206';
import { buildReferenceTrace } from '@jab/curriculum/206/model';
import { alternateReverse, cycleList, loseNext, cloneReverse, reverseValues } from '../fixtures/linked-java.js';

const runner = new JavaRunner();
beforeAll(async () => { const available = await runner.getAvailability(); if (!available.available) throw new Error(`BLOCKED: Docker required for 206: ${available.reason}`); });
afterAll(async () => { await runner.close(); });
async function run(source: string, input: LinkedListInput) {
  const result = RunResultSchema.parse(await runner.execute({ problemId: '206', lessonVersion: LINKED_LESSON_VERSION, source, mode: 'run', input }));
  expect(result.origin).toBe('student-java');
  expect(result.cleanup.status).toBe('done');
  return result;
}
async function compare(input: LinkedListInput, id: string) {
  const before = structuredClone(input);
  const trace = await buildReferenceTrace(input, id);
  const result = await run(REFERENCE_SOURCE, input);
  expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
  expect(result.sourceHash).toBe(trace.referenceSourceHash);
  expect(result.cases[0]!.inputHash).toBe(trace.inputHash);
  expect(result.cases[0]!.actual).toEqual(trace.finalOutput);
  expect(trace.finalOutput).toEqual(expectedReversedList(input));
  expect(input).toEqual(before);
}
describe('206 actual Java reference and object identity checks', () => {
  it('matches every published course input with real Java output and original object IDs', async () => {
    for (const item of lesson206.testSuite.cases) await compare(item.input, item.id);
  });
  it('matches fixed seed 2062026 random small lists including repeated values', async () => {
    let state = 2062026;
    const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
    for (let i = 0; i < 16; i++) {
      const head = Array.from({ length: next() % 9 }, () => (next() % 5) - 2);
      await compare({ head }, `seed2062026-${i}`);
    }
  });
  it('accepts another correct implementation with different local names and loop syntax', async () => {
    const result = await runner.execute({ problemId: '206', lessonVersion: LINKED_LESSON_VERSION, source: alternateReverse, mode: 'submit' });
    expect(result.status).toBe('PASSED_LOCAL_TESTS');
    expect(result.testSuiteVersion).toBe(LINKED_TEST_SUITE_VERSION);
    expect(result.cases).toHaveLength(lesson206.testSuite.cases.length);
    expect(result.cases.every(c => c.status === 'PASSED')).toBe(true);
    expect(result.cleanup.status).toBe('done');
  });
  it('rejects cycles, a lost suffix, copied nodes and value reversal despite plausible values', async () => {
    for (const source of [cycleList, loseNext, cloneReverse, reverseValues]) {
      const result = await run(source, { head: [5,5,8] });
      expect(result.status, source).toBe('WRONG_ANSWER');
      expect(result.cases[0]!.message.length).toBeGreaterThan(0);
    }
    const copiedDuplicates = await run(cloneReverse, { head: [5,5] });
    expect(copiedDuplicates.status).toBe('WRONG_ANSWER');
  });
  it('finds each published incorrect Java fixture through its actual counterexamples', async () => {
    for (const fixture of lesson206.testSuite.wrongFixtures) {
      let detected = false;
      for (const id of fixture.targetedCaseIds) {
        const input = lesson206.testSuite.cases.find(item => item.id === id)!.input;
        const result = await run(fixture.source, input);
        expect(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'TIME_LIMIT']).toContain(result.status);
        detected ||= result.status === 'WRONG_ANSWER' || result.status === 'TIME_LIMIT';
      }
      expect(detected, fixture.id).toBe(true);
    }
  });
  it('really executes 5000 nodes within judge limits, independently of the reference snapshot cap', async () => {
    const input = { head: Array.from({ length: 5000 }, (_, i) => i % 11) };
    const result = await run(REFERENCE_SOURCE, input);
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.cases[0]!.actual).toEqual(expectedReversedList(input));
    await expect(buildReferenceTrace(input, 'over-snapshot-budget')).rejects.toThrow();
  });
  it('student-defined static fields cannot replace the trusted ListNode object fields', async () => {
    const source = 'class ListNode { public static int val; public static ListNode next; } class Solution { public ListNode reverseList(ListNode head) { head.next = null; return head; } }';
    const result = await run(source, { head: [2,3] });
    expect(result.status).toBe('RUNTIME_ERROR');
    expect(result.stderr).toContain('IncompatibleClassChangeError');
  });
});
