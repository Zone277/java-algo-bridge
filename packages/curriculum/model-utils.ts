import { ReferenceTraceSchema, stableJson, type Output, type ProblemId, type ProblemInput, type ReferenceTrace } from '@jab/contracts';

export async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export async function finalizeTrace(args: {
  problemId: ProblemId;
  algorithmVersion: string;
  referenceSource: string;
  inputId: string;
  input: ProblemInput;
  initialState: ReferenceTrace['initialState'];
  snapshots: ReferenceTrace['snapshots'];
  finalOutput: Output;
}): Promise<ReferenceTrace> {
  if (!args.inputId.trim()) throw new Error('演示输入标识不能为空');
  const [inputHash, referenceSourceHash] = await Promise.all([sha256(stableJson(args.input)), sha256(args.referenceSource)]);
  const trace = ReferenceTraceSchema.parse({
    schemaVersion: 1, mode: 'reference-model', problemId: args.problemId, algorithmVersion: args.algorithmVersion,
    referenceSourceHash, inputId: args.inputId, inputHash, initialState: args.initialState,
    snapshots: args.snapshots.map(snapshot => snapshot.checkpointId ? { ...snapshot, checkpointId: `${args.algorithmVersion}:${inputHash}:${snapshot.snapshotId}:${snapshot.checkpointId}` } : snapshot),
    finalOutput: args.finalOutput,
  });
  return deepFreeze(trace);
}

export function codeRange(stepMap: readonly { stepId: string; startLine: number; endLine: number }[], stepId: string) {
  const range = stepMap.find(item => item.stepId === stepId);
  if (!range) throw new Error(`参考代码缺少步骤映射：${stepId}`);
  return { startLine: range.startLine, endLine: range.endLine };
}
