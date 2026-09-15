import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { ReferenceTraceSchema, RunResultSchema } from '../../packages/contracts/src/index.js';
import { hash, inputHash } from '../../apps/api/src/runner.js';

it('hash preserves Unicode and source newline bytes; input hash canonicalizes keys', () => {
  expect(hash('汉\r\n')).toBe(createHash('sha256').update('汉\r\n', 'utf8').digest('hex'));
  expect(hash('x\r\n')).not.toBe(hash('x\n'));
  expect(inputHash({ target: 4, nums: [1, 4] })).toBe(inputHash({ nums: [1, 4], target: 4 }));
  expect(inputHash({ target: 1, nums: [1, 4] })).not.toBe(inputHash({ nums: [1, 4], target: 4 }));
});
it('reference trace cannot impersonate student execution or reuse snapshot IDs', () => {
  const state = { variables: [], structures: [], explanation: 'test contract only' };
  const snapshot = { snapshotId: 'one', stepId: 'compare', codeRange: { startLine: 1, endLine: 1 }, ...state };
  const trace = { schemaVersion: 1, mode: 'reference-model', problemId: '704', algorithmVersion: 'test-only', referenceSourceHash: 'a'.repeat(64), inputId: 'test', inputHash: 'b'.repeat(64), initialState: { snapshotId: 'initial', ...state }, snapshots: [snapshot], finalOutput: { kind: 'int', value: 1 } };
  expect(ReferenceTraceSchema.safeParse(trace).success).toBe(true);
  expect(RunResultSchema.safeParse(trace).success).toBe(false);
  expect(ReferenceTraceSchema.safeParse({ ...trace, mode: 'student-java' }).success).toBe(false);
  expect(ReferenceTraceSchema.safeParse({ ...trace, snapshots: [snapshot, snapshot] }).success).toBe(false);
});
