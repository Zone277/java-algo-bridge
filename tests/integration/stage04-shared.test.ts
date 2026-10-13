import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PROBLEM_ORDER, expectedOutput, type ListGraph } from '@jab/contracts';
import { buildApp } from '../../apps/api/src/app.js';
import { JavaRunner, READY_PROBLEM_IDS, inputHash, isProblemReady, judgeListGraph, judgeRuntimeOutput } from '../../apps/api/src/runner.js';

describe('runtime registry and semantic judges', () => {
  it('registers every complete course in the fixed order', () => {
    expect(READY_PROBLEM_IDS).toEqual(PROBLEM_ORDER);
    for (const problemId of PROBLEM_ORDER) expect(isProblemReady(problemId)).toBe(true);
  });

  it('uses canonical object-key order for input hashes', () => {
    expect(inputHash({ nums: [2, 7], target: 9 })).toBe(inputHash({ target: 9, nums: [2, 7] }));
  });

  it('judges in-place arrays and unordered two-sum indices by their real semantics', () => {
    expect(judgeRuntimeOutput('283', { nums: [0, 1, 0] }, { kind: 'int-array', values: [1, 0, 0] }).passed).toBe(true);
    expect(judgeRuntimeOutput('283', { nums: [0, 1, 0] }, { kind: 'int-array', values: [0, 1, 0] }).passed).toBe(false);
    expect(judgeRuntimeOutput('1', { nums: [2, 7, 11, 15], target: 9 }, { kind: 'int-array', values: [1, 0] }).passed).toBe(true);
    expect(judgeRuntimeOutput('1', { nums: [3, 2, 4], target: 6 }, { kind: 'int-array', values: [0, 0] }).passed).toBe(false);
  });

  it('accepts either cross-list tie order but rejects cycles and replacement identities', () => {
    const input = { list1: [1], list2: [1] };
    const alternate: ListGraph = { kind: 'list-graph', headId: 'b0', nodes: [
      { id: 'a0', value: 1, nextId: null }, { id: 'b0', value: 1, nextId: 'a0' },
    ] };
    const cycle: ListGraph = { kind: 'list-graph', headId: 'a0', nodes: [
      { id: 'a0', value: 1, nextId: 'b0' }, { id: 'b0', value: 1, nextId: 'a0' },
    ] };
    const clones: ListGraph = { kind: 'list-graph', headId: 'x0', nodes: [
      { id: 'x0', value: 1, nextId: 'x1' }, { id: 'x1', value: 1, nextId: null },
    ] };
    expect(judgeRuntimeOutput('21', input, alternate).passed).toBe(true);
    expect(judgeRuntimeOutput('21', input, cycle).passed).toBe(false);
    expect(judgeRuntimeOutput('21', input, clones).passed).toBe(false);
  });

  it('retains order-independent 206 graph records and catches compact-tree/window counterexamples', () => {
    expect(judgeListGraph({ head: [5, 5] }, { kind: 'list-graph', headId: 'h1', nodes: [
      { id: 'h1', value: 5, nextId: 'h0' }, { id: 'h0', value: 5, nextId: null },
    ] })).toBeNull();
    expect(expectedOutput('104', { root: [1, null, 2, 3] })).toEqual({ kind: 'int', value: 3 });
    expect(judgeRuntimeOutput('3', { s: 'pwwkew' }, { kind: 'int', value: 4 }).passed).toBe(false);
    expect(judgeRuntimeOutput('3', { s: 'abba' }, { kind: 'int', value: 3 }).passed).toBe(false);
  });
});

const app = await buildApp({ runner: new JavaRunner({ dockerExecutable: 'must-not-be-called-for-unregistered-http-problem' }) });
let token = '';
beforeAll(async () => {
  const response = await app.inject({ method: 'GET', url: '/api/session', headers: { host: '127.0.0.1:3001' } });
  token = response.json<{ token: string }>().token;
});
afterAll(async () => { await app.close(); });

describe('HTTP request gate', () => {
  it('rejects unregistered IDs before attempting Docker', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/runs',
      headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:5173', 'x-java-algo-session': token },
      payload: { problemId: '999', lessonVersion: '999-v1', mode: 'run', source: 'class Solution {}', input: {} },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 'INVALID_INPUT', reason: 'INVALID_REQUEST' });
  });
});
